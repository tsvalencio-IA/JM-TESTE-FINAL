"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "motorista.html"), "utf8");
const js = fs.readFileSync(path.join(root, "js/motorista.js"), "utf8");
const css = fs.readFileSync(path.join(root, "css/final-ux.css"), "utf8");
const version = "jm-v32-7-4-motorista-assinatura-header";
[
  "driverRuntimeDetails", "driverRuntimeSummary", "driverRuntimeDot",
  "driverOpenSignatureBtn", "driverSignatureSection", "signatureStateBadge",
  "signatureCanvas", "toggleSignatureModeBtn", "clearSignatureBtn",
  "signatureCustomerName", "signatureCustomerDoc", "signatureAcceptedText",
  "signatureRefusalReason"
].forEach((id) => assert(html.includes('id="' + id + '"'), "motorista.html sem #" + id));
[
  "openSignatureCapture", "renderSignatureState", "signaturePad.resize",
  "Finalização e assinatura", "Assinar", "driverRuntimeSummary"
].forEach((token) => assert(js.includes(token), "motorista.js sem " + token));
[
  ".driver-topbar-main", ".driver-runtime-details", ".signature-capture-card",
  ".signature-state-badge", ".signature-shortcut-btn", ".signature-canvas-wrap"
].forEach((token) => assert(css.includes(token), "final-ux.css sem " + token));
assert(html.includes(version), "motorista.html com versão antiga");
assert(js.includes(version), "motorista.js com versão antiga");
assert(html.indexOf("driverSignatureSection") < html.indexOf("driverProofStatus"), "assinatura fora do fluxo de provas");
assert(js.includes("uploadToCloudinaryAsset(sigBlob"), "upload da assinatura foi removido");
assert(js.includes("customerSignature"), "persistência da assinatura foi removida");
assert(js.includes("phaseSignatures"), "assinaturas por fase foram removidas");
console.log("PASS motorista-signature-header.test.js");
