const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js/motorista.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'motorista.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const version = 'jm-v32-7-3-login-sem-travamento';

[
  'STATUS_FLOW', 'renderStatusGuide', 'refreshQuickStatusOptions',
  'requestStatusConfirmation', 'forwardJump', 'proofWizardStep',
  'setupProofWizardLayout', 'renderProofWizard', 'saveProofDraft',
  'collectProofChecklist', 'validateCurrentProofStep',
  'proofUploadState', 'renderProofUploadQueue', 'onProgress',
  'getMediaDuration'
].forEach((token) => assert(js.includes(token), 'motorista.js sem ' + token));
[
  'driverStatusGuide', 'driverStatusConfirmDialog', 'driverProofWizard',
  'proofWizardTabs', 'proofUploadQueue', 'proofSavedEvidenceSummary',
  'driverSaveProofDraftBtn', 'driverSubmitProofBtn'
].forEach((id) => assert(html.includes('id="' + id + '"'), 'motorista.html sem #' + id));
[
  '.driver-status-guide', '.proof-wizard', '.proof-wizard-tab',
  '.proof-upload-card', '.proof-wizard-actions'
].forEach((token) => assert(css.includes(token), 'style.css sem ' + token));
assert(html.includes(version), 'motorista.html com versão antiga');
assert(js.includes(version), 'motorista.js com versão antiga');
assert(rules.includes("'proofChecklist'"), 'rules não preservam proofChecklist');
assert(rules.includes("'proofAudios'"), 'rules não preservam proofAudios');
assert(!js.includes('Avance uma etapa por vez') || js.includes('targetIndex > normalizedCurrentIndex + 1'), 'salto de status sem proteção');
console.log('PASS phase2-motorista.test.js');
