(async function () {
  "use strict";
  console.log("🧪 JM FASE 1 — MOTORISTA CAMPO SEGURO");

  const result = [];
  const push = (name, ok, detail) => {
    result.push({ teste: name, resultado: ok ? "OK" : "FALHOU", detalhe: detail || "" });
    (ok ? console.log : console.error)((ok ? "✅ " : "❌ ") + name, detail || "");
  };

  push("Firebase carregado", !!window.firebase, "");
  push("Módulo motorista carregado", !!(window.JM && window.JM.motorista), "");
  push("Painel Atendimento atual", !!document.getElementById("driverPanelActive"), "");
  push("Painel GPS visível na estrutura", !!document.getElementById("driverPanelLocation") && !document.getElementById("driverPanelLocation").classList.contains("hidden"), "");
  push("Navegação mobile de campo", !!document.getElementById("driverFieldNav"), "");
  push("Estado de conexão", !!document.getElementById("driverNetworkStatus"), navigator.onLine ? "online" : "offline");

  const user = window.firebase && firebase.auth().currentUser;
  push("Motorista autenticado", !!user, user ? `${user.email} · ${user.uid}` : "Faça login em motorista.html");

  if (user && window.JM && window.JM.motorista) {
    const state = window.JM.motorista.state;
    const calls = Object.values(state.calls || {}).filter((call) => call && !call.deletedAt);
    push("Chamados carregados", calls.length > 0, `${calls.length} chamado(s)`);
    push(
      "Nenhum chamado selecionado silenciosamente",
      !state.selectedCallId || calls.some((call) => call.id === state.selectedCallId),
      state.selectedCallId ? `Seleção consciente/persistida: ${state.selectedCallId}` : "Nenhum atendimento atual"
    );

    try {
      const settings = await firebase.firestore().collection("settings").doc("integrations").get();
      const data = settings.exists ? settings.data() : {};
      const gps = data.mobileGps || (window.JM_CONFIG && window.JM_CONFIG.mobileGps) || {};
      push("Configuração GPS disponível", gps.enabled === true || gps.enabled === "true", JSON.stringify({ enabled: gps.enabled, backend: gps.backend, databaseURL: gps.databaseURL ? "configurada" : "vazia" }));
    } catch (error) {
      push("Leitura settings/integrations", false, error.message || String(error));
    }
  }

  console.table(result);
  console.log("📌 Teste visual obrigatório:");
  console.log("1. Sem selecionar chamado, confirme que GPS/provas/despesas ficam bloqueados.");
  console.log("2. Selecione conscientemente um chamado.");
  console.log("3. Confirme o cartão Atendimento atual e os módulos liberados.");
  console.log("4. Ative o GPS pelo botão da tela e autorize a localização.");
  console.log("5. No Firebase RTDB, confira mobileGps/drivers, mobileGps/calls e mobileGps/vehicles.");
})();
