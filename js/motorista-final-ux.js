(function () {
  "use strict";

  const VERSION = "jm-v32-7-7-motorista-provas-fonte-unica";
  const motor = window.JM && window.JM.motorista;
  const utils = window.JM && window.JM.utils || {};
  if (!motor || !motor.state) return;
  const state = motor.state;
  const $ = (id) => document.getElementById(id);
  const esc = utils.esc || ((value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])));
  const money = utils.money || ((value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const statusLabel = utils.statusLabel || ((value) => value || "-");
  const DRAFT_KEY = "jm.driver.expense.draft.v32.7";

  function activeCall() {
    return state.selectedCallId && state.calls && state.calls[state.selectedCallId] || null;
  }

  function expenseReview() {
    const box = $("driverExpenseReview");
    if (!box) return;
    const call = activeCall();
    const type = $("driverExpenseType") && $("driverExpenseType").value || "";
    const amountRaw = $("driverExpenseAmount") && $("driverExpenseAmount").value || "";
    const amount = typeof utils.parseMoney === "function" ? utils.parseMoney(amountRaw) : Number(String(amountRaw).replace(/\./g, "").replace(",", ".")) || 0;
    const vehicle = call && state.vehicles && state.vehicles[call.vehicleId] || null;
    const signature = JSON.stringify({ callId: call && call.id || "", type, amount, vehicleId: call && call.vehicleId || "" });
    if (box.dataset.signature === signature) return;
    box.dataset.signature = signature;
    box.innerHTML = call ? `
      <div><span>Chamado</span><b>${esc(call.protocolo || call.id)}</b></div>
      <div><span>Veículo</span><b>${esc(vehicle && (vehicle.placa || vehicle.id) || call.vehicleId || "Não vinculado")}</b></div>
      <div><span>Categoria</span><b>${esc(type || "-")}</b></div>
      <div><span>Valor</span><b>${money(amount)}</b></div>` : "Selecione o atendimento atual para liberar a despesa.";
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        callId: state.selectedCallId || "",
        type: $("driverExpenseType") && $("driverExpenseType").value || "",
        amount: $("driverExpenseAmount") && $("driverExpenseAmount").value || "",
        notes: $("driverExpenseNotes") && $("driverExpenseNotes").value || "",
        savedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }

  function restoreDraft() {
    let draft;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (_) { draft = null; }
    if (!draft) return;
    if (draft.callId && state.selectedCallId && draft.callId !== state.selectedCallId) return;
    if ($("driverExpenseType") && draft.type) $("driverExpenseType").value = draft.type;
    if ($("driverExpenseAmount") && !$("driverExpenseAmount").value) $("driverExpenseAmount").value = draft.amount || "";
    if ($("driverExpenseNotes") && !$("driverExpenseNotes").value) $("driverExpenseNotes").value = draft.notes || "";
    expenseReview();
  }

  function renderExpenseHistory() {
    const host = $("driverExpenseHistory");
    if (!host) return;
    const rows = Object.values(state.expenses || {}).filter((row) => row && !row.deletedAt).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)).slice(0, 8);
    const signature = JSON.stringify(rows.map((row) => [row.id, row.type, row.amount, row.status, row.createdAt]));
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    host.innerHTML = rows.length ? `<div class="driver-expense-history-head"><b>Despesas recentes</b><span>${rows.length} registro(s)</span></div>${rows.map((row) => `
      <article class="driver-expense-item">
        <div><b>${esc(row.type || "Despesa")}</b><span>${esc(row.protocol || row.callId || "Sem chamado")}</span></div>
        <div><b>${money(row.amount || 0)}</b><span class="badge ${String(row.status).toLowerCase() === "aprovado" ? "ok" : String(row.status).toLowerCase() === "reprovado" ? "danger" : "warn"}">${esc(row.status || "pendente")}</span></div>
      </article>`).join("")}` : `<p class="muted small">Nenhuma despesa lançada por este motorista.</p>`;
  }

  function setupExpenseFlow() {
    const form = $("driverExpenseForm");
    if (!form || form.dataset.finalUx === "true") return;
    form.dataset.finalUx = "true";
    const originalSubmit = form.onsubmit;
    const submit = $("driverExpenseSubmitBtn") || form.querySelector("button[type='submit']");

    document.querySelectorAll("[data-expense-type]").forEach((button) => {
      button.addEventListener("click", () => {
        if ($("driverExpenseType")) $("driverExpenseType").value = button.dataset.expenseType;
        document.querySelectorAll("[data-expense-type]").forEach((item) => item.classList.toggle("active", item === button));
        expenseReview();
        saveDraft();
        $("driverExpenseAmount") && $("driverExpenseAmount").focus();
      });
    });
    ["driverExpenseType", "driverExpenseAmount", "driverExpenseNotes"].forEach((id) => {
      const field = $(id);
      if (!field) return;
      field.addEventListener("input", () => { expenseReview(); saveDraft(); });
      field.addEventListener("change", () => { expenseReview(); saveDraft(); });
    });

    form.onsubmit = async function (event) {
      event.preventDefault();
      const call = activeCall();
      if (!call) return utils.toast && utils.toast("Selecione o atendimento atual antes de lançar a despesa.", "danger");
      const amount = typeof utils.parseMoney === "function" ? utils.parseMoney($("driverExpenseAmount").value) : 0;
      if (!(amount > 0)) return utils.toast && utils.toast("Informe um valor maior que zero.", "danger");
      const summary = `${$("driverExpenseType").value} — ${money(amount)}\nChamado: ${call.protocolo || call.id}\nVeículo: ${call.vehicleId || "não vinculado"}`;
      if (!confirm("Confirmar despesa?\n\n" + summary)) return;
      if (!navigator.onLine && $("driverExpensePhoto") && $("driverExpensePhoto").files.length) {
        saveDraft();
        return utils.toast && utils.toast("Sem internet para enviar o comprovante. O texto ficou salvo como rascunho; tente novamente quando a conexão voltar.", "warn");
      }
      if (submit) { submit.disabled = true; submit.textContent = "Enviando..."; }
      try {
        if (typeof originalSubmit === "function") await originalSubmit.call(form, event);
        localStorage.removeItem(DRAFT_KEY);
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = "Enviar despesa"; }
        setTimeout(() => { expenseReview(); renderExpenseHistory(); }, 250);
      }
    };
    restoreDraft();
    expenseReview();
    renderExpenseHistory();
  }

  function setupDamageLegend() {
    const diagram = $("damageDiagram");
    if (!diagram || $("damageTechnicalLegend")) return;
    const legend = document.createElement("div");
    legend.id = "damageTechnicalLegend";
    legend.className = "damage-technical-legend";
    legend.innerHTML = `<b>Legenda técnica</b><span>Risco</span><span>Amassado</span><span>Quebrado</span><span>Item ausente</span><span>Pneu/roda</span><span>Vidro</span><small>Toque na região, escolha tipo, gravidade e vincule a foto correspondente.</small>`;
    diagram.insertAdjacentElement("afterend", legend);
  }

  function setupOfflineNotice() {
    const appView = $("driverAppView");
    if (!appView || $("driverOfflineQueueNotice")) return;
    const notice = document.createElement("div");
    notice.id = "driverOfflineQueueNotice";
    notice.className = "driver-offline-notice hidden";
    notice.innerHTML = `<b>Sem internet</b><span>Formulários simples ficam no cache do Firebase. Fotos e áudios precisam de conexão; não feche a página antes de enviá-los.</span>`;
    appView.insertBefore(notice, appView.firstChild);
    const render = () => notice.classList.toggle("hidden", navigator.onLine !== false);
    window.addEventListener("online", render);
    window.addEventListener("offline", render);
    render();
  }

  function setupUpdateBanner() {
    if (!("serviceWorker" in navigator) || $("jmDriverUpdateBanner")) return;
    const banner = document.createElement("div");
    banner.id = "jmDriverUpdateBanner";
    banner.className = "jm-update-banner hidden";
    banner.innerHTML = `<div><b>Atualização disponível</b><span>Atualize quando estiver parado, sem upload em andamento.</span></div><button class="btn primary" type="button">Atualizar</button>`;
    document.body.appendChild(banner);
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      const show = () => banner.classList.remove("hidden");
      if (registration.waiting) show();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker && worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) show();
        });
      });
      banner.querySelector("button").onclick = () => location.reload();
    }).catch(() => {});
  }

  function bootstrap() {
    setupExpenseFlow();
    setupDamageLegend();
    setupOfflineNotice();
    setupUpdateBanner();
    // Estabilização V32.7.5: não observar o document.body inteiro.
    // O observer global anterior podia criar ciclos de renderização e travar clique/campo no celular.
    const safeRefresh = () => {
      renderExpenseHistory();
      expenseReview();
      setupDamageLegend();
    };
    ["driverProofCall", "driverExpenseCall", "driverExpenseType", "driverExpenseAmount", "driverExpenseNotes"].forEach((id) => {
      const el = $(id);
      if (!el || el.dataset.finalUxSafeRefresh === "true") return;
      el.dataset.finalUxSafeRefresh = "true";
      el.addEventListener("change", safeRefresh);
      el.addEventListener("input", safeRefresh);
    });
    window.addEventListener("jm:driver-state-updated", safeRefresh);
    window.addEventListener("online", safeRefresh);
    window.setTimeout(safeRefresh, 350);
    window.setTimeout(safeRefresh, 1200);
    console.info("JM motorista UX final", VERSION, "safe-refresh");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();
})();
