"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const motoristaJs = fs.readFileSync(path.join(root, "js/motorista.js"), "utf8");
const motoristaHtml = fs.readFileSync(path.join(root, "motorista.html"), "utf8");
const requiredIds = [
  "driverProofMissingBox",
  "proofPickupResponsibleName",
  "proofPickupResponsibleDoc",
  "proofFuelLevel",
  "proofOdometer",
  "proofTireCondition",
  "proofKeyDocument",
  "proofVehicleLoaded",
  "proofEasyRemoval",
  "proofDeliveryResponsibleName",
  "proofDeliveryResponsibleDoc",
  "proofPhotoLoadAfter",
  "proofPhotoDeliveryFront",
  "proofPhotoDeliveryRear",
  "proofPhotoDeliveryRight",
  "proofPhotoDeliveryLeft",
  "proofPhotoDeliveryDashboard",
  "proofPhotoFinal",
  "driverSignatureSection"
];
for (const id of requiredIds) assert.ok(motoristaHtml.includes(`id="${id}"`), `motorista.html sem ${id}`);
assert.ok(motoristaJs.includes("function validateCompleteProofPackage(call, checklist)"), "fonte única de validação ausente");
assert.ok(motoristaJs.includes("const validation = validateCompleteProofPackage(call, call.proofChecklist || {})"), "proofStepCompleted não usa a fonte única");
assert.ok(motoristaJs.includes("const validation = validateCompleteProofPackage(call, call.proofChecklist || {})") && motoristaJs.includes("if (validation.ok) return \"completo\""), "proofStatusFor não usa a fonte única");
assert.ok(motoristaJs.includes("const validation = validateCompleteProofPackage(validationCall, checklist)"), "finalização não valida pendências completas");
assert.ok(!motoristaJs.includes("call.proofStatus || proofStatusFor(call)"), "a tela ainda confia primeiro em proofStatus antigo");
assert.ok(!motoristaJs.includes("missingPhotos === 0 && hasCompleteChecklist(call) && hasOperationalPhaseAcceptances(call)"), "proofStatus ainda usa regra paralela antiga");
assert.ok(motoristaJs.includes("Faltam ${items.length} item(ns)"), "contador completo de pendências ausente");
assert.ok(!motoristaJs.includes("proofMissingItems(call).slice(0, 8)"), "pendências ainda limitadas a 8");
assert.ok(motoristaJs.includes("el.classList.remove(\"is-collapsed\")"), "painel minimizado não é reaberto");
assert.ok(motoristaJs.includes("collapseLegacyReport"), "relatório complementar não é recolhido do fluxo principal");
assert.ok(motoristaJs.includes("settings/integrations antes do fallback"), "compatibilidade publicIntegrations/integrations ausente");
console.log("PASS motorista-pendencias-v32-7-7.test.js");
