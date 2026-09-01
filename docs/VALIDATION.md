# Validation record

Validated on 2026-09-01 from commit `9ac6c10c8311167077372e8923d4bc5d55221ed8` on Windows.

## Commands and results

```powershell
npm test
npm run test:simulator
npm run test:story-engine
npm run test:cutout
npm run test:proxy-guards
```

Result: all five commands passed.

The screenshot `docs/screenshots/editor-home.png` was captured after serving the current source locally and selecting the built-in blank page template. It contains no private project or access token.

## Scope

This run did not call NovelAI, did not generate an image, and did not contact an OpenAI-compatible director gateway. Paid or credentialed integration behavior therefore remains outside this record. The repository's Windows packaging workflow performs additional installer and installed-runtime checks in GitHub Actions.
