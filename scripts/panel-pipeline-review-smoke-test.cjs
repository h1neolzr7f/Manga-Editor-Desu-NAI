const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../js/ai/panel-pipeline-review.js'), 'utf8');
function load({ checked = true, panels = [], snapshots = [] } = {}) {
  const toasts = [];
  const context = vm.createContext({
    document: { addEventListener() {} },
    $: () => checked === null ? null : { checked },
    getPanelObjectList: () => panels,
    updateLayerPanel() {},
    createToast: (...args) => toasts.push(args),
    btmGetGuids: () => ['page-1'],
    btmProjectsMap: new Map([['page-1', { panelSnapshots: snapshots }]])
  });
  vm.runInContext(source, context);
  return { context, toasts };
}

test('generation honors manual review and replaces prior approval', () => {
  const { context } = load();
  const panel = { naiPipelineStatus: 'MANUAL_OK' };
  context.onPanelGenerationSuccess(panel, 'I2I');
  assert.equal(panel.naiPipelineStatus, 'MANUAL_REVIEW');
  assert.match(panel.naiPipelineStatusDetail, /I2I/);
});

test('generation with review disabled is only generated, never approved', () => {
  const { context } = load({ checked: false });
  const panel = {};
  context.onPanelGenerationSuccess(panel, 'T2I');
  assert.equal(panel.naiPipelineStatus, 'GEN_OK');
});

test('missing review checkbox keeps manual review enabled', () => {
  const { context } = load({ checked: null });
  const panel = {};
  context.onPanelGenerationSuccess(panel);
  assert.equal(panel.naiPipelineStatus, 'MANUAL_REVIEW');
});

test('batch completion never approves generated panels or overwrites review states', async () => {
  const statuses = ['GEN_OK', 'MANUAL_REVIEW', 'AUTO_FLAGGED', 'MANUAL_OK', 'GEN_FAIL'];
  const panels = statuses.map(naiPipelineStatus => ({ naiPipelineStatus }));
  const { context, toasts } = load({ panels });
  await context.finishBatchGenerationReview();
  assert.deepEqual(panels.map(panel => panel.naiPipelineStatus), statuses);
  assert.match(toasts[0][1], /1 格生图完成/);
  assert.match(toasts[0][1], /2 格.*人工/);
  assert.doesNotMatch(toasts[0][1], /自动审查通过|成品/);
});

// summarizeProjectPipelineReview() had no caller in the app and was removed in 422800b (dead code); its summary test is dropped.

test('review navigation includes flagged panels and wraps around', () => {
  const panels = ['AUTO_FLAGGED', 'MANUAL_OK', 'MANUAL_REVIEW']
    .map(naiPipelineStatus => ({ naiPipelineStatus }));
  const { context } = load({ panels });
  assert.equal(context.findNextManualReviewPanel(null), panels[0]);
  assert.equal(context.findNextManualReviewPanel(panels[0]), panels[2]);
  assert.equal(context.findNextManualReviewPanel(panels[2]), panels[0]);
});

test('legacy automatic approval is shown and counted as unreviewed generation', async () => {
  const panel = { naiPipelineStatus: 'AUTO_OK' };
  const { context, toasts } = load({ panels: [panel], snapshots: [{ status: 'AUTO_OK' }] });
  assert.match(context.getPanelPipelineStatusLabel(panel), /未审阅/);
  await context.finishBatchGenerationReview();
  assert.match(toasts[0][1], /1 格生图完成，尚未审阅/);
});

test('legacy approval helper cannot claim visual inspection', () => {
  const { context } = load();
  const panel = {};
  context.markPanelAutoOk(panel);
  assert.equal(panel.naiPipelineStatus, 'GEN_OK');
  assert.match(panel.naiPipelineStatusDetail, /尚未审阅/);
});
