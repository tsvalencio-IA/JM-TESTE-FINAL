(async () => {
  "use strict";
  console.log("🧪 JM V32.7 — TESTE FINAL DO GESTOR");
  const VERSION = "jm-v32-7-final-operacional-ux10";
  const result = {};
  const pass = (name, value, detail) => {
    result[name] = { ok: !!value, detail: detail || "" };
    console[value ? "log" : "error"](`${value ? "✅" : "❌"} ${name}`, detail || "");
  };

  pass("Firebase carregado", !!window.firebase);
  pass("Usuário autenticado", !!firebase.auth().currentUser, firebase.auth().currentUser && firebase.auth().currentUser.email);
  pass("Aplicação JM carregada", !!(window.JM && JM.app && JM.app.state));
  pass("Versão do app", String(document.documentElement.innerHTML).includes(VERSION), VERSION);
  pass("Central inteligente", !!document.getElementById("opsDispatchAdvisor"));
  pass("Formulário em etapas", !!document.getElementById("callWizardTitle"));
  pass("Revisão do Assistente IA", !!document.getElementById("aiValidationSummary"));
  pass("Financeiro unificado", document.querySelectorAll(".finance-unified-hub").length >= 2);
  pass("CSS final", !!document.querySelector('link[href*="final-ux.css"]'));

  try {
    const version = await fetch("version.json", { cache: "no-store" }).then((r) => r.json());
    pass("version.json", version.version === VERSION, version.version);
  } catch (error) {
    pass("version.json", false, error.message);
  }

  try {
    const publicSnap = await firebase.firestore().collection("settings").doc("publicIntegrations").get();
    const data = publicSnap.exists ? publicSnap.data() : null;
    pass("settings/publicIntegrations", !!data, data || "documento ausente");
    if (data) {
      pass("GPS público configurado", !!(data.mobileGps && data.mobileGps.databaseURL), data.mobileGps);
      pass("Cloudinary público configurado", !!(data.cloudinary && data.cloudinary.cloudName && data.cloudinary.uploadPreset), data.cloudinary);
      pass("Token RAFA não exposto no público", !JSON.stringify(data).toLowerCase().includes("token"));
    }
  } catch (error) {
    pass("settings/publicIntegrations", false, error.code || error.message);
  }

  const sample = `Item de Cobertura\n\nFinalizado\nSituação\n\nR$ 807,00\nValor Total\n\n80.06 km\nPercurso Total\n\n32.55 km\nDistância da Base\n\nMiller Vinicius da Silva\nTécnico\n\nOrdem de Serviço\nA26052668515/1\nCliente\nALFA SEGUROS\nSolicitante\nThiago\nBeneficiário\nGELO PEROLA RIO PRETO LTDA\nTelefone do Beneficiário\n(17) 99101-2151\nVeículo\n1016 /31 ACCELO 4X2 2P. DIES.\nPlaca\nFJW9092\nQuestionário\nO que aconteceu?\nComeçou a fazer barulho, desligou e não liga mais\nEndereço\nOrigem\nSP-320, ..., Tanabi\nEstr. Mun. Euclídes da Cunha, 451, Tanabi - SP, 15170-000\nDestino\nRua Thessalônico Barbosa, 400, Distrito Industrial, São José do Rio Preto\nEstr. Mun. Euclídes da Cunha, 451, Tanabi - SP, 15170-000\nPonto de referência: próximo ao recinto disposição\nTarifas\nKM COBERTURA\tMaxpar\tR$ 5,50\t34\tR$ 187,00\nSAIDA\tMaxpar\tR$ 500,00\t1\tR$ 500,00\nHORA TRABALHADA\tMaxpar\tR$ 120,00\t1\tR$ 120,00\nTotal\tR$ 807,00`;

  try {
    const parsed = JM.app.parseInsuranceText(sample);
    pass("Parser: valor R$ 807", Number(parsed.amount || parsed.totalValue) === 807, parsed);
    pass("Parser: origem Tanabi", /tanabi/i.test(String(parsed.origin || parsed.originAddress || "")));
    pass("Parser: destino Rio Preto", /rio preto/i.test(String(parsed.destination || parsed.destinationAddress || "")));
    pass("Parser: destino sem Tanabi", !/tanabi/i.test(String(parsed.destination || parsed.destinationAddress || "")));
    pass("Status externo separado", parsed.externalStatus === "Finalizado", parsed.externalStatus);
  } catch (error) {
    pass("Parser real", false, error.message);
  }

  const state = JM.app.state;
  console.table({
    chamados: Object.keys(state.calls || {}).length,
    veiculos: Object.keys(state.vehicles || {}).length,
    usuarios: Object.keys(state.users || {}).length,
    despesas: Object.keys(state.expenses || {}).length,
    transacoes: Object.keys(state.transactions || {}).length
  });

  const failures = Object.entries(result).filter(([, row]) => !row.ok);
  console.log(failures.length ? `⚠️ ${failures.length} item(ns) precisam de atenção.` : "✅ TESTE FINAL DO GESTOR CONCLUÍDO SEM FALHAS LOCAIS.");
  window.JM_FINAL_GESTOR_RESULT = result;
})();
