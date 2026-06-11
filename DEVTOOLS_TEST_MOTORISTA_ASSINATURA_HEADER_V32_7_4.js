(async () => {
  console.clear();
  const VERSION = "jm-v32-7-4-motorista-assinatura-header";
  const result = [];
  const test = (name, ok, detail = "") => {
    result.push({ teste: name, resultado: ok ? "OK" : "FALHOU", detalhe: String(detail || "") });
    console[ok ? "log" : "error"]((ok ? "✅ " : "❌ ") + name, detail);
  };

  test("Página motorista", /motorista\.html/i.test(location.pathname));
  test("JM.motorista carregado", !!(window.JM && JM.motorista));
  test("Cabeçalho novo", !!document.querySelector(".driver-topbar-main"));
  test("Status expansível", !!document.getElementById("driverRuntimeDetails"));
  test("Resumo do status", !!document.getElementById("driverRuntimeSummary"));
  test("Atalho da assinatura", !!document.getElementById("driverOpenSignatureBtn"));
  test("Seção da assinatura", !!document.getElementById("driverSignatureSection"));
  test("Canvas da assinatura", !!document.getElementById("signatureCanvas"));
  test("Botão ativar assinatura", !!document.getElementById("toggleSignatureModeBtn"));
  test("Botão limpar assinatura", !!document.getElementById("clearSignatureBtn"));
  test("Justificativa sem assinatura", !!document.getElementById("signatureRefusalReason"));
  test("Função abrir assinatura", typeof JM?.motorista?.openSignatureCapture === "function");

  const header = document.querySelector("#driverAppView .driver-topbar");
  if (header) {
    const overflow = header.scrollWidth > header.clientWidth + 2;
    test("Cabeçalho sem estouro horizontal", !overflow, `scrollWidth=${header.scrollWidth}, clientWidth=${header.clientWidth}`);
  }

  const callSelected = !!JM?.motorista?.state?.selectedCallId;
  if (callSelected && typeof JM.motorista.openSignatureCapture === "function") {
    JM.motorista.openSignatureCapture();
    await new Promise(resolve => setTimeout(resolve, 250));
    const canvas = document.getElementById("signatureCanvas");
    const rect = canvas.getBoundingClientRect();
    test("Etapa assinatura aberta", rect.width > 0 && rect.height > 0, `${Math.round(rect.width)}x${Math.round(rect.height)}`);
    test("Canvas interno dimensionado", canvas.width >= 320 && canvas.height >= 180, `${canvas.width}x${canvas.height}`);
  } else {
    console.warn("⚠️ Selecione um atendimento para testar a abertura automática da assinatura.");
  }

  try {
    const response = await fetch("version.json?dev=" + Date.now(), { cache: "no-store" });
    const version = await response.json();
    test("Versão correta", version.version === VERSION, version.version);
  } catch (error) {
    test("Version.json", false, error.message);
  }

  console.table(result);
  return result;
})();
