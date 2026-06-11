(async () => {
  "use strict";
  console.log("🧪 JM V32.7 — TESTE FINAL DO MOTORISTA");
  const VERSION = "jm-v32-7-final-operacional-ux10";
  const result = {};
  const pass = (name, value, detail) => {
    result[name] = { ok: !!value, detail: detail || "" };
    console[value ? "log" : "error"](`${value ? "✅" : "❌"} ${name}`, detail || "");
  };

  pass("Firebase carregado", !!window.firebase);
  const user = firebase.auth().currentUser;
  pass("Motorista autenticado", !!user, user && `${user.email} / ${user.uid}`);
  pass("Módulo motorista carregado", !!(window.JM && JM.motorista && JM.motorista.state));
  pass("Versão final", document.documentElement.innerHTML.includes(VERSION), VERSION);
  pass("Painel GPS presente", !!document.getElementById("driverPanelLocation"));
  pass("Botão ativar GPS", !!document.getElementById("driverStartLocationBtn"));
  pass("Botão parar GPS", !!document.getElementById("driverStopLocationBtn"));
  pass("Atendimento atual", !!document.getElementById("driverActiveCallBox"));
  pass("Checklist guiado", !!document.getElementById("driverProofWizard"));
  pass("Prancha técnica", !!document.getElementById("damageDiagram"));
  pass("Despesa rápida", !!document.getElementById("driverExpenseQuickTypes"));
  pass("Histórico de despesas", !!document.getElementById("driverExpenseHistory"));

  try {
    const snap = await firebase.firestore().collection("settings").doc("publicIntegrations").get();
    const data = snap.exists ? snap.data() : null;
    pass("Configuração pública acessível", !!data, data || "ausente");
    if (data) {
      pass("RTDB URL disponível", !!(data.mobileGps && data.mobileGps.databaseURL), data.mobileGps);
      pass("Cloudinary disponível", !!(data.cloudinary && data.cloudinary.cloudName && data.cloudinary.uploadPreset), data.cloudinary);
      pass("Sem token privado", !JSON.stringify(data).toLowerCase().includes("token"));
    }
  } catch (error) {
    pass("Configuração pública acessível", false, error.code || error.message);
  }

  if (user) {
    try {
      const calls = await firebase.firestore().collection("calls").where("driverId", "==", user.uid).limit(20).get();
      pass("Consulta de chamados do motorista", true, `${calls.size} chamado(s)`);
      console.table(calls.docs.map((doc) => ({ id: doc.id, status: doc.data().statusKey || doc.data().status, protocolo: doc.data().protocolo || "" })));
    } catch (error) {
      pass("Consulta de chamados do motorista", false, error.code || error.message);
    }
  }

  try {
    const permission = navigator.permissions && await navigator.permissions.query({ name: "geolocation" });
    pass("Permissão de geolocalização consultável", !!permission, permission && permission.state);
  } catch (error) {
    console.warn("⚠️ O navegador não permite consultar previamente a permissão de localização.", error.message);
  }

  const failures = Object.entries(result).filter(([, row]) => !row.ok);
  console.log(failures.length ? `⚠️ ${failures.length} item(ns) precisam de atenção.` : "✅ TESTE FINAL DO MOTORISTA CONCLUÍDO SEM FALHAS LOCAIS.");
  window.JM_FINAL_MOTORISTA_RESULT = result;
})();
