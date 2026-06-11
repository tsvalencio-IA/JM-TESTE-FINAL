(function () {
  "use strict";

  const VERSION = "jm-v32-7-3-login-sem-travamento";
  const utils = window.JM && window.JM.utils || {};
  const app = window.JM && window.JM.app;
  if (!app || !app.state) return;
  const state = app.state;
  const $ = (id) => document.getElementById(id);
  const esc = utils.esc || ((value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])));
  const money = utils.money || ((value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const pointFrom = utils.pointFrom || ((value) => value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)) ? { lat: Number(value.lat), lng: Number(value.lng) } : null);
  const haversineKm = utils.haversineKm || (() => 0);

  function visibleRows(source) {
    return Object.values(source || {}).filter((row) => row && !row.deletedAt);
  }

  function dateValue(value) {
    if (!value) return 0;
    if (typeof value.toDate === "function") return value.toDate().getTime();
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function notify(message, type) {
    if (typeof utils.toast === "function") utils.toast(message, type || "info");
    else console.log(message);
  }

  function showView(name) {
    const button = document.querySelector(`[data-view="${name}"]`);
    if (button) button.click();
  }

  // ---------------------------------------------------------------------------
  // FASE 9 — Central Operacional como centro de despacho
  // ---------------------------------------------------------------------------
  function callOriginPoint(call) {
    return pointFrom(call && (
      call.originAddress || call.origem || call.origin ||
      call.originPoint || call.pickupPoint ||
      (call.originLat != null ? { lat: call.originLat, lng: call.originLng } : null)
    ));
  }

  function vehiclePoint(vehicle) {
    return pointFrom(vehicle && (
      vehicle.mobileLocation || vehicle.driverPhoneLocation || vehicle.location ||
      vehicle.point || vehicle.position || vehicle.lastPosition
    ));
  }

  function gpsSource(vehicle) {
    const source = String(vehicle && (vehicle.gpsSource || vehicle.trackerStatus || "") || "").toLowerCase();
    if (source.includes("phone") || source.includes("celular")) return "GPS celular";
    if (source.includes("rafa") || vehicle && (vehicle.trackerId || vehicle.lastTrackerAt)) return "Tracker RAFA";
    return vehiclePoint(vehicle) ? "Posição disponível" : "Sem posição";
  }

  function renderDispatchAdvisor() {
    const host = $("opsDispatchAdvisor");
    if (!host) return;
    const call = state.calls && state.calls[state.selectedCallId];
    if (!call) {
      const emptySignature = "no-selected-call";
      if (host.dataset.signature === emptySignature) return;
      host.dataset.signature = emptySignature;
      host.innerHTML = `<div class="dispatch-advisor-empty"><b>Selecione um chamado</b><span>O sistema ordenará os veículos por proximidade e qualidade da posição.</span></div>`;
      return;
    }
    const origin = callOriginPoint(call);
    const rows = visibleRows(state.vehicles).map((vehicle) => {
      const point = vehiclePoint(vehicle);
      const km = origin && point ? haversineKm(origin, point) : null;
      const updatedAt = vehicle.lastPhoneGpsAt || vehicle.lastTrackerAt || vehicle.updatedAt || "";
      const ageMinutes = updatedAt ? Math.max(0, Math.round((Date.now() - dateValue(updatedAt)) / 60000)) : null;
      const status = String(vehicle.status || "Disponível");
      const unavailable = /manuten|indispon|atendimento/i.test(status);
      return { vehicle, point, km, ageMinutes, unavailable, source: gpsSource(vehicle) };
    }).sort((a, b) => {
      if (a.unavailable !== b.unavailable) return a.unavailable ? 1 : -1;
      if (a.km == null && b.km != null) return 1;
      if (a.km != null && b.km == null) return -1;
      return Number(a.km || 999999) - Number(b.km || 999999);
    }).slice(0, 6);

    const signature = JSON.stringify({ callId: call.id, selectedVehicleId: state.selectedVehicleId || "", rows: rows.map((row) => [row.vehicle.id, row.km == null ? null : Number(row.km.toFixed(2)), row.ageMinutes, row.unavailable, row.source]) });
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    host.innerHTML = `
      <div class="dispatch-advisor-head">
        <div><span class="driver-eyebrow">Despacho inteligente</span><b>${esc(call.protocolo || call.cliente || call.id)}</b></div>
        <span class="badge ${origin ? "ok" : "warn"}">${origin ? "Origem validada" : "Origem sem coordenada"}</span>
      </div>
      <div class="dispatch-ranking">
        ${rows.map((row, index) => {
          const selected = row.vehicle.id === state.selectedVehicleId;
          const distance = row.km == null ? "Distância indisponível" : row.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km em linha reta";
          const age = row.ageMinutes == null ? "sem horário" : row.ageMinutes <= 1 ? "agora" : `há ${row.ageMinutes} min`;
          return `<button type="button" class="dispatch-rank-card${selected ? " selected" : ""}" data-vehicle-id="${esc(row.vehicle.id)}">
            <span class="dispatch-rank-number">${index + 1}</span>
            <span class="dispatch-rank-main"><b>${esc(row.vehicle.placa || row.vehicle.id)}</b><small>${esc(row.vehicle.apelido || row.vehicle.tipo || "Veículo")}</small></span>
            <span class="dispatch-rank-info"><b>${esc(distance)}</b><small>${esc(row.source)} · ${esc(age)}</small></span>
            <span class="badge ${row.unavailable ? "danger" : row.point ? "ok" : "warn"}">${esc(row.unavailable ? row.vehicle.status : row.point ? "Disponível" : "Sem GPS")}</span>
          </button>`;
        }).join("") || `<p class="muted">Nenhum veículo cadastrado.</p>`}
      </div>
      <div class="dispatch-advisor-actions">
        <button class="btn good" id="advisorDispatchBtn" type="button">Despachar selecionado</button>
        <button class="btn" id="advisorOpenRouteBtn" type="button">Abrir rota</button>
      </div>`;

    host.querySelectorAll("[data-vehicle-id]").forEach((button) => {
      button.addEventListener("click", () => {
        app.selectOperationalVehicle(button.dataset.vehicleId);
        renderDispatchAdvisor();
      });
    });
    const dispatch = $("advisorDispatchBtn");
    if (dispatch) dispatch.onclick = () => app.assignSelectedVehicleToSelectedCall();
    const route = $("advisorOpenRouteBtn");
    if (route) route.onclick = () => app.openSelectedCallRoute();
  }

  function setupCentralAdvisor() {
    const kpis = $("opsKpis");
    if (!kpis || $("opsDispatchAdvisor")) return;
    const host = document.createElement("section");
    host.id = "opsDispatchAdvisor";
    host.className = "panel dispatch-advisor no-collapse";
    host.dataset.noCollapse = "true";
    kpis.insertAdjacentElement("afterend", host);
    const observer = new MutationObserver(renderDispatchAdvisor);
    observer.observe($("opsCallsList") || kpis, { childList: true, subtree: true });
    observer.observe($("opsVehiclesList") || kpis, { childList: true, subtree: true });
    renderDispatchAdvisor();
  }

  function setupOperationalHome() {
    const appView = $("appView");
    if (!appView) return;
    let applied = false;
    const observer = new MutationObserver(() => {
      if (applied || appView.classList.contains("hidden")) return;
      applied = true;
      if (!sessionStorage.getItem("jm.operational.home.opened") && !location.hash) {
        sessionStorage.setItem("jm.operational.home.opened", "true");
        setTimeout(() => showView("operacao"), 180);
      }
    });
    observer.observe(appView, { attributes: true, attributeFilter: ["class"] });
  }

  // ---------------------------------------------------------------------------
  // FASE 10 — Chamado em três etapas + rascunho local
  // ---------------------------------------------------------------------------
  const CALL_DRAFT_KEY = "jm.call.wizard.draft.v32.7";
  const stepDefinitions = [
    { key: "atendimento", label: "1. Atendimento", description: "Cliente, seguradora, veículo e valor oficial." },
    { key: "enderecos", label: "2. Endereços", description: "Origem, destino e confirmação das coordenadas." },
    { key: "rota", label: "3. Rota e preço", description: "Rota, pedágios, precificação e criação do chamado." }
  ];

  function classifyCallChild(node) {
    if (!(node instanceof HTMLElement)) return "atendimento";
    const ids = Array.from(node.querySelectorAll("[id]")).map((el) => el.id).concat(node.id || "");
    if (ids.some((id) => /^callOrigin|^callDest|^btnGeocode|^btnOpenOrigin|^btnOpenDest|^btnUseCurrent|^originGeo|^destGeo|^callRouteExternal|^btnReadRoute|^routeLink/.test(id))) return "enderecos";
    if (node.classList.contains("route-planner") || node.classList.contains("tow-pricing-card") || ids.some((id) => /^btnSmartRoute|^btnRoutePricing|^btnOpenGoogleRoute|^smartRoute|^routePricing|^callTow|^btnTow|^btnUseSuggested|^towPricing|^callNotes|^callCancelEdit/.test(id)) || node.matches("button[type='submit']")) return "rota";
    return "atendimento";
  }

  function callFormValues() {
    const form = $("callForm");
    const data = {};
    if (!form) return data;
    Array.from(form.elements).forEach((field) => {
      if (!field.id || field.type === "file" || field.type === "button" || field.type === "submit") return;
      data[field.id] = field.type === "checkbox" ? !!field.checked : field.value;
    });
    return data;
  }

  function saveCallDraft() {
    try {
      localStorage.setItem(CALL_DRAFT_KEY, JSON.stringify({ at: new Date().toISOString(), values: callFormValues() }));
      const status = $("callWizardDraftStatus");
      if (status) status.textContent = "Rascunho salvo automaticamente às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (_) {}
  }

  function restoreCallDraft(force) {
    const form = $("callForm");
    if (!form) return;
    let record;
    try { record = JSON.parse(localStorage.getItem(CALL_DRAFT_KEY) || "null"); } catch (_) { record = null; }
    if (!record || !record.values) return;
    const hasContent = Array.from(form.elements).some((field) => field.id && !["checkbox", "button", "submit"].includes(field.type) && String(field.value || "").trim());
    if (hasContent && !force) return;
    Object.entries(record.values).forEach(([id, value]) => {
      const field = $(id);
      if (!field) return;
      if (field.type === "checkbox") field.checked = !!value;
      else field.value = value == null ? "" : value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
    notify("Rascunho do chamado restaurado.", "ok");
  }

  function setupCallWizard() {
    const form = $("callForm");
    if (!form || form.dataset.wizardReady === "true") return;
    form.dataset.wizardReady = "true";
    form.classList.add("call-wizard-form");

    const children = Array.from(form.children);
    const sections = {};
    stepDefinitions.forEach((step, index) => {
      const section = document.createElement("section");
      section.className = "call-wizard-step form-grid" + (index ? " hidden" : "");
      section.dataset.callStep = step.key;
      sections[step.key] = section;
    });
    children.forEach((child) => sections[classifyCallChild(child)].appendChild(child));
    Object.values(sections).forEach((section) => form.appendChild(section));

    const nav = document.createElement("div");
    nav.className = "call-wizard-nav wide";
    nav.innerHTML = `
      <div class="call-wizard-tabs">${stepDefinitions.map((step, index) => `<button type="button" data-call-step-index="${index}" class="${index === 0 ? "active" : ""}"><span>${index + 1}</span>${esc(step.label.replace(/^\d+\.\s*/, ""))}</button>`).join("")}</div>
      <div class="call-wizard-info"><b id="callWizardTitle">${esc(stepDefinitions[0].label)}</b><span id="callWizardDescription">${esc(stepDefinitions[0].description)}</span><small id="callWizardDraftStatus">Rascunho automático ativo</small></div>
      <div class="call-wizard-actions"><button class="btn" id="callWizardPrev" type="button">Voltar</button><button class="btn primary" id="callWizardNext" type="button">Continuar</button><button class="btn" id="callWizardRestore" type="button">Restaurar rascunho</button><button class="btn danger" id="callWizardClear" type="button">Limpar rascunho</button></div>`;
    form.insertBefore(nav, form.firstChild);

    let activeIndex = 0;
    function setStep(index) {
      activeIndex = Math.max(0, Math.min(stepDefinitions.length - 1, index));
      stepDefinitions.forEach((step, i) => sections[step.key].classList.toggle("hidden", i !== activeIndex));
      nav.querySelectorAll("[data-call-step-index]").forEach((button, i) => button.classList.toggle("active", i === activeIndex));
      $("callWizardTitle").textContent = stepDefinitions[activeIndex].label;
      $("callWizardDescription").textContent = stepDefinitions[activeIndex].description;
      $("callWizardPrev").disabled = activeIndex === 0;
      $("callWizardNext").classList.toggle("hidden", activeIndex === stepDefinitions.length - 1);
      sections[stepDefinitions[activeIndex].key].scrollIntoView({ behavior: "smooth", block: "start" });
    }
    nav.querySelectorAll("[data-call-step-index]").forEach((button) => button.addEventListener("click", () => setStep(Number(button.dataset.callStepIndex))));
    $("callWizardPrev").onclick = () => setStep(activeIndex - 1);
    $("callWizardNext").onclick = () => {
      if (activeIndex === 0 && !String($("callClient") && $("callClient").value || "").trim()) return notify("Informe o cliente antes de continuar.", "danger");
      saveCallDraft();
      setStep(activeIndex + 1);
    };
    $("callWizardRestore").onclick = () => restoreCallDraft(true);
    $("callWizardClear").onclick = () => {
      if (!confirm("Apagar somente o rascunho local do formulário?")) return;
      localStorage.removeItem(CALL_DRAFT_KEY);
      $("callWizardDraftStatus").textContent = "Rascunho local apagado";
    };
    let saveTimer;
    form.addEventListener("input", () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveCallDraft, 500); });
    form.addEventListener("change", () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveCallDraft, 300); });
    restoreCallDraft(false);
  }

  // ---------------------------------------------------------------------------
  // FASE 11 — Revisão visível do Assistente IA
  // ---------------------------------------------------------------------------
  function renderAiValidationSummary() {
    const box = $("aiValidationSummary");
    if (!box) return;
    const draft = (state.aiDrafts || []).find((item) => item.kind === "call");
    if (!draft) {
      if (box.dataset.signature === "empty") return;
      box.dataset.signature = "empty";
      box.innerHTML = `<div class="ai-validation-empty">Cole o acionamento da seguradora. A conferência mostrará valor, origem, destino e status externo antes de criar o chamado.</div>`;
      return;
    }
    const data = draft.data || {};
    const aiSignature = JSON.stringify({ origin: data.origin || "", destination: data.destination || "", amount: data.amount || data.tariffTotal || 0, status: data.externalStatus || "", client: data.client || "", insurance: data.insurance || "" });
    if (box.dataset.signature === aiSignature) return;
    box.dataset.signature = aiSignature;
    const origin = data.origin || "Não identificado";
    const destination = data.destination || "Não identificado";
    const destinationConflict = /tanabi/i.test(destination) && /rio preto/i.test(destination);
    const amount = Number(data.amount || data.tariffTotal || 0);
    box.innerHTML = `
      <div class="ai-validation-head"><div><span class="driver-eyebrow">Conferência obrigatória</span><b>Dados identificados</b></div><span class="badge ${destinationConflict ? "danger" : "ok"}">${destinationConflict ? "Destino contraditório" : "Pronto para revisão"}</span></div>
      <div class="ai-validation-grid">
        <div><span>Cliente / seguradora</span><b>${esc(data.insurance || data.billingClient || data.client || "-")}</b></div>
        <div><span>Beneficiário</span><b>${esc(data.client || "-")}</b></div>
        <div><span>Valor oficial</span><b>${money(amount)}</b></div>
        <div><span>Status externo</span><b>${esc(data.externalStatus || "-")}</b></div>
        <div class="wide"><span>Origem</span><b>${esc(origin)}</b></div>
        <div class="wide"><span>Destino</span><b>${esc(destination)}</b></div>
      </div>
      <p class="small ${destinationConflict ? "danger" : "muted"}">${destinationConflict ? "O destino contém cidades incompatíveis. Corrija antes de criar o chamado." : "O status externo não finaliza o chamado interno. O valor importado permanece travado até ação consciente do gestor."}</p>`;
  }

  function setupAiValidation() {
    const review = $("aiReviewBox");
    if (!review || $("aiValidationSummary")) return;
    const summary = document.createElement("div");
    summary.id = "aiValidationSummary";
    summary.className = "ai-validation-panel";
    review.insertAdjacentElement("beforebegin", summary);
    new MutationObserver(renderAiValidationSummary).observe(review, { childList: true, subtree: true });
    renderAiValidationSummary();
  }

  // ---------------------------------------------------------------------------
  // FASE 14 — Financeiro e pagamentos como fluxo único
  // ---------------------------------------------------------------------------
  function financeNumbers() {
    const transactions = visibleRows(state.transactions);
    const expenses = visibleRows(state.expenses);
    const calls = visibleRows(state.calls);
    const revenue = transactions.filter((row) => String(row.type || row.tipo).toLowerCase() === "entrada").reduce((sum, row) => sum + Number(row.amount || row.valor || 0), 0);
    const out = transactions.filter((row) => String(row.type || row.tipo).toLowerCase() === "saida").reduce((sum, row) => sum + Number(row.amount || row.valor || 0), 0);
    const pendingExpenses = expenses.filter((row) => String(row.status).toLowerCase() === "pendente").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const receivable = calls.filter((call) => /a_faturar|faturado|a receber|parcial/i.test(String(call.billingStatus || ""))).reduce((sum, call) => sum + Number(call.balanceDue != null ? call.balanceDue : call.valor || 0), 0);
    const missingFinance = calls.filter((call) => /finalizado|entregue/i.test(String(call.statusKey || call.status || "")) && !/recebido|faturado|a_faturar/i.test(String(call.billingStatus || ""))).length;
    return { revenue, out, profit: revenue - out, pendingExpenses, receivable, missingFinance };
  }

  function csvDownload(rows, filename) {
    if (!rows.length) return notify("Não há registros para exportar.", "warn");
    const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((key) => !["routeGeometry", "rawPayload", "proofPhotos", "proofAudios"].includes(key));
    const quote = (value) => `"${String(value == null ? "" : typeof value === "object" ? JSON.stringify(value) : value).replace(/"/g, '""')}"`;
    const csv = [keys.map(quote).join(";"), ...rows.map((row) => keys.map((key) => quote(row[key])).join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function financeHubHtml(active) {
    const n = financeNumbers();
    return `
      <div class="finance-unified-head">
        <div><span class="driver-eyebrow">Fluxo financeiro único</span><b>Operação → despesas → faturamento → recebimento</b></div>
        <div class="finance-unified-tabs"><button type="button" data-fin-view="financeiro" class="${active === "financeiro" ? "active" : ""}">Lançamentos</button><button type="button" data-fin-view="pagamentos" class="${active === "pagamentos" ? "active" : ""}">Contas e fechamentos</button></div>
      </div>
      <div class="finance-unified-kpis">
        <div><span>Receitas</span><b>${money(n.revenue)}</b></div>
        <div><span>Saídas</span><b>${money(n.out)}</b></div>
        <div><span>Resultado</span><b>${money(n.profit)}</b></div>
        <div><span>A receber</span><b>${money(n.receivable)}</b></div>
        <div><span>Despesas pendentes</span><b>${money(n.pendingExpenses)}</b></div>
        <div><span>Finalizados sem fluxo</span><b>${n.missingFinance}</b></div>
      </div>
      <div class="finance-unified-actions"><button class="btn" type="button" data-export="transactions">Exportar lançamentos CSV</button><button class="btn" type="button" data-export="expenses">Exportar despesas CSV</button><button class="btn" type="button" data-export="calls">Exportar chamados CSV</button></div>`;
  }

  function renderFinanceHubs() {
    [["view-financeiro", "financeiro"], ["view-pagamentos", "pagamentos"]].forEach(([viewId, active]) => {
      const view = $(viewId);
      if (!view) return;
      let hub = view.querySelector(".finance-unified-hub");
      if (!hub) {
        hub = document.createElement("section");
        hub.className = "panel finance-unified-hub no-collapse";
        hub.dataset.noCollapse = "true";
        view.querySelector(".grid").insertAdjacentElement("afterbegin", hub);
      }
      const html = financeHubHtml(active);
      const signature = active + "|" + JSON.stringify(financeNumbers());
      if (hub.dataset.signature === signature) return;
      hub.dataset.signature = signature;
      hub.innerHTML = html;
      hub.querySelectorAll("[data-fin-view]").forEach((button) => button.onclick = () => showView(button.dataset.finView));
      hub.querySelectorAll("[data-export]").forEach((button) => button.onclick = () => {
        const type = button.dataset.export;
        csvDownload(visibleRows(state[type]), `jm-${type}-${new Date().toISOString().slice(0, 10)}.csv`);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // FASE 15 — Tabelas viram cartões no celular
  // ---------------------------------------------------------------------------
  function decorateTable(table) {
    if (!table || table.dataset.mobileCards === "true") return;
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
    if (!headers.length) return;
    table.classList.add("responsive-card-table");
    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => cell.setAttribute("data-label", headers[index] || ""));
    });
    table.dataset.mobileCards = "true";
  }

  function decorateAllTables() {
    document.querySelectorAll(".table-wrap table, .panel > table").forEach(decorateTable);
  }

  // ---------------------------------------------------------------------------
  // FASE 17 — atualização PWA visível
  // ---------------------------------------------------------------------------
  function setupUpdateBanner() {
    if (!("serviceWorker" in navigator) || $("jmUpdateBanner")) return;
    const banner = document.createElement("div");
    banner.id = "jmUpdateBanner";
    banner.className = "jm-update-banner hidden";
    banner.innerHTML = `<div><b>Nova versão disponível</b><span>Atualize para carregar todos os arquivos da mesma versão.</span></div><button class="btn primary" type="button">Atualizar agora</button>`;
    document.body.appendChild(banner);
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      const show = () => banner.classList.remove("hidden");
      if (registration.waiting) show();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) show();
        });
      });
      banner.querySelector("button").onclick = () => {
        if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
        location.reload();
      };
    }).catch(() => {});
  }


  function sanitizedPublicIntegrations(data) {
    data = data || {};
    const cloudinary = data.cloudinary || {};
    const mobileGps = data.mobileGps || {};
    const map = data.map || {};
    return {
      schemaVersion: 1,
      cloudinary: {
        cloudName: cloudinary.cloudName || "",
        uploadPreset: cloudinary.uploadPreset || "",
        folder: cloudinary.folder || "jm-guinchos"
      },
      mobileGps: {
        enabled: mobileGps.enabled === true || mobileGps.enabled === "true",
        backend: mobileGps.backend || "realtime_database",
        databaseURL: mobileGps.databaseURL || "",
        pollingMs: Number(mobileGps.pollingMs || 10000),
        minIntervalMs: Number(mobileGps.minIntervalMs || 20000),
        minDistanceMeters: Number(mobileGps.minDistanceMeters || 25)
      },
      map: {
        provider: map.provider || "leaflet_osm",
        country: "br",
        center: map.center || { lat: -20.8113, lng: -49.3758 },
        averageSpeedKmH: Number(map.averageSpeedKmH || 48)
      },
      publishedAt: new Date().toISOString(),
      publishedBy: state.user && state.user.uid || "",
      version: VERSION
    };
  }

  async function syncPublicIntegrationsFromManager() {
    const firebaseApi = window.JM && window.JM.firebase;
    const role = String(state.profile && state.profile.role || "").toLowerCase();
    if (!firebaseApi || !firebaseApi.db || !["admin", "superadmin", "gestor", "manager", "owner"].includes(role)) return;
    const data = state.settings || {};
    if (!data.mobileGps && !data.cloudinary) return;
    const stable = sanitizedPublicIntegrations(data);
    const signature = JSON.stringify({ cloudinary: stable.cloudinary, mobileGps: stable.mobileGps, map: stable.map, version: stable.version });
    if (syncPublicIntegrationsFromManager.lastSignature === signature || syncPublicIntegrationsFromManager.pendingSignature === signature) return;
    syncPublicIntegrationsFromManager.pendingSignature = signature;
    try {
      await firebaseApi.db.collection("settings").doc("publicIntegrations").set(stable, { merge: true });
      syncPublicIntegrationsFromManager.lastSignature = signature;
    } catch (error) {
      console.warn("Não foi possível sincronizar settings/publicIntegrations", error);
    } finally {
      syncPublicIntegrationsFromManager.pendingSignature = "";
    }
  }

  // ---------------------------------------------------------------------------
  // Bootstrap / atualização contínua
  // ---------------------------------------------------------------------------
  function bootstrap() {
    setupOperationalHome();
    setupUpdateBanner();

    const appView = $("appView");
    let enhancementsStarted = false;
    let refreshScheduled = false;
    let mutation = null;

    function refreshDynamicUx() {
      if (refreshScheduled) return;
      refreshScheduled = true;
      requestAnimationFrame(() => {
        refreshScheduled = false;
        if (appView && appView.classList.contains("hidden")) return;
        decorateAllTables();
        renderDispatchAdvisor();
        renderAiValidationSummary();
        renderFinanceHubs();
        syncPublicIntegrationsFromManager();
      });
    }

    function startEnhancementsWhenPanelIsVisible() {
      if (enhancementsStarted) return;
      if (appView && appView.classList.contains("hidden")) return;
      enhancementsStarted = true;

      setupCentralAdvisor();
      setupCallWizard();
      setupAiValidation();
      refreshDynamicUx();

      mutation = new MutationObserver(refreshDynamicUx);
      mutation.observe(appView || document.body, { childList: true, subtree: true });
    }

    if (appView && appView.classList.contains("hidden")) {
      const visibilityObserver = new MutationObserver(() => {
        if (appView.classList.contains("hidden")) return;
        visibilityObserver.disconnect();
        startEnhancementsWhenPanelIsVisible();
      });
      visibilityObserver.observe(appView, { attributes: true, attributeFilter: ["class"] });
    } else {
      startEnhancementsWhenPanelIsVisible();
    }

    window.addEventListener("online", () => notify("Conexão restabelecida.", "ok"));
    window.addEventListener("offline", () => notify("Sem internet. O Firebase manterá dados simples em cache; uploads precisam de conexão.", "warn"));
    console.info("JM UX final", VERSION);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();
})();
