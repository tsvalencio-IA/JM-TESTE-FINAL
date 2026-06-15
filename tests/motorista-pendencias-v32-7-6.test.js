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
  "driverSignatureSection"
];
for (const id of requiredIds) assert.ok(motoristaHtml.includes(`id="${id}"`), `motorista.html sem ${id}`);
assert.ok(motoristaJs.includes("proofMissingItems(call, checklist)"), "função proofMissingItems ausente");
assert.ok(motoristaJs.includes("Faltam ${items.length} item(ns)"), "contador completo de pendências ausente");
assert.ok(!motoristaJs.includes("proofMissingItems(call).slice(0, 8)"), "pendências ainda limitadas a 8");
assert.ok(motoristaJs.includes("el.classList.remove(\"is-collapsed\")"), "painel minimizado não é reaberto");
assert.ok(motoristaJs.includes("basicInspectionOk") && motoristaJs.includes("basicPhotosOk"), "inspeção ainda pode ter falso positivo");
assert.ok(motoristaJs.includes("settings/integrations antes do fallback"), "compatibilidade publicIntegrations/integrations ausente");
console.log("PASS motorista-pendencias-v32-7-6.test.js");
