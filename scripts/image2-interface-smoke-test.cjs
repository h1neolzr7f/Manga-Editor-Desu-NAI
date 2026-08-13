const fs = require('fs');
const vm = require('vm');
function load(file, context) { vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }
const context = { console, Date, Math, JSON, Object, Array, Promise, Set, Map, localStorage: { data: new Map(), getItem(k) { return this.data.get(k) || null; }, setItem(k, v) { this.data.set(k, v); } } };
context.globalThis = context;
load('js/assets/image2-job-store.js', context);
load('js/assets/image2-client.js', context);
const jobs = context.NaiImage2JobStoreDefault;
const client = new context.NaiImage2Client({ jobs });
client.submit({ prompt: 'smoke', providerId: '' }).catch(() => {}).then(() => {
  const job = jobs.list()[0];
  if (!job || job.status !== 'failed' || !job.error) throw new Error('Image2 failure state failed');
  const generated = context.NaiImage2ProviderRegistry.register({ id: 'mock', name: 'Mock', generate: async () => ({ image: 'data:image/png;base64,AA==', thumbnail: 'data:image/png;base64,AA==' }) });
  if (!generated || context.NaiImage2ProviderRegistry.list().length !== 1) throw new Error('Image2 provider registry failed');
  return client.submit({ prompt: 'smoke', providerId: 'mock', assetName: 'smoke', tags: ['original'] });
}).then((result) => {
  if (!result.job || result.job.status !== 'succeeded') throw new Error('Image2 success state failed');
  console.log('image2 interface smoke test passed');
});
