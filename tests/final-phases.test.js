"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const version = "jm-v32-7-4-motorista-assinatura-header";

const jm = read("jm.html");
const motorista = read("motorista.html");
const superadmin = read("superadmin.html");
const app = read("js/app.js");
const driver = read("js/motorista.js");
const finalUx = read("js/final-ux.js");
const driverUx = read("js/motorista-final-ux.js");
const publicConfig = read("js/superadmin-public-config.js");
const css = read("css/final-ux.css");
const rules = read("firestore.rules");
const sw = read("service-worker.js");

// Version/cache coherence.
[jm, motorista, superadmin, app, driver, finalUx, driverUx, sw].forEach((text) => assert.ok(text.includes(version)));
assert.ok(jm.includes("js/final-ux.js"));
assert.ok(motorista.includes("js/motorista-final-ux.js"));
assert.ok(superadmin.includes("js/superadmin-public-config.js"));
assert.ok(jm.includes("css/final-ux.css"));
assert.ok(motorista.includes("css/final-ux.css"));

// Fase 7: technical damage board with structured metadata.
assert.ok(driver.includes("const DAMAGE_TYPES"));
assert.ok(driver.includes("const DAMAGE_SEVERITIES"));
assert.ok(driver.includes("photoType"));
assert.ok(driver.includes("schemaVersion: 2"));
assert.ok(css.includes("damage-technical-legend"));

// Fase 8: quick expense, confirmation, draft and history.
assert.ok(motorista.includes("driverExpenseQuickTypes"));
assert.ok(motorista.includes("driverExpenseHistory"));
assert.ok(driverUx.includes("Confirmar despesa"));
assert.ok(driverUx.includes("JM.driver.expense.draft".toLowerCase()) || driverUx.includes("jm.driver.expense.draft"));
assert.ok(driverUx.includes("renderExpenseHistory"));

// Fase 9: central with vehicle ranking and dispatch.
assert.ok(finalUx.includes("opsDispatchAdvisor"));
assert.ok(finalUx.includes("dispatch-ranking"));
assert.ok(finalUx.includes("assignSelectedVehicleToSelectedCall"));
assert.ok(finalUx.includes("haversineKm"));

// Fase 10: call wizard + autosave.
assert.ok(finalUx.includes("call-wizard-step"));
assert.ok(finalUx.includes("saveCallDraft"));
assert.ok(finalUx.includes("restoreCallDraft"));

// Fase 11/12/13 retained and integrated.
assert.ok(finalUx.includes("aiValidationSummary"));
assert.ok(app.includes("calculateRoutePricing"));
assert.ok(app.includes("findTollsAlongRoute"));
assert.ok(app.includes("preserveManualPrice"));

// Fase 14: unified finance + CSV.
assert.ok(finalUx.includes("finance-unified-hub"));
assert.ok(finalUx.includes("csvDownload"));
assert.ok(app.includes("upsertTransactionFromExpense"));
assert.ok(app.includes("upsertCallReceivable"));

// Fase 15/16: mobile cards and deterministic collapsing.
assert.ok(css.includes("responsive-card-table"));
assert.ok(css.includes("panel.is-collapsed>.panel-collapse-body"));
assert.ok(finalUx.includes("decorateAllTables"));

// Fase 17: PWA update and new assets.
["./css/final-ux.css", "./js/final-ux.js", "./js/motorista-final-ux.js", "./js/superadmin-public-config.js", "./version.json"].forEach((asset) => assert.ok(sw.includes(asset), asset));
assert.ok(sw.includes("SKIP_WAITING"));

// Fase 18: public integrations mirror, no private token read by driver.
assert.ok(publicConfig.includes('doc("publicIntegrations")'));
assert.ok(finalUx.includes("sanitizedPublicIntegrations"));
assert.ok(driver.includes('doc("publicIntegrations")'));
assert.ok(!driver.includes('doc("integrations").onSnapshot'));
assert.ok(rules.includes("id == 'integrations' && (isOffice() || isManager())"));
assert.ok(rules.includes("id in ['public', 'publicIntegrations'] && signedIn()"));

// Local referenced assets from service worker exist.
const assetRegex = /"\.\/(.*?)"/g;
let match;
while ((match = assetRegex.exec(sw))) {
  const rel = match[1];
  if (!rel || rel === "") continue;
  assert.ok(fs.existsSync(path.join(root, rel)), `Missing SW asset: ${rel}`);
}

// Basic duplicate ID check for key pages.
function duplicateIds(html, page) {
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepStrictEqual([...new Set(duplicates)], [], `${page} duplicate IDs`);
}
duplicateIds(jm, "jm.html");
duplicateIds(motorista, "motorista.html");
duplicateIds(superadmin, "superadmin.html");

console.log("PASS final-phases.test.js");
