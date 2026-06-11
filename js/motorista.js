(function () {
  "use strict";

  const { $, esc, parseMoney, toast, statusClass, routeKm, mapsRouteUrl, statusKey, statusLabel, isFinalStatus, setupCollapsiblePanels, pointFrom } = window.JM.utils;
  const { auth, db, arrayUnion, getRealtimeDb, rtdbKey } = window.JM.firebase;
  const cfg = window.JM_CONFIG || {};
  const DRIVER_FLOW_VERSION = "jm-v32-7-3-login-sem-travamento";
  const state = {
    user: null,
    profile: null,
    calls: {},
    vehicles: {},
    expenses: {},
    settings: {},
    settingsLoaded: false,
    selectedCallId: "",
    activeCallRestored: false,
    callsLoaded: false,
    driverLivePoint: null,
    pendingOperations: 0,
    networkOnline: navigator.onLine !== false,
    gpsState: "checking",
    statusUpdating: false,
    proofWizardStep: 0,
    proofDraftSaving: false
  };
  const unsubscribers = [];
  let driverLocationWatchId = null;
  let lastDriverPhoneWrite = null;
  let renderTimer = null;
  let mapRenderTimer = null;
  let lastSelectSignature = "";
  let lastRenderedCallsHtml = "";
  let lastLoadedProofCallId = "";
  const PROOF_STAGES = ["retirada", "carregamento", "transporte", "entrega", "finalizacao"];
  const PROOF_STAGE_FIELDS = {
    retirada: { select: "proofStageRetirada", justification: "proofStageRetiradaJustification", label: "Retirada" },
    carregamento: { select: "proofStageCarregamento", justification: "proofStageCarregamentoJustification", label: "Carregamento" },
    transporte: { select: "proofStageTransporte", justification: "", label: "Transporte" },
    entrega: { select: "proofStageEntrega", justification: "proofStageEntregaJustification", label: "Entrega" },
    finalizacao: { select: "proofStageFinalizacao", justification: "proofStageFinalizacaoJustification", label: "Finalização" }
  };
  const STATUS_FLOW = [
    "despachado",
    "motorista_a_caminho",
    "motorista_no_local",
    "veiculo_carregado",
    "em_transporte",
    "entregue",
    "finalizado"
  ];
  const PROOF_WIZARD_STEPS = [
    { key: "retirada", label: "Retirada", short: "Retirada", phase: "retirada" },
    { key: "inspecao", label: "Inspeção", short: "Inspeção", phase: "retirada" },
    { key: "carregamento", label: "Carregamento", short: "Carga", phase: "carregamento" },
    { key: "transporte", label: "Transporte", short: "Transporte", phase: "transporte" },
    { key: "entrega", label: "Entrega", short: "Entrega", phase: "entrega" },
    { key: "finalizacao", label: "Finalização", short: "Final", phase: "finalizacao" }
  ];
  const PROOF_INPUT_STEP_MAP = {
    proofStageRetirada: "retirada",
    proofStageRetiradaJustification: "retirada",
    proofPickupResponsibleName: "retirada",
    proofPickupResponsibleDoc: "retirada",
    proofFuelLevel: "inspecao",
    proofOdometer: "inspecao",
    proofTireCondition: "inspecao",
    proofKeyDocument: "inspecao",
    proofVehicleLoaded: "inspecao",
    proofEasyRemoval: "inspecao",
    proofVehicleTechnicalNotes: "inspecao",
    proofAccessoriesGrid: "inspecao",
    damageVehicleType: "inspecao",
    damageDiagram: "inspecao",
    damageSelectedEditor: "inspecao",
    damagePartsSummary: "inspecao",
    proofDamageDetails: "inspecao",
    proofPhotoFront: "inspecao",
    proofPhotoRear: "inspecao",
    proofPhotoRight: "inspecao",
    proofPhotoLeft: "inspecao",
    proofPhotoDashboard: "inspecao",
    proofPhotoDamage: "inspecao",
    proofStageCarregamento: "carregamento",
    proofStageCarregamentoJustification: "carregamento",
    proofPhotoLoadAfter: "carregamento",
    proofStageTransporte: "transporte",
    proofStageEntrega: "entrega",
    proofStageEntregaJustification: "entrega",
    proofDeliveryResponsibleName: "entrega",
    proofDeliveryResponsibleDoc: "entrega",
    proofPhotoDeliveryFront: "entrega",
    proofPhotoDeliveryRear: "entrega",
    proofPhotoDeliveryRight: "entrega",
    proofPhotoDeliveryLeft: "entrega",
    proofPhotoDeliveryDashboard: "entrega",
    proofStageFinalizacao: "finalizacao",
    proofStageFinalizacaoJustification: "finalizacao",
    proofChecklistNotes: "finalizacao",
    proofPhotoFinal: "finalizacao",
    proofAudioFiles: "finalizacao",
    signaturePhase: "finalizacao",
    signatureCustomerName: "finalizacao",
    signatureCustomerDoc: "finalizacao",
    signatureAcceptedText: "finalizacao",
    signatureRefusalReason: "finalizacao",
    signatureCanvas: "finalizacao",
    toggleSignatureModeBtn: "finalizacao",
    clearSignatureBtn: "finalizacao"
  };
  const proofPreviewUrls = new Map();
  const proofUploadState = new Map();
  const REQUIRED_PHOTOS = [
    { key: "front", input: "proofPhotoFront", label: "Frente" },
    { key: "rear", input: "proofPhotoRear", label: "Traseira" },
    { key: "right", input: "proofPhotoRight", label: "Lateral direita" },
    { key: "left", input: "proofPhotoLeft", label: "Lateral esquerda" },
    { key: "dashboard", input: "proofPhotoDashboard", label: "Painel / odômetro" },
    { key: "load_after", input: "proofPhotoLoadAfter", label: "Carregado no caminhão" },
    { key: "delivery_front", input: "proofPhotoDeliveryFront", label: "Entrega - frente" },
    { key: "delivery_rear", input: "proofPhotoDeliveryRear", label: "Entrega - traseira" },
    { key: "delivery_right", input: "proofPhotoDeliveryRight", label: "Entrega - lateral direita" },
    { key: "delivery_left", input: "proofPhotoDeliveryLeft", label: "Entrega - lateral esquerda" },
    { key: "delivery_dashboard", input: "proofPhotoDeliveryDashboard", label: "Entrega - painel / odômetro" },
    { key: "damage", input: "proofPhotoDamage", label: "Avarias" },
    { key: "final", input: "proofPhotoFinal", label: "Comprovante final" }
  ];
  const DAMAGE_PARTS = [
    { key: "front", label: "Frente" },
    { key: "rear", label: "Traseira" },
    { key: "right", label: "Lateral direita" },
    { key: "left", label: "Lateral esquerda" },
    { key: "roof", label: "Teto" },
    { key: "hood", label: "Capô" },
    { key: "trunk", label: "Porta-malas" },
    { key: "windshield", label: "Para-brisa/vidros" },
    { key: "wheels", label: "Rodas/pneus" },
    { key: "underbody", label: "Parte inferior" },
    { key: "truck_bed", label: "Plataforma/guincho" },
    { key: "other", label: "Outro ponto" }
  ];
  const DAMAGE_TYPES = [
    { value: "risco", label: "Risco" },
    { value: "amassado", label: "Amassado" },
    { value: "quebrado", label: "Quebrado / trincado" },
    { value: "faltando", label: "Item ausente" },
    { value: "pneu", label: "Pneu / roda" },
    { value: "vidro", label: "Vidro" },
    { value: "vazamento", label: "Vazamento" },
    { value: "outro", label: "Outro" }
  ];
  const DAMAGE_SEVERITIES = [
    { value: "leve", label: "Leve" },
    { value: "moderada", label: "Moderada" },
    { value: "grave", label: "Grave" }
  ];
  const ACCESSORY_GROUPS = [
    {
      title: "Parte externa do veículo",
      items: [
        ["driverMirror", "Retrovisor motorista"],
        ["passengerMirror", "Retrovisor passageiro"],
        ["fogLight", "Farol de milha"],
        ["alloyWheels", "Rodas de liga leve"],
        ["steelWheels", "Rodas de aço"],
        ["hubcaps", "Calotas"],
        ["antenna", "Antena"],
        ["trunkLid", "Porta-malas"],
        ["fireExtinguisher", "Extintor"],
        ["spareTire", "Estepe"],
        ["warningTriangle", "Triângulo"],
        ["jack", "Macaco"]
      ]
    },
    {
      title: "Painel / porta / documentos",
      items: [
        ["ignitionKey", "Chave de ignição"],
        ["tachograph", "Tacógrafo"],
        ["multimedia", "Multimídia"],
        ["cdPlayer", "CD Player"],
        ["dvdPlayer", "DVD Player"],
        ["radioTransmitter", "Rádio transmissor"],
        ["documents", "Documentos"],
        ["speaker", "Auto falante"]
      ]
    },
    {
      title: "Parte interna do veículo",
      items: [
        ["amplifier", "Amplificador"],
        ["console", "Console"],
        ["floorMats", "Tapetes"],
        ["rearCover", "Tampão traseiro"],
        ["driverSeat", "Banco dianteiro motorista"],
        ["passengerSeat", "Banco dianteiro passageiro"],
        ["cabinBed", "Cama gabinado"],
        ["alarm", "Alarme"]
      ]
    }
  ];
  let signaturePad = null;
  let selectedDamageParts = new Set();
  let selectedDamageNotes = {};
  let selectedDamageMeta = {};
  let activeDamagePartKey = "";
  const ACCESSORY_STATUS_LABELS = { sim: "S", nao: "N", avaria: "A" };

  function friendlyAuthError(err) {
    const code = err && err.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Usuário ou senha inválidos.";
    return "Acesso negado: " + (err && err.message || "falha de autenticação");
  }

  function stopListeners() {
    unsubscribers.splice(0).forEach((fn) => fn());
  }

  function normalizedRole(role) {
    return String(role || "").toLowerCase().trim();
  }

  function isDriverRole(role) {
    return ["driver", "motorista"].includes(normalizedRole(role));
  }

  function visibleRows(rows) {
    return Object.values(rows || {}).filter((row) => row && !row.deletedAt);
  }

  function isSelectBusy(el) {
    if (!el) return false;
    return document.activeElement === el || el.matches && el.matches(":focus");
  }

  function optionSignature(calls, vehicles) {
    const callPart = activeCalls().map((c) => [c.id, c.protocolo || "", c.cliente || "", c.vehicleId || "", c.statusKey || c.status || ""].join("|")).join(";");
    const vehiclePart = visibleRows(vehicles || state.vehicles).map((v) => [v.id, v.placa || ""].join("|")).join(";");
    return callPart + "::" + vehiclePart;
  }

  function setSelectOptionsStable(select, html, previousValue) {
    if (!select) return;
    if (isSelectBusy(select)) return;
    const old = previousValue != null ? previousValue : select.value;
    if (select.dataset.lastOptionsHtml !== html) {
      select.innerHTML = html;
      select.dataset.lastOptionsHtml = html;
    }
    if (old && Array.from(select.options).some((opt) => opt.value === old)) select.value = old;
  }

  function scheduleRender(reason) {
    if (!state.user) return;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => render(reason || "snapshot"), 180);
  }

  function scheduleMapRender(delayMs) {
    clearTimeout(mapRenderTimer);
    mapRenderTimer = setTimeout(() => {
      if (!document.getElementById("driverMap")) return;
      const panel = document.getElementById("driverPanelMap");
      if (panel && panel.classList.contains("is-collapsed")) return;
      window.JM_MAP_SETTINGS = (window.JM_CONFIG && window.JM_CONFIG.map) || {};
      window.JM.mapa.renderFleetMap("driverMap", driverVehiclesForMap(), driverCallsForMap(), { selectedCallId: state.selectedCallId || "", selectedVehicleId: selectedCallVehicleId(), filter: "todos" });
    }, Number.isFinite(Number(delayMs)) ? Number(delayMs) : 350);
  }

  function statusFlowIndex(value) {
    const key = statusKey(value);
    const index = STATUS_FLOW.indexOf(key);
    return index >= 0 ? index : -1;
  }

  function nextStatusKey(call) {
    const current = statusKey(call && (call.statusKey || call.status));
    if (["aguardando_despacho", "aguardando_validacao_rota"].includes(current)) return "despachado";
    const index = statusFlowIndex(current);
    if (index < 0) return "despachado";
    return STATUS_FLOW[Math.min(index + 1, STATUS_FLOW.length - 1)] || current;
  }

  function previousStatusKey(call) {
    const current = statusKey(call && (call.statusKey || call.status));
    const index = statusFlowIndex(current);
    return index > 0 ? STATUS_FLOW[index - 1] : "";
  }

  function renderStatusGuide(call) {
    const title = $("driverStatusGuideTitle");
    const counter = $("driverStatusGuideCounter");
    const fill = $("driverStatusProgressFill");
    const steps = $("driverStatusSteps");
    const hint = $("driverStatusGuideHint");
    if (!title || !counter || !fill || !steps || !hint) return;
    if (!call) {
      title.textContent = "Selecione um atendimento";
      counter.textContent = "0/7";
      fill.style.width = "0%";
      steps.innerHTML = STATUS_FLOW.map((key) => `<span class="driver-status-step"><i></i>${esc(statusLabel(key))}</span>`).join("");
      hint.textContent = "O sistema mostrará somente a próxima etapa válida e impedirá saltos acidentais.";
      return;
    }
    const current = statusKey(call.statusKey || call.status);
    const currentIndex = statusFlowIndex(current);
    const completed = Math.max(0, currentIndex + 1);
    title.textContent = statusLabel(current);
    counter.textContent = completed + "/" + STATUS_FLOW.length;
    fill.style.width = Math.max(0, Math.min(100, completed / STATUS_FLOW.length * 100)) + "%";
    steps.innerHTML = STATUS_FLOW.map((key, index) => {
      const cls = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
      return `<span class="driver-status-step ${cls}"><i>${index < currentIndex ? "✓" : index + 1}</i>${esc(statusLabel(key))}</span>`;
    }).join("");
    const next = nextStatusKey(call);
    hint.textContent = current === "finalizado"
      ? "Atendimento finalizado."
      : "Próxima etapa recomendada: " + statusLabel(next) + ". Para voltar uma etapa, o sistema exigirá justificativa.";
  }

  function refreshQuickStatusOptions(call) {
    const select = $("driverQuickStatus");
    if (!select) return;
    if (!call) {
      select.innerHTML = '<option value="">Selecione um atendimento</option>';
      select.disabled = true;
      return;
    }
    const current = statusKey(call.statusKey || call.status);
    const next = nextStatusKey(call);
    const previous = previousStatusKey(call);
    const options = [`<option value="${esc(next)}">Continuar: ${esc(statusLabel(next))}</option>`];
    if (previous) options.push(`<option value="${esc(previous)}">Corrigir para: ${esc(statusLabel(previous))}</option>`);
    select.innerHTML = options.join("");
    select.value = next;
    select.disabled = current === "finalizado" || state.statusUpdating;
  }

  function deviceStatusMetadata() {
    return {
      userAgent: String(navigator.userAgent || "").slice(0, 240),
      platform: String(navigator.platform || "").slice(0, 80),
      online: navigator.onLine !== false
    };
  }

  function requestStatusConfirmation(call, targetKey, backwards) {
    return new Promise((resolve) => {
      const dialog = $("driverStatusConfirmDialog");
      const title = $("driverStatusConfirmTitle");
      const text = $("driverStatusConfirmText");
      const reason = $("driverStatusConfirmReason");
      const confirmBtn = $("driverStatusConfirmBtn");
      const cancelBtn = $("driverStatusCancelBtn");
      const currentLabel = statusLabel(call.statusKey || call.status);
      const targetLabel = statusLabel(targetKey);
      if (!dialog || typeof dialog.showModal !== "function") {
        const ok = window.confirm("Alterar de " + currentLabel + " para " + targetLabel + "?");
        if (!ok) return resolve({ confirmed: false, reason: "" });
        const fallbackReason = backwards ? (window.prompt("Informe o motivo da correção de status:") || "") : "";
        return resolve({ confirmed: !backwards || !!fallbackReason.trim(), reason: fallbackReason.trim() });
      }
      title.textContent = backwards ? "Corrigir etapa do atendimento" : "Confirmar mudança de status";
      text.textContent = "De “" + currentLabel + "” para “" + targetLabel + "”." + (backwards ? " O motivo é obrigatório e ficará registrado na linha do tempo." : "");
      reason.value = "";
      reason.required = !!backwards;
      const cleanup = () => {
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        dialog.oncancel = null;
      };
      cancelBtn.onclick = () => { cleanup(); dialog.close(); resolve({ confirmed: false, reason: "" }); };
      dialog.oncancel = (event) => { event.preventDefault(); cleanup(); dialog.close(); resolve({ confirmed: false, reason: "" }); };
      confirmBtn.onclick = () => {
        const value = reason.value.trim();
        if (backwards && !value) {
          reason.focus();
          toast("Informe o motivo para voltar uma etapa.", "danger");
          return;
        }
        cleanup();
        dialog.close();
        resolve({ confirmed: true, reason: value });
      };
      dialog.showModal();
    });
  }

  function proofWizardStorageKey(callId) {
    return "jm-driver-proof-step:" + (state.user && state.user.uid || "anonymous") + ":" + (callId || "none");
  }

  function proofStepIndexByKey(key) {
    const index = PROOF_WIZARD_STEPS.findIndex((step) => step.key === key);
    return index >= 0 ? index : 0;
  }

  function proofStepForCallStatus(call) {
    const key = statusKey(call && (call.statusKey || call.status));
    if (["despachado", "motorista_a_caminho", "motorista_no_local"].includes(key)) return 0;
    if (key === "veiculo_carregado") return 2;
    if (key === "em_transporte") return 3;
    if (key === "entregue") return 4;
    if (key === "finalizado") return 5;
    return 0;
  }

  function directProofChild(element) {
    const form = $("driverProofForm");
    let node = element;
    while (node && node.parentElement && node.parentElement !== form) node = node.parentElement;
    return node && node.parentElement === form ? node : null;
  }

  function markProofElementStep(id, stepKey) {
    const element = $(id);
    if (!element) return;
    const child = directProofChild(element);
    if (child) {
      if (child.dataset.proofStep && child.dataset.proofStep !== stepKey) {
        delete child.dataset.proofStep;
        child.dataset.proofCommon = "true";
      } else if (!child.dataset.proofCommon) {
        child.dataset.proofStep = stepKey;
      }
      let fieldContainer = element.closest("div");
      if (fieldContainer && fieldContainer !== child && child.contains(fieldContainer)) {
        fieldContainer.dataset.proofStepFieldContainer = stepKey;
      }
    }
    element.dataset.proofStepField = stepKey;
  }

  function setupProofWizardLayout() {
    const form = $("driverProofForm");
    if (!form || form.dataset.wizardReady === "true") return;
    form.dataset.wizardReady = "true";
    const callSelect = directProofChild($("driverProofCall"));
    if (callSelect) callSelect.dataset.proofCommon = "true";
    Object.entries(PROOF_INPUT_STEP_MAP).forEach(([id, step]) => markProofElementStep(id, step));
    ["proofSavedEvidenceSummary", "proofUploadQueue", "driverProofStatus"].forEach((id) => {
      const child = directProofChild($(id));
      if (child) child.dataset.proofCommon = "true";
    });
    const actions = form.querySelector(".proof-wizard-actions");
    if (actions) actions.dataset.proofCommon = "true";
    Array.from(form.children).forEach((child) => {
      if (!child.dataset.proofStep && !child.dataset.proofCommon) {
        const title = String(child.textContent || "").toLowerCase();
        if (title.includes("mapa de avarias")) child.dataset.proofStep = "inspecao";
        else if (title.includes("antes de carregar")) child.dataset.proofStep = "inspecao";
        else if (title.includes("carregado no guincho")) child.dataset.proofStep = "carregamento";
        else if (title.includes("depois de descarregar")) child.dataset.proofStep = "entrega";
        else if (title.includes("áudios")) child.dataset.proofStep = "finalizacao";
        else child.dataset.proofCommon = "true";
      }
    });
    setupProofFilePreviews();
    renderProofWizard();
  }

  function proofStepCompleted(call, stepKey) {
    const checklist = call && call.proofChecklist || {};
    if (stepKey === "inspecao") {
      const inspection = checklist.vehicleInspection || {};
      return !!(inspection.fuelLevel || inspection.odometer || inspection.tireCondition || (checklist.damageAssessment && checklist.damageAssessment.parts && checklist.damageAssessment.parts.length) || ["front", "rear", "right", "left", "dashboard"].some((type) => hasPhotoType(call, type)));
    }
    const phase = (PROOF_WIZARD_STEPS.find((step) => step.key === stepKey) || {}).phase;
    return !!(phase && checklist[phase] && checklist[phase].status && checklist[phase].status !== "pendente");
  }

  function renderProofWizard() {
    const call = selectedCall();
    const maxIndex = PROOF_WIZARD_STEPS.length - 1;
    state.proofWizardStep = Math.max(0, Math.min(maxIndex, Number(state.proofWizardStep || 0)));
    const step = PROOF_WIZARD_STEPS[state.proofWizardStep];
    const title = $("proofWizardTitle");
    const counter = $("proofWizardCounter");
    const fill = $("proofWizardProgressFill");
    const tabs = $("proofWizardTabs");
    const summary = $("proofWizardSummary");
    if (title) title.textContent = (state.proofWizardStep + 1) + ". " + step.label;
    if (counter) counter.textContent = "Etapa " + (state.proofWizardStep + 1) + " de " + PROOF_WIZARD_STEPS.length;
    if (fill) fill.style.width = ((state.proofWizardStep + 1) / PROOF_WIZARD_STEPS.length * 100) + "%";
    if (tabs) tabs.innerHTML = PROOF_WIZARD_STEPS.map((item, index) => {
      const completed = call && proofStepCompleted(call, item.key);
      const cls = index === state.proofWizardStep ? "active" : completed ? "done" : "";
      return `<button type="button" role="tab" aria-selected="${index === state.proofWizardStep}" class="proof-wizard-tab ${cls}" data-proof-index="${index}"><i>${completed ? "✓" : index + 1}</i><span>${esc(item.short)}</span></button>`;
    }).join("");
    document.querySelectorAll("#driverProofForm > [data-proof-step]").forEach((element) => {
      element.classList.toggle("proof-step-visible", element.dataset.proofStep === step.key);
    });
    document.querySelectorAll("[data-proof-step-field]").forEach((element) => {
      element.classList.toggle("proof-field-visible", element.dataset.proofStepField === step.key);
    });
    document.querySelectorAll("[data-proof-step-field-container]").forEach((element) => {
      element.classList.toggle("proof-field-container-visible", element.dataset.proofStepFieldContainer === step.key);
    });
    const completedCount = call ? PROOF_WIZARD_STEPS.filter((item) => proofStepCompleted(call, item.key)).length : 0;
    if (summary) summary.textContent = call
      ? completedCount + " de " + PROOF_WIZARD_STEPS.length + " etapas possuem dados salvos. Use “Salvar rascunho” antes de sair da tela."
      : "Selecione o atendimento para carregar o progresso.";
    const prev = $("driverProofPrevBtn");
    const next = $("driverProofNextBtn");
    const submit = $("driverSubmitProofBtn");
    if (prev) prev.disabled = state.proofWizardStep === 0 || !call;
    if (next) {
      next.disabled = state.proofWizardStep === maxIndex || !call;
      next.classList.toggle("hidden", state.proofWizardStep === maxIndex);
    }
    if (submit) submit.classList.toggle("hidden", state.proofWizardStep !== maxIndex);
    if (call) {
      try { localStorage.setItem(proofWizardStorageKey(call.id), String(state.proofWizardStep)); } catch (_) {}
    }
  }

  function setProofWizardStep(index, options) {
    const call = selectedCall();
    if (!call) return toast("Selecione o atendimento atual antes de abrir o checklist.", "danger");
    state.proofWizardStep = Math.max(0, Math.min(PROOF_WIZARD_STEPS.length - 1, Number(index || 0)));
    renderProofWizard();
    if (!options || options.scroll !== false) {
      const wizard = $("driverProofWizard");
      if (wizard) wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function restoreProofWizardStep(call) {
    let index = proofStepForCallStatus(call);
    try {
      const stored = Number(localStorage.getItem(proofWizardStorageKey(call && call.id)));
      if (Number.isInteger(stored) && stored >= 0 && stored < PROOF_WIZARD_STEPS.length) index = stored;
    } catch (_) {}
    state.proofWizardStep = index;
    renderProofWizard();
  }

  function proofUploadItemKey(inputId, file, index) {
    return inputId + ":" + (file && file.name || "arquivo") + ":" + (file && file.size || 0) + ":" + (index || 0);
  }

  function setProofUploadItem(key, data) {
    proofUploadState.set(key, Object.assign({}, proofUploadState.get(key) || {}, data || {}));
    renderProofUploadQueue();
  }

  function clearProofPreviewUrls() {
    proofPreviewUrls.forEach((url) => { try { URL.revokeObjectURL(url); } catch (_) {} });
    proofPreviewUrls.clear();
  }

  function setupProofFilePreviews() {
    const inputs = REQUIRED_PHOTOS.map((item) => $(item.input)).filter(Boolean);
    const audio = $("proofAudioFiles");
    if (audio) inputs.push(audio);
    inputs.forEach((input) => {
      if (input.dataset.previewBound === "true") return;
      input.dataset.previewBound = "true";
      input.addEventListener("change", () => {
        Array.from(proofUploadState.keys()).filter((key) => key.startsWith(input.id + ":")).forEach((key) => proofUploadState.delete(key));
        const files = Array.from(input.files || []);
        files.forEach((file, index) => {
          const key = proofUploadItemKey(input.id, file, index);
          let previewUrl = "";
          try {
            previewUrl = URL.createObjectURL(file);
            proofPreviewUrls.set(key, previewUrl);
          } catch (_) {}
          setProofUploadItem(key, {
            key,
            inputId: input.id,
            name: file.name || "arquivo",
            type: file.type || "",
            size: file.size || 0,
            previewUrl,
            status: "selected",
            progress: 0
          });
        });
        renderProofUploadQueue();
      });
    });
  }

  function renderProofUploadQueue() {
    const box = $("proofUploadQueue");
    if (!box) return;
    const items = Array.from(proofUploadState.values());
    if (!items.length) {
      box.innerHTML = '<span class="muted small">Os arquivos escolhidos aparecerão aqui com miniatura, tamanho e progresso individual.</span>';
      return;
    }
    box.innerHTML = items.map((item) => {
      const isImage = /^image\//i.test(item.type || "");
      const isAudio = /^audio\//i.test(item.type || "");
      const statusLabelText = {
        selected: "Selecionado",
        compressing: "Preparando",
        uploading: "Enviando",
        success: "Salvo",
        error: "Falhou"
      }[item.status] || item.status || "Aguardando";
      const media = isImage && item.previewUrl ? `<img src="${esc(item.previewUrl)}" alt="Prévia ${esc(item.name)}">` : isAudio && item.previewUrl ? `<audio controls preload="metadata" src="${esc(item.previewUrl)}"></audio>` : '<span class="proof-file-icon">ARQ</span>';
      return `<article class="proof-upload-card ${esc(item.status || "selected")}">
        <div class="proof-upload-media">${media}</div>
        <div class="proof-upload-info"><strong>${esc(item.name)}</strong><small>${Math.max(1, Math.round((item.size || 0) / 1024))} KB · ${esc(statusLabelText)}</small>
          <div class="proof-upload-progress"><span style="width:${Math.max(0, Math.min(100, Number(item.progress || 0)))}%"></span></div>
          ${item.error ? `<em>${esc(item.error)}</em>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function renderSavedEvidenceSummary(call) {
    const box = $("proofSavedEvidenceSummary");
    if (!box) return;
    if (!call) {
      box.innerHTML = '<strong>Evidências já salvas</strong><span class="muted small">Nenhuma evidência carregada para este atendimento.</span>';
      return;
    }
    const photos = proofPhotos(call);
    const audios = proofAudios(call);
    const signatures = Object.values(call.phaseSignatures || {}).filter(Boolean).length + (call.customerSignature ? 1 : 0);
    box.innerHTML = `<strong>Evidências já salvas</strong><div class="proof-saved-stats"><span>${photos.length} foto(s)</span><span>${audios.length} áudio(s)</span><span>${signatures} assinatura(s)/aceite(s)</span><span>Status: ${esc(call.proofStatus || proofStatusFor(call))}</span></div>`;
  }

  function getMediaDuration(file) {
    return new Promise((resolve) => {
      if (!file || !/^audio\//i.test(file.type || "")) return resolve(0);
      const audio = document.createElement("audio");
      const url = URL.createObjectURL(file);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      audio.src = url;
    });
  }

  function selectedCall() {
    return state.selectedCallId && state.calls[state.selectedCallId] || null;
  }

  function selectedCallVehicleId() {
    const call = selectedCall();
    return call && (call.vehicleId || call.vehicle || call.truckId || "") || "";
  }

  function activeCallStorageKey() {
    return "jm-driver-active-call:" + (state.user && state.user.uid || "anonymous");
  }

  function persistActiveCall(id) {
    try {
      if (id) localStorage.setItem(activeCallStorageKey(), id);
      else localStorage.removeItem(activeCallStorageKey());
    } catch (_) {}
  }

  function restoreActiveCallFromStorage() {
    if (state.activeCallRestored || !state.callsLoaded) return;
    state.activeCallRestored = true;
    let saved = "";
    try { saved = localStorage.getItem(activeCallStorageKey()) || ""; } catch (_) {}
    const call = saved && state.calls[saved];
    if (call && !isFinalStatus(call) && !call.deletedAt) state.selectedCallId = saved;
    else if (saved) persistActiveCall("");
  }

  function requireActiveCall(actionLabel) {
    const call = selectedCall();
    if (call) return call;
    const label = actionLabel || "continuar";
    toast("Selecione conscientemente o atendimento atual antes de " + label + ".", "danger");
    const panel = $("driverPanelActive");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    return null;
  }

  function setPendingOperations(delta, label) {
    state.pendingOperations = Math.max(0, Number(state.pendingOperations || 0) + Number(delta || 0));
    renderDriverConnectivity(label || "");
  }

  function renderDriverConnectivity(label) {
    const online = navigator.onLine !== false;
    state.networkOnline = online;
    const network = $("driverNetworkStatus");
    const sync = $("driverSyncStatus");
    if (network) {
      network.textContent = online ? "Online" : "Offline";
      network.className = "driver-runtime-chip " + (online ? "ok" : "danger");
    }
    if (sync) {
      if (state.pendingOperations > 0) {
        sync.textContent = state.pendingOperations + " envio(s) em andamento" + (label ? " · " + label : "");
        sync.className = "driver-runtime-chip warn";
      } else if (!online) {
        sync.textContent = "Sem conexão · não feche a página";
        sync.className = "driver-runtime-chip danger";
      } else {
        sync.textContent = "Sem envios pendentes";
        sync.className = "driver-runtime-chip ok";
      }
    }
  }

  function syncActiveCallForms() {
    const call = selectedCall();
    const callId = call && call.id || "";
    const vehicleId = call && (call.vehicleId || call.vehicle || call.truckId || "") || "";
    ["driverLocationCall", "driverExpenseCall", "driverReportCall", "driverProofCall"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      if (callId && Array.from(el.options || []).some((opt) => opt.value === callId)) el.value = callId;
      else el.value = "";
      el.disabled = true;
      el.setAttribute("aria-readonly", "true");
    });
    const locationVehicle = $("driverLocationVehicle");
    if (locationVehicle) {
      if (vehicleId && Array.from(locationVehicle.options || []).some((opt) => opt.value === vehicleId)) locationVehicle.value = vehicleId;
      else if (!callId) locationVehicle.value = "";
      locationVehicle.disabled = !!vehicleId || !callId;
    }
    const expenseVehicle = $("driverExpenseVehicle");
    if (expenseVehicle) {
      if (vehicleId && Array.from(expenseVehicle.options || []).some((opt) => opt.value === vehicleId)) expenseVehicle.value = vehicleId;
      else if (!callId) expenseVehicle.value = "";
      expenseVehicle.disabled = !!vehicleId || !callId;
    }
  }

  function updateContextLockState() {
    const hasCall = !!selectedCall();
    ["driverExpenseForm", "driverReportForm", "driverProofForm"].forEach((formId) => {
      const form = $(formId);
      if (!form) return;
      form.classList.toggle("driver-context-locked", !hasCall);
      Array.from(form.querySelectorAll("input,select,textarea,button")).forEach((control) => {
        if (control.matches("[data-active-call-select]")) {
          control.disabled = true;
          return;
        }
        control.disabled = !hasCall;
      });
    });
    document.querySelectorAll("[data-context-notice]").forEach((notice) => {
      notice.classList.toggle("ok", hasCall);
      notice.textContent = hasCall
        ? "Vinculado ao atendimento atual. Para trocar, use o botão ‘Trocar atendimento’."
        : "Selecione o atendimento atual para liberar este módulo.";
    });
    updateGpsButtons();
  }

  function renderActiveCall() {
    const call = selectedCall();
    const box = $("driverActiveCallBox");
    const header = $("driverHeaderActiveCall");
    const routeBtn = $("driverActiveRouteBtn");
    const startBtn = $("driverActiveStartRouteBtn");
    const statusSelect = $("driverQuickStatus");
    const statusBtn = $("driverApplyStatusBtn");
    const clearBtn = $("driverClearActiveCallBtn");
    const controls = [routeBtn, startBtn, statusSelect, statusBtn, clearBtn].filter(Boolean);

    if (!call) {
      if (box) box.innerHTML = '<div class="driver-empty-state"><strong>Nenhum atendimento selecionado</strong><span>Escolha um chamado em “Meus chamados” antes de ligar GPS, alterar status, enviar provas ou lançar despesas.</span></div>';
      if (header) {
        header.textContent = "Nenhum atendimento selecionado";
        header.className = "driver-runtime-chip muted";
      }
      controls.forEach((control) => { control.disabled = true; });
      renderStatusGuide(null);
      refreshQuickStatusOptions(null);
      renderSavedEvidenceSummary(null);
      renderProofWizard();
      syncActiveCallForms();
      updateContextLockState();
      return;
    }

    const vehicle = state.vehicles[call.vehicleId] || {};
    const origin = call.origem && call.origem.label || call.originLabel || "Origem pendente";
    const destination = call.destino && call.destino.label || call.destLabel || "Destino pendente";
    if (box) box.innerHTML = `
      <div class="driver-active-call-head">
        <div><span class="driver-eyebrow">Protocolo</span><strong>${esc(call.protocolo || call.id)}</strong></div>
        <span class="badge ${statusClass(call)}">${esc(statusLabel(call))}</span>
      </div>
      <div class="driver-active-call-grid">
        <div><span>Cliente / beneficiário</span><b>${esc(call.beneficiary || call.cliente || call.customerName || "Não informado")}</b></div>
        <div><span>Veículo atendido</span><b>${esc(call.customerPlate || "-")} ${call.customerVehicle ? "· " + esc(call.customerVehicle) : ""}</b></div>
        <div><span>Guincho / frota</span><b>${esc(vehicle.placa || call.vehiclePlate || call.vehicleId || "Não vinculado")}</b></div>
        <div><span>Origem</span><b>${esc(origin)}</b></div>
        <div><span>Destino</span><b>${esc(destination)}</b></div>
      </div>`;
    if (header) {
      header.textContent = "Ativo: " + (call.protocolo || call.cliente || call.id);
      header.className = "driver-runtime-chip ok";
    }
    controls.forEach((control) => { control.disabled = false; });
    const currentStatusKey = statusKey(call.statusKey || call.status);
    if (startBtn) {
      const alreadyStarted = statusFlowIndex(currentStatusKey) >= statusFlowIndex("motorista_a_caminho");
      startBtn.disabled = alreadyStarted;
      startBtn.textContent = alreadyStarted ? "Deslocamento iniciado" : "Iniciar deslocamento";
    }
    renderStatusGuide(call);
    refreshQuickStatusOptions(call);
    renderSavedEvidenceSummary(call);
    syncActiveCallForms();
    updateContextLockState();
  }

  async function setActiveCall(id, options) {
    const call = id && state.calls[id];
    if (!call || isFinalStatus(call) || call.deletedAt) {
      toast("Este chamado não está disponível como atendimento ativo.", "danger");
      return null;
    }
    if (driverLocationWatchId != null && state.selectedCallId && state.selectedCallId !== id) {
      await stopDriverPhoneLocation({ silent: true, preserveCallId: state.selectedCallId });
    }
    state.selectedCallId = id;
    persistActiveCall(id);
    renderActiveCall();
    restoreProofWizardStep(call);
    renderCalls();
    renderExpenseSelects();
    scheduleMapRender(80);
    if (!options || options.toast !== false) toast("Atendimento atual selecionado: " + (call.protocolo || call.cliente || id) + ".", "ok");
    if (options && options.scroll) {
      const panel = $(options.scroll);
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return call;
  }

  async function clearActiveCall(options) {
    if (driverLocationWatchId != null) await stopDriverPhoneLocation({ silent: true });
    state.selectedCallId = "";
    persistActiveCall("");
    renderActiveCall();
    state.proofWizardStep = 0;
    renderProofWizard();
    clearProofPreviewUrls();
    proofUploadState.clear();
    renderProofUploadQueue();
    renderCalls();
    renderExpenseSelects();
    scheduleMapRender(80);
    if (!options || options.toast !== false) toast("Atendimento atual liberado. Selecione outro chamado para continuar.", "ok");
  }

  function driverCallsForMap() {
    const call = selectedCall();
    if (!call) return {};
    return { [call.id]: call };
  }

  function vehicleLivePoint(vehicle) {
    return pointFrom(vehicle && (
      vehicle.location ||
      vehicle.lastLocation ||
      vehicle.lastKnownLocation ||
      vehicle.trackerLocation ||
      vehicle.trackerLastLocation ||
      vehicle.trackerPosition ||
      vehicle.lastPosition ||
      vehicle.mobileLocation ||
      vehicle.driverPhoneLocation ||
      vehicle.phoneLocation
    ));
  }

  function driverVehiclesForMap() {
    const out = Object.assign({}, state.vehicles || {});
    Object.entries(out).forEach(([id, vehicle]) => {
      const lastPoint = vehicleLivePoint(vehicle);
      if (lastPoint && !pointFrom(vehicle && vehicle.location)) {
        out[id] = Object.assign({}, vehicle, {
          location: lastPoint,
          trackerStatus: vehicle.trackerStatus || "Última localização conhecida",
          lastTrackerAt: vehicle.lastTrackerAt || vehicle.trackerLastUpdateAt || vehicle.updatedAt || ""
        });
      }
    });
    const call = selectedCall();
    const vehicleId = (call && (call.vehicleId || call.vehicle || call.truckId || "")) || ($("driverLocationVehicle") && $("driverLocationVehicle").value) || "";
    const phone = state.driverLivePoint || pointFrom(call && (call.driverPhoneLocation || call.mobileLocation || call.driverLocation));
    if (!phone || !vehicleId) return out;
    const base = out[vehicleId] || { id: vehicleId, placa: call.vehiclePlate || vehicleId };
    const hasTracker = !!vehicleLivePoint(base) && !String(base.gpsSource || base.trackerStatus || "").includes("driver_phone");
    if (!hasTracker) {
      out[vehicleId] = Object.assign({}, base, {
        location: phone,
        mobileLocation: phone,
        driverPhoneLocation: phone,
        gpsSource: "driver_phone_local",
        trackerStatus: "GPS celular motorista",
        lastPhoneGpsAt: phone.capturedAt || phone.updatedAt || ""
      });
      return out;
    }
    out[vehicleId + "__celular_motorista"] = Object.assign({}, base, {
      id: vehicleId + "__celular_motorista",
      realVehicleId: vehicleId,
      placa: (base.placa || vehicleId) + " - celular",
      apelido: "GPS celular do motorista",
      location: phone,
      mobileLocation: phone,
      driverPhoneLocation: phone,
      gpsSource: "driver_phone_local",
      trackerStatus: "GPS celular motorista",
      lastPhoneGpsAt: phone.capturedAt || phone.updatedAt || "",
      activeCallId: call.id
    });
    return out;
  }

  function setDriverRouteStatus(message, type) {
    const box = $("driverRouteStatus");
    if (!box) return;
    box.textContent = message;
    box.className = "driver-route-status " + (type || "muted");
  }

  function focusCallRoute(id, scroll) {
    const call = state.calls[id];
    if (!call) return toast("Chamado não encontrado para mostrar rota.", "danger");
    if (state.selectedCallId !== id) return toast("Selecione este atendimento antes de abrir a rota.", "danger");
    setDriverRouteStatus("Rota interna focada: " + (call.protocolo || call.cliente || id) + ". Ative o GPS do celular para acompanhar sua posição ao vivo no mapa.", "ok");
    scheduleMapRender();
    if (scroll !== false) {
      const mapPanel = $("driverPanelMap");
      if (mapPanel) mapPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function shouldPersistDriverGps(callId, pos, force, vehicleId) {
    if (force) return true;
    const now = Date.now();
    const lat = Number(pos && pos.coords && pos.coords.latitude);
    const lng = Number(pos && pos.coords && pos.coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const trackId = callId || vehicleId || "driver";
    if (!lastDriverPhoneWrite || lastDriverPhoneWrite.callId !== trackId) return true;
    const gps = activeMobileGpsSettings();
    const elapsed = now - lastDriverPhoneWrite.at;
    const moved = window.JM.utils.haversineKm({ lat, lng }, { lat: lastDriverPhoneWrite.lat, lng: lastDriverPhoneWrite.lng }) * 1000;
    return elapsed >= Math.max(5000, Number(gps.minIntervalMs || 20000)) || moved >= Math.max(5, Number(gps.minDistanceMeters || 25));
  }

  function proofPhotos(call) {
    return Array.isArray(call && call.proofPhotos) ? call.proofPhotos.filter(Boolean) : [];
  }

  function proofAudios(call) {
    return Array.isArray(call && call.proofAudios) ? call.proofAudios.filter(Boolean) : [];
  }

  function hasPhotoType(call, type) {
    return proofPhotos(call).some((photo) => photo && photo.type === type && photo.cloudinaryUrl);
  }

  function hasCompleteChecklist(call) {
    const checklist = call && call.proofChecklist || {};
    return PROOF_STAGES.every((stage) => checklist[stage] && checklist[stage].status && checklist[stage].status !== "pendente");
  }

  function hasSignature(call) {
    const signature = call && call.customerSignature || {};
    const phases = call && call.phaseSignatures || {};
    return !!(
      ((signature.signatureUrl || signature.cloudinaryUrl) && signature.acceptedText) ||
      (signature.refused && signature.refusalReason && signature.acceptedText) ||
      ["retirada", "entrega", "finalizacao"].some((phase) => {
        const item = phases[phase] || {};
        return ((item.signatureUrl || item.cloudinaryUrl) && item.acceptedText) || (item.refused && item.refusalReason && item.acceptedText);
      })
    );
  }

  function phaseAccepted(call, phase) {
    const checklist = call && call.proofChecklist || {};
    const row = checklist[phase] || {};
    if (!row || row.status === "pendente") return false;
    const phases = call && call.phaseSignatures || {};
    const item = phases[phase] || {};
    const fallback = (phase === "entrega" || phase === "finalizacao") ? (call && call.customerSignature || {}) : {};
    return !!(
      row.justificativa ||
      ((item.signatureUrl || item.cloudinaryUrl) && item.acceptedText) ||
      (item.refused && item.refusalReason && item.acceptedText) ||
      ((fallback.signatureUrl || fallback.cloudinaryUrl) && fallback.acceptedText) ||
      (fallback.refused && fallback.refusalReason && fallback.acceptedText)
    );
  }

  function hasOperationalPhaseAcceptances(call) {
    return ["retirada", "entrega", "finalizacao"].every((phase) => phaseAccepted(call, phase));
  }

  function proofStatusFor(call) {
    if (!call) return "pendente";
    const checklist = call.proofChecklist || {};
    const requiredPhotos = requiredProofPhotosForChecklist(checklist);
    const missingPhotos = requiredPhotos.filter((photo) => !hasPhotoType(call, photo.key)).length;
    if (missingPhotos === 0 && hasCompleteChecklist(call) && hasOperationalPhaseAcceptances(call)) return "completo";
    if (proofPhotos(call).length || proofAudios(call).length || call.proofChecklist || call.customerSignature) return "parcial";
    return "pendente";
  }

  function publicStatusLabel(callOrStatus) {
    const key = statusKey(callOrStatus);
    const labels = {
      aguardando_despacho: "Atendimento recebido",
      aguardando_validacao_rota: "Endereço em validação",
      despachado: "Guincho em preparação",
      motorista_a_caminho: "Motorista a caminho",
      motorista_no_local: "Motorista chegou ao local",
      veiculo_carregado: "Veículo carregado",
      em_transporte: "Veículo em remoção/transporte",
      entregue: "Veículo entregue",
      finalizado: "Atendimento finalizado",
      cancelado: "Atendimento cancelado"
    };
    return labels[key] || "Atendimento recebido";
  }

  async function syncPublicCallFromDriver(call, extra) {
    const merged = Object.assign({}, call || {});
    Object.entries(extra || {}).forEach(([key, value]) => {
      if (key === "timeline" && !Array.isArray(value)) return;
      merged[key] = value;
    });
    call = merged;
    if (!call.publicToken || call.publicRevoked) return;
    const photos = call.publicProofsEnabled ? (Array.isArray(call.proofPhotos) ? call.proofPhotos : []).filter((p) => p && p.cloudinaryUrl).map((p) => ({
      label: p.label || p.type || "Foto",
      url: p.cloudinaryUrl,
      type: p.type || "",
      uploadedAt: p.uploadedAt || "",
      resourceType: "image"
    })) : [];
    const audios = call.publicProofsEnabled ? (Array.isArray(call.proofAudios) ? call.proofAudios : []).filter((a) => a && a.cloudinaryUrl && (a.approvedForClient === true || ["client", "public"].includes(String(a.visibility || "").toLowerCase()) || call.publicProofsEnabled === true)).map((a) => ({
      label: a.label || a.filename || "Áudio",
      url: a.cloudinaryUrl,
      type: a.type || "audio",
      uploadedAt: a.uploadedAt || "",
      resourceType: "audio",
      duration: a.duration || 0,
      bytes: a.bytes || 0
    })) : [];
    await db.collection("publicCalls").doc(call.publicToken).set({
      publicToken: call.publicToken,
      callId: call.id,
      companyName: "JM Guinchos",
      statusPublic: publicStatusLabel(call.statusKey || call.status),
      statusKey: statusKey(call.statusKey || call.status),
      serviceType: call.serviceType || call.tipo || "Guincho",
      clientNameMasked: call.cliente || call.customerName || "Cliente",
      vehiclePlateMasked: call.customerPlate || "",
      customerVehicle: call.customerVehicle || "",
      timelinePublic: Array.isArray(call.timeline) ? call.timeline.slice(-20) : [],
      proofsPublic: photos.concat(audios),
      damageAssessmentPublic: call.publicProofsEnabled ? (call.damageAssessment || call.proofChecklist && call.proofChecklist.damageAssessment || null) : null,
      customerSignaturePublic: call.publicProofsEnabled ? (call.customerSignature || null) : null,
      phaseSignaturesPublic: call.publicProofsEnabled ? (call.phaseSignatures || {}) : {},
      reportEnabled: call.publicReportEnabled !== false,
      chatEnabled: call.publicChatEnabled !== false,
      paymentNegotiationEnabled: call.publicPaymentNegotiationEnabled === true,
      updatedAt: new Date().toISOString(),
      revoked: false
    }, { merge: true });
  }

  function proofBadge(call) {
    const status = call && (call.proofStatus || proofStatusFor(call)) || "pendente";
    const cls = status === "revisado" || status === "completo" ? "ok" : status === "parcial" ? "warn" : "danger";
    return `<span class="badge ${cls}">Provas: ${esc(status)}</span>`;
  }

  function callDisplayName(call) {
    if (!call) return "";
    return call.insurance || call.billingParty || call.cliente || call.customerName || call.protocolo || "";
  }

  function callProtocolLabel(call, fallbackId) {
    return call && (call.protocolo || call.insuranceProtocol || call.id) || fallbackId || "";
  }

  function normalizeCostText(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function isVehicleCostType(type, notes) {
    const text = normalizeCostText(String(type || "") + " " + String(notes || ""));
    return /combustivel|diesel|gasolina|etanol|arla|pedagio|estacionamento|lavagem|alimentacao|manutenc|revis|oleo|pneu|freio|suspens|eletric|borrachar|mecanica|motor|cambio|guincho|munck|plataforma|peca|pecas/.test(text);
  }

  function isMaintenanceExpenseType(type, notes) {
    const text = normalizeCostText(String(type || "") + " " + String(notes || ""));
    return /manutenc|revis|oleo|pneu|freio|suspens|eletric|mecanica|motor|cambio|guincho|munck|plataforma|borrachar|peca|pecas/.test(text);
  }

  function vehicleCostKind(type, notes) {
    return isMaintenanceExpenseType(type, notes) ? "maintenance" : isVehicleCostType(type, notes) ? "operational" : "general";
  }


  function syncDriverExpenseContext() {
    const callId = $("driverExpenseCall") && $("driverExpenseCall").value;
    const call = callId && state.calls[callId];
    const vehicleSelect = $("driverExpenseVehicle");
    const box = $("driverExpenseContext");
    if (!vehicleSelect) return;
    if (call && call.vehicleId) {
      vehicleSelect.value = call.vehicleId;
      const vehicle = state.vehicles[call.vehicleId] || {};
      if (box) box.innerHTML = `Vinculado automaticamente ao chamado <b>${esc(callProtocolLabel(call, callId))}</b>, veículo <b>${esc(vehicle.placa || call.vehicleId)}</b> e pagador <b>${esc(callDisplayName(call) || "não informado")}</b>.`;
    } else if (box) {
      box.textContent = callId ? "Chamado sem veículo definido. Selecione o veículo manualmente." : "Escolha um chamado para puxar veículo, protocolo e seguradora automaticamente.";
    }
  }

  function mergeNonEmpty(base, override) {
    const out = Object.assign({}, base || {});
    Object.entries(override || {}).forEach(([key, value]) => {
      if (value === "" || value == null) return;
      out[key] = value;
    });
    return out;
  }

  function activeCloudinaryConfig() {
    return mergeNonEmpty(cfg.cloudinary || {}, state.settings.cloudinary || {});
  }

  function activeMobileGpsSettings() {
    const base = mergeNonEmpty(cfg.mobileGps || {}, state.settings.mobileGps || {});
    return Object.assign({ enabled: true, backend: "realtime_database", databaseURL: "https://frvalencio-default-rtdb.firebaseio.com", pollingMs: 10000, minIntervalMs: 20000, minDistanceMeters: 25 }, base || {});
  }

  function isMobileGpsEnabled() {
    const gps = activeMobileGpsSettings();
    return gps.enabled === true || gps.enabled === "true";
  }

  function isMobileGpsRealtime() {
    const gps = activeMobileGpsSettings();
    return isMobileGpsEnabled() && String(gps.backend || "firestore") === "realtime_database" && !!String(gps.databaseURL || "").trim();
  }

  function updateGpsButtons() {
    const enabled = isMobileGpsEnabled();
    const hasCall = !!selectedCall();
    const active = driverLocationWatchId != null;
    const start = $("driverStartLocationBtn");
    const stop = $("driverStopLocationBtn");
    if (start) {
      start.disabled = !enabled || !hasCall || active;
      start.textContent = active ? "Localização ativa" : "Ativar localização";
    }
    if (stop) stop.disabled = !active;
    document.querySelectorAll("[data-mobile-gps-only]").forEach((el) => {
      el.classList.remove("hidden");
      if (el.tagName === "BUTTON") el.disabled = !enabled || !hasCall || active;
    });
  }

  async function inspectLocationPermission() {
    if (!navigator.permissions || !navigator.permissions.query) return;
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") {
        state.gpsState = "permission-denied";
        setDriverLocationStatus("Permissão de localização bloqueada no navegador. Abra as permissões do site e permita Localização.", "danger");
      } else if (permission.state === "prompt" && driverLocationWatchId == null) {
        state.gpsState = "permission-prompt";
        setDriverLocationStatus("GPS disponível. Ao ativar, o navegador solicitará permissão de localização.", "warn");
      }
      permission.onchange = () => applyMobileGpsVisibility();
    } catch (_) {}
  }

  function applyMobileGpsVisibility() {
    const enabled = isMobileGpsEnabled();
    const panel = $("driverPanelLocation");
    if (panel) {
      panel.classList.remove("hidden");
      panel.dataset.gpsAvailability = enabled ? "enabled" : "disabled";
    }
    document.querySelectorAll("[data-mobile-gps-only]").forEach((el) => el.classList.remove("hidden"));
    if (!enabled) {
      state.gpsState = "disabled-company";
      if (driverLocationWatchId != null) stopDriverPhoneLocation({ silent: true });
      setDriverLocationStatus("GPS do celular desativado pela empresa. O rastreador do veículo continua sendo usado quando disponível.", "muted");
    } else if (!state.settingsLoaded) {
      state.gpsState = "checking";
      setDriverLocationStatus("GPS disponível. Carregando a configuração operacional...", "warn");
    } else if (!selectedCall()) {
      state.gpsState = "waiting-call";
      setDriverLocationStatus("GPS disponível. Selecione o atendimento atual para liberar a localização.", "warn");
    } else if (driverLocationWatchId == null && state.gpsState !== "permission-denied") {
      state.gpsState = "ready";
      setDriverLocationStatus("GPS pronto. Toque em Ativar localização para vincular a posição ao atendimento atual.", "ok");
    }
    updateGpsButtons();
    inspectLocationPermission();
  }

  function setProofSubmitStatus(message, type, alsoToast) {
    const box = $("driverProofStatus");
    const kind = type || "info";
    if (box) {
      box.textContent = message;
      box.className = "wide proof-submit-status " + kind;
      box.hidden = false;
      try { box.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) {}
    }
    if (alsoToast !== false) toast(message, kind === "success" ? "ok" : kind);
  }

  function requiredProofPhotosForChecklist(checklist) {
    checklist = checklist || {};
    const required = [];
    const add = (keys) => keys.forEach((key) => {
      const photo = REQUIRED_PHOTOS.find((item) => item.key === key);
      if (photo && !required.some((item) => item.key === key)) required.push(photo);
    });
    if (checklist.retirada && !["pendente", "justificado"].includes(checklist.retirada.status)) add(["front", "rear", "right", "left", "dashboard"]);
    if (checklist.carregamento && !["pendente", "justificado"].includes(checklist.carregamento.status)) add(["front", "rear", "right", "left", "dashboard", "load_after"]);
    if (checklist.entrega && !["pendente", "justificado"].includes(checklist.entrega.status)) add(["delivery_front", "delivery_rear", "delivery_right", "delivery_left", "delivery_dashboard", "final"]);
    const hasAvaria = Object.values(checklist).some((item) => item && String(item.status || "").toLowerCase().includes("avaria"));
    if (hasAvaria) add(["damage"]);
    return required;
  }

  function proofPhotoLabelList(photos) {
    return (photos || []).map((photo) => photo.label || photo.key).join(", ");
  }

  function imageFileToCanvas(file, maxSide, quality) {
    return new Promise((resolve) => {
      if (!file || !/^image\//i.test(file.type || "")) return resolve(file);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const biggest = Math.max(width, height);
          if (!width || !height || biggest <= maxSide) {
            URL.revokeObjectURL(url);
            return resolve(file);
          }
          const scale = maxSide / biggest;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(file);
            const name = String(file.name || "foto.jpg").replace(/\.[a-z0-9]+$/i, "") + ".jpg";
            resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
          }, "image/jpeg", quality || 0.82);
        } catch (_) {
          URL.revokeObjectURL(url);
          resolve(file);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function getCurrentPositionSafe() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || null,
          capturedAt: new Date().toISOString()
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
      );
    });
  }

  function setupSignaturePad() {
    const canvas = $("signatureCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    function resizeSignatureCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const w = Math.max(320, Math.round(rect.width * dpr));
      const h = Math.max(180, Math.round((rect.height || 260) * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        const old = signaturePad && signaturePad.dirty ? canvas.toDataURL("image/png") : "";
        canvas.width = w;
        canvas.height = h;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#e6edf7";
        if (old) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
          img.src = old;
        }
      }
    }
    signaturePad = { canvas, ctx, drawing: false, dirty: false, enabled: false, pointerId: null, lastPoint: null };
    resizeSignatureCanvas();
    function setSignatureMode(enabled) {
      signaturePad.enabled = !!enabled;
      canvas.classList.toggle("is-signing", signaturePad.enabled);
      canvas.classList.toggle("is-scroll-mode", !signaturePad.enabled);
      const btn = $("toggleSignatureModeBtn");
      const hint = $("signatureModeHint");
      if (btn) {
        btn.textContent = signaturePad.enabled ? "Concluir assinatura" : "Ativar assinatura";
        btn.setAttribute("aria-pressed", signaturePad.enabled ? "true" : "false");
        btn.classList.toggle("good", signaturePad.enabled);
      }
      if (hint) {
        hint.textContent = signaturePad.enabled
          ? "Modo assinatura ativo. Assine dentro do quadro; toque em Concluir assinatura para voltar a rolar a tela normalmente."
          : "Modo assinatura desligado. Voce pode rolar a tela passando o dedo sobre a area da assinatura.";
      }
    }
    function point(evt) {
      const rect = canvas.getBoundingClientRect();
      const src = evt.touches && evt.touches[0] || evt;
      const x = Math.max(0, Math.min(rect.width, src.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, src.clientY - rect.top));
      return {
        x,
        y
      };
    }
    function start(evt) {
      if (!signaturePad.enabled) return;
      evt.preventDefault();
      resizeSignatureCanvas();
      const p = point(evt);
      signaturePad.drawing = true;
      signaturePad.dirty = true;
      signaturePad.pointerId = evt.pointerId == null ? null : evt.pointerId;
      signaturePad.lastPoint = p;
      try { if (evt.pointerId != null) canvas.setPointerCapture(evt.pointerId); } catch (_) {}
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(evt) {
      if (!signaturePad.drawing) return;
      evt.preventDefault();
      if (signaturePad.pointerId != null && evt.pointerId != null && evt.pointerId !== signaturePad.pointerId) return;
      const p = point(evt);
      const last = signaturePad.lastPoint || p;
      const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
      ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      signaturePad.lastPoint = p;
    }
    function end(evt) {
      if (evt) evt.preventDefault();
      if (signaturePad.pointerId != null && evt && evt.pointerId != null && evt.pointerId !== signaturePad.pointerId) return;
      signaturePad.drawing = false;
      signaturePad.pointerId = null;
      signaturePad.lastPoint = null;
      try { if (evt && evt.pointerId != null) canvas.releasePointerCapture(evt.pointerId); } catch (_) {}
    }
    canvas.addEventListener("pointerdown", start, { passive: false });
    canvas.addEventListener("pointermove", move, { passive: false });
    canvas.addEventListener("pointerup", end, { passive: false });
    canvas.addEventListener("pointercancel", end, { passive: false });
    canvas.addEventListener("pointerleave", end, { passive: false });
    window.addEventListener("resize", () => resizeSignatureCanvas());
    if ($("toggleSignatureModeBtn")) $("toggleSignatureModeBtn").onclick = () => setSignatureMode(!signaturePad.enabled);
    if ($("clearSignatureBtn")) $("clearSignatureBtn").onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      signaturePad.dirty = false;
      signaturePad.lastPoint = null;
    };
    setSignatureMode(false);
  }

  function signatureBlob() {
    return new Promise((resolve) => {
      if (!signaturePad || !signaturePad.dirty) return resolve(null);
      signaturePad.canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  function stageSelect(stage) {
    const cfg = PROOF_STAGE_FIELDS[stage] || {};
    return cfg.select ? $(cfg.select) : null;
  }

  function refreshStageButtons(stage) {
    const select = stageSelect(stage);
    const host = document.querySelector(`.proof-stage-buttons[data-stage="${stage}"]`);
    if (!select || !host) return;
    host.querySelectorAll("button").forEach((btn) => {
      const active = btn.dataset.value === select.value;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setProofStageValue(stage, value, touched) {
    const select = stageSelect(stage);
    if (!select) return;
    select.value = value || "pendente";
    select.dataset.touched = touched ? "true" : "false";
    refreshStageButtons(stage);
  }

  function focusStageJustification(stage, value) {
    const cfg = PROOF_STAGE_FIELDS[stage] || {};
    const needsText = ["avaria", "intercorrencia", "recusa", "justificado"].includes(String(value || ""));
    if (!needsText || !cfg.justification || !$(cfg.justification)) return;
    setTimeout(() => $(cfg.justification).focus(), 80);
  }

  function setupProofStageButtons() {
    PROOF_STAGES.forEach((stage) => {
      const select = stageSelect(stage);
      if (!select || select.dataset.buttonized === "true") return;
      select.dataset.buttonized = "true";
      select.classList.add("proof-stage-native-select");
      const host = document.createElement("div");
      host.className = "proof-stage-buttons";
      host.dataset.stage = stage;
      host.innerHTML = Array.from(select.options).map((option) => (
        `<button class="proof-stage-choice" type="button" data-value="${esc(option.value)}" aria-pressed="false">${esc(option.textContent || option.value)}</button>`
      )).join("");
      select.insertAdjacentElement("afterend", host);
      host.addEventListener("click", (event) => {
        const btn = event.target && event.target.closest && event.target.closest("button[data-value]");
        if (!btn) return;
        select.value = btn.dataset.value || "pendente";
        select.dataset.touched = "true";
        refreshStageButtons(stage);
        focusStageJustification(stage, select.value);
      });
      select.addEventListener("change", () => {
        select.dataset.touched = "true";
        refreshStageButtons(stage);
        focusStageJustification(stage, select.value);
      });
      refreshStageButtons(stage);
    });
  }

  function updateDamageSummary() {
    const summary = $("damagePartsSummary");
    if (!summary) return;
    const labels = Array.from(selectedDamageParts).map((key) => {
      const item = DAMAGE_PARTS.find((part) => part.key === key);
      const meta = selectedDamageMeta[key] || {};
      const type = DAMAGE_TYPES.find((row) => row.value === meta.type);
      const severity = DAMAGE_SEVERITIES.find((row) => row.value === meta.severity);
      const details = [type && type.label, severity && severity.label, selectedDamageNotes[key]].filter(Boolean).join(" · ");
      return (item && item.label || key) + (details ? " — " + details : "");
    });
    summary.textContent = labels.length ? "Avarias marcadas: " + labels.join(" | ") : "Nenhum ponto de avaria marcado na prancha técnica.";
  }

  function damagePartsForType(type) {
    if (String(type || "") === "caminhao") return DAMAGE_PARTS;
    return DAMAGE_PARTS.filter((part) => part.key !== "truck_bed");
  }

  function damageVehicleSvg(type) {
    const flatType = String(type || "carro").toLowerCase();
    const title = flatType === "moto" ? "MOTO" : flatType === "caminhao" ? "GUINCHO / CAMINHAO" : "AUTOMOVEL";
    const vehicleArt = flatType === "moto" ? `
      <g transform="translate(78 122)">
        <text x="0" y="-26" class="damage-svg-label">VISTA LATERAL</text>
        <ellipse cx="230" cy="268" rx="214" ry="18" class="damage-svg-shadow"/>
        <circle cx="98" cy="226" r="58" class="damage-svg-tire"/><circle cx="98" cy="226" r="22" class="damage-svg-rim"/>
        <circle cx="362" cy="226" r="58" class="damage-svg-tire"/><circle cx="362" cy="226" r="22" class="damage-svg-rim"/>
        <path d="M132 217h74l72-80h72l48 80" class="damage-svg-structure"/>
        <path d="M226 202l-38-70h70l23 66m72-64l60-52" class="damage-svg-detail"/>
        <path d="M252 126c42-28 98-27 134 2l-34 42H222z" class="damage-svg-body"/>
        <path d="M318 91h62l24 25h-84z" class="damage-svg-panel"/>
        <path d="M408 78h54" class="damage-svg-structure"/>
      </g>
      <g transform="translate(552 126)">
        <text x="0" y="-26" class="damage-svg-label">VISTA SUPERIOR</text>
        <path d="M82 217c-31-65-17-152 48-192 79 20 132 20 210 0 62 40 78 127 46 192-103 23-202 23-304 0z" class="damage-svg-outline"/>
        <path d="M150 72h166l32 76-32 74H150l-32-74z" class="damage-svg-body"/>
        <path d="M187 44h91m-116 213h140" class="damage-svg-structure"/>
        <circle cx="111" cy="132" r="18" class="damage-svg-tire"/><circle cx="355" cy="132" r="18" class="damage-svg-tire"/>
      </g>` : flatType === "caminhao" ? `
      <g transform="translate(70 116)">
        <text x="0" y="-24" class="damage-svg-label">LATERAL ESQUERDA</text>
        <ellipse cx="400" cy="288" rx="360" ry="20" class="damage-svg-shadow"/>
        <rect x="32" y="112" width="480" height="148" rx="18" class="damage-svg-body"/>
        <rect x="512" y="140" width="184" height="120" rx="24" class="damage-svg-cab"/>
        <rect x="550" y="162" width="82" height="48" rx="10" class="damage-svg-glass"/>
        <path d="M72 186h398M72 148h398M72 226h398" class="damage-svg-detail"/>
        <circle cx="130" cy="282" r="44" class="damage-svg-tire"/><circle cx="468" cy="282" r="44" class="damage-svg-tire"/><circle cx="640" cy="282" r="44" class="damage-svg-tire"/>
        <circle cx="130" cy="282" r="17" class="damage-svg-rim"/><circle cx="468" cy="282" r="17" class="damage-svg-rim"/><circle cx="640" cy="282" r="17" class="damage-svg-rim"/>
      </g>
      <g transform="translate(150 406)">
        <text x="0" y="0" class="damage-svg-caption">Marque avarias por região. Use a descrição para detalhar risco, amassado, trinca, vidro, pneu, vazamento ou item ausente.</text>
      </g>` : `
      <g transform="translate(66 84)">
        <text x="0" y="0" class="damage-svg-label">VISTA SUPERIOR</text>
        <path d="M160 74c84-52 318-52 402 0 50 92 50 255 0 347-84 54-318 54-402 0-50-92-50-255 0-347z" class="damage-svg-outline"/>
        <path d="M221 74h280l48 92-42 57H215l-42-57z" class="damage-svg-glass"/>
        <path d="M215 286h292l42 58-48 91H221l-48-91z" class="damage-svg-glass damage-svg-glass-soft"/>
        <path d="M173 166h376M173 344h376M221 74l-48 92M501 74l48 92M221 435l-48-91M501 435l48-91" class="damage-svg-detail"/>
        <circle cx="158" cy="143" r="28" class="damage-svg-tire"/><circle cx="564" cy="143" r="28" class="damage-svg-tire"/><circle cx="158" cy="366" r="28" class="damage-svg-tire"/><circle cx="564" cy="366" r="28" class="damage-svg-tire"/>
      </g>
      <g transform="translate(568 108)">
        <text x="0" y="-22" class="damage-svg-label">LATERAIS / FRENTE / TRASEIRA</text>
        <ellipse cx="154" cy="305" rx="142" ry="15" class="damage-svg-shadow"/>
        <path d="M38 178c14-54 65-84 127-84h62c58 0 103 30 125 84l18 54c-26 24-81 35-165 35H98c-78 0-133-11-160-35z" transform="translate(28 0)" class="damage-svg-body"/>
        <path d="M139 95h138l44 72H94z" class="damage-svg-glass"/>
        <path d="M72 184h286M154 95l-32 72M260 95l34 72" class="damage-svg-detail"/>
        <circle cx="142" cy="270" r="31" class="damage-svg-tire"/><circle cx="306" cy="270" r="31" class="damage-svg-tire"/>
        <circle cx="142" cy="270" r="12" class="damage-svg-rim"/><circle cx="306" cy="270" r="12" class="damage-svg-rim"/>
      </g>`;
    return `<svg viewBox="0 0 920 520" role="img" aria-label="Prancha técnica profissional de avarias - ${title}">
      <defs>
        <linearGradient id="damageSheet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8eef7"/></linearGradient>
        <linearGradient id="damageBody" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f8fafc"/><stop offset="48%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
        <linearGradient id="damageCab" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#dbeafe"/><stop offset="60%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#075985"/></linearGradient>
        <radialGradient id="damageTire" cx="50%" cy="50%" r="58%"><stop offset="0%" stop-color="#f8fafc"/><stop offset="43%" stop-color="#475569"/><stop offset="100%" stop-color="#020617"/></radialGradient>
        <filter id="damageDrop" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".16"/></filter>
      </defs>
      <rect x="18" y="18" width="884" height="484" rx="22" fill="url(#damageSheet)" stroke="#cbd5e1" stroke-width="4" filter="url(#damageDrop)"/>
      <g font-family="Arial, Helvetica, sans-serif">
        <text x="42" y="58" fill="#0f172a" font-size="22" font-weight="900">CHECKLIST TÉCNICO DE AVARIAS — ${title}</text>
        <text x="42" y="84" fill="#64748b" font-size="13" font-weight="700">Prancha profissional para registro operacional antes, durante e após o guincho</text>
        <text x="704" y="58" fill="#0f172a" font-size="13" font-weight="900">JM GUINCHOS</text>
        <text x="704" y="78" fill="#64748b" font-size="12" font-weight="700">Evidência técnica</text>
      </g>
      ${vehicleArt}
      <g stroke="#94a3b8" stroke-width="2.4" fill="none" opacity=".72">
        <path d="M42 104H878"/><path d="M42 454H878"/>
      </g>
      <style>
        .damage-svg-label{fill:#334155;font:900 16px Arial,Helvetica,sans-serif;letter-spacing:.04em}.damage-svg-caption{fill:#64748b;font:700 13px Arial,Helvetica,sans-serif}.damage-svg-shadow{fill:#0f172a;opacity:.12}.damage-svg-outline{fill:#f8fafc;stroke:#111827;stroke-width:6;stroke-linejoin:round}.damage-svg-body{fill:url(#damageBody);stroke:#111827;stroke-width:6;stroke-linejoin:round}.damage-svg-cab{fill:#e2e8f0;stroke:#111827;stroke-width:6}.damage-svg-panel{fill:#e2e8f0;stroke:#111827;stroke-width:5}.damage-svg-glass{fill:url(#damageCab);stroke:#334155;stroke-width:5;stroke-linejoin:round;opacity:.86}.damage-svg-glass-soft{opacity:.45}.damage-svg-detail{fill:none;stroke:#64748b;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.damage-svg-structure{fill:none;stroke:#334155;stroke-width:12;stroke-linecap:round;stroke-linejoin:round}.damage-svg-tire{fill:url(#damageTire);stroke:#111827;stroke-width:7}.damage-svg-rim{fill:#e2e8f0;stroke:#111827;stroke-width:4}
      </style>
    </svg>`;
  }

  function renderDamageEditor() {
    const editor = $("damageSelectedEditor");
    if (!editor) return;
    const part = DAMAGE_PARTS.find((item) => item.key === activeDamagePartKey);
    if (!part || !selectedDamageParts.has(activeDamagePartKey)) {
      editor.classList.add("hidden");
      editor.innerHTML = "";
      return;
    }
    const current = selectedDamageMeta[part.key] || { type: "risco", severity: "leve", photoType: "damage" };
    const photoOptions = REQUIRED_PHOTOS.map((photo) => `<option value="${esc(photo.key)}"${current.photoType === photo.key ? " selected" : ""}>${esc(photo.label)}</option>`).join("");
    editor.classList.remove("hidden");
    editor.innerHTML = `
      <div class="damage-editor-head">
        <div><span class="driver-eyebrow">Registro técnico</span><b>Avaria em: ${esc(part.label)}</b></div>
        <button class="btn mini" type="button" data-action="close">Fechar</button>
      </div>
      <div class="damage-editor-grid">
        <div><label>Tipo de dano</label><select id="damagePartTypeInput">${DAMAGE_TYPES.map((row) => `<option value="${esc(row.value)}"${current.type === row.value ? " selected" : ""}>${esc(row.label)}</option>`).join("")}</select></div>
        <div><label>Gravidade</label><select id="damagePartSeverityInput">${DAMAGE_SEVERITIES.map((row) => `<option value="${esc(row.value)}"${current.severity === row.value ? " selected" : ""}>${esc(row.label)}</option>`).join("")}</select></div>
        <div class="wide"><label>Foto vinculada</label><select id="damagePartPhotoInput"><option value="">Sem foto específica</option>${photoOptions}</select><p class="muted small">A foto precisa ser adicionada na etapa de evidências correspondente.</p></div>
        <div class="wide"><label>Descrição objetiva</label><textarea id="damagePartNoteInput" placeholder="Ex.: risco de 20 cm, para-choque trincado, pneu murcho.">${esc(selectedDamageNotes[part.key] || "")}</textarea></div>
      </div>
      <div class="actions">
        <button class="btn good" type="button" data-action="save">Salvar avaria</button>
        <button class="btn danger" type="button" data-action="remove">Remover marcação</button>
      </div>`;
    const input = $("damagePartNoteInput");
    const typeInput = $("damagePartTypeInput");
    const severityInput = $("damagePartSeverityInput");
    const photoInput = $("damagePartPhotoInput");
    const sync = () => {
      selectedDamageNotes[part.key] = input ? input.value.trim() : "";
      selectedDamageMeta[part.key] = {
        type: typeInput ? typeInput.value : "risco",
        severity: severityInput ? severityInput.value : "leve",
        photoType: photoInput ? photoInput.value : ""
      };
      updateDamageSummary();
    };
    [input, typeInput, severityInput, photoInput].filter(Boolean).forEach((field) => {
      field.oninput = sync;
      field.onchange = sync;
    });
    editor.querySelectorAll("[data-action]").forEach((btn) => {
      btn.onclick = () => {
        const action = btn.getAttribute("data-action");
        if (action === "save") sync();
        if (action === "remove") {
          selectedDamageParts.delete(part.key);
          delete selectedDamageNotes[part.key];
          delete selectedDamageMeta[part.key];
          activeDamagePartKey = "";
          setupDamageDiagram();
        }
        if (action === "close" || action === "save") {
          activeDamagePartKey = "";
          renderDamageEditor();
        }
        updateDamageSummary();
      };
    });
  }

  function setupDamageDiagram() {
    const box = $("damageDiagram");
    if (!box) return;
    const type = $("damageVehicleType") ? $("damageVehicleType").value : "carro";
    const parts = damagePartsForType(type);
    box.className = "damage-diagram damage-diagram-visual damage-type-" + String(type || "carro");
    box.innerHTML = `
      <div class="damage-vehicle-svg">${damageVehicleSvg(type)}</div>
      <div class="damage-zone-layer">
        ${parts.map((part) => `<button class="damage-zone damage-part damage-zone-${esc(part.key)}${selectedDamageParts.has(part.key) ? " selected" : ""}" type="button" data-part="${esc(part.key)}" aria-pressed="${selectedDamageParts.has(part.key) ? "true" : "false"}">${esc(part.label)}</button>`).join("")}
      </div>`;
    box.onclick = (event) => {
      const btn = event.target && event.target.closest && event.target.closest(".damage-part");
      if (!btn) return;
      const key = btn.getAttribute("data-part");
      if (!key) return;
      if (selectedDamageParts.has(key)) {
        selectedDamageParts.delete(key);
        delete selectedDamageNotes[key];
        delete selectedDamageMeta[key];
        if (activeDamagePartKey === key) activeDamagePartKey = "";
      } else {
        selectedDamageParts.add(key);
        selectedDamageMeta[key] = selectedDamageMeta[key] || { type: "risco", severity: "leve", photoType: "damage" };
        activeDamagePartKey = key;
        const retiradaSelect = stageSelect("retirada");
        if (retiradaSelect && retiradaSelect.value === "pendente") setProofStageValue("retirada", "avaria", true);
      }
      setupDamageDiagram();
      renderDamageEditor();
      updateDamageSummary();
    };
    if ($("damageVehicleType") && $("damageVehicleType").dataset.boundDamageType !== "true") {
      $("damageVehicleType").dataset.boundDamageType = "true";
      $("damageVehicleType").onchange = () => {
        setupDamageDiagram();
        renderDamageEditor();
      };
    }
    renderDamageEditor();
    updateDamageSummary();
  }

  function setupAccessoryChecklist() {
    const box = $("proofAccessoriesGrid");
    if (!box) return;
    box.innerHTML = ACCESSORY_GROUPS.map((group) => `
      <div class="proof-accessory-group">
        <h3>${esc(group.title)}</h3>
        ${group.items.map(([key, label]) => `
          <div class="proof-accessory-row">
            <span>${esc(label)}</span>
            <select id="proofAccessory_${esc(key)}" aria-label="${esc(label)}">
              <option value="">Não informado</option>
              <option value="sim">S</option>
              <option value="nao">N</option>
              <option value="avaria">A</option>
            </select>
          </div>
        `).join("")}
      </div>
    `).join("");
  }

  function accessoryChecklistPayload() {
    return ACCESSORY_GROUPS.map((group) => ({
      title: group.title,
      items: group.items.map(([key, label]) => {
        const value = $("proofAccessory_" + key) ? $("proofAccessory_" + key).value : "";
        return { key, label, value, shortLabel: ACCESSORY_STATUS_LABELS[value] || "" };
      })
    }));
  }

  function technicalInspectionPayload() {
    return {
      fuelLevel: $("proofFuelLevel") ? $("proofFuelLevel").value : "",
      odometer: $("proofOdometer") ? $("proofOdometer").value.trim() : "",
      tireCondition: $("proofTireCondition") ? $("proofTireCondition").value : "",
      keyDocument: $("proofKeyDocument") ? $("proofKeyDocument").value : "",
      vehicleLoaded: $("proofVehicleLoaded") ? $("proofVehicleLoaded").value : "",
      easyRemoval: $("proofEasyRemoval") ? $("proofEasyRemoval").value : "",
      technicalNotes: $("proofVehicleTechnicalNotes") ? $("proofVehicleTechnicalNotes").value.trim() : "",
      pickupResponsible: {
        name: $("proofPickupResponsibleName") ? $("proofPickupResponsibleName").value.trim() : "",
        document: $("proofPickupResponsibleDoc") ? $("proofPickupResponsibleDoc").value.trim() : ""
      },
      deliveryResponsible: {
        name: $("proofDeliveryResponsibleName") ? $("proofDeliveryResponsibleName").value.trim() : "",
        document: $("proofDeliveryResponsibleDoc") ? $("proofDeliveryResponsibleDoc").value.trim() : ""
      },
      accessories: accessoryChecklistPayload()
    };
  }

  function damageAssessmentPayload() {
    const vehicleType = $("damageVehicleType") ? $("damageVehicleType").value : "";
    const details = $("proofDamageDetails") ? $("proofDamageDetails").value.trim() : "";
    const parts = Array.from(selectedDamageParts).map((key) => {
      const item = DAMAGE_PARTS.find((part) => part.key === key);
      const meta = selectedDamageMeta[key] || {};
      return {
        key,
        label: item && item.label || key,
        type: meta.type || "outro",
        severity: meta.severity || "leve",
        photoType: meta.photoType || "",
        note: selectedDamageNotes[key] || ""
      };
    });
    return {
      schemaVersion: 2,
      vehicleType,
      parts,
      details,
      updatedAt: new Date().toISOString(),
      updatedBy: state.user && state.user.uid || ""
    };
  }

  function resetDamageDiagram() {
    selectedDamageParts = new Set();
    selectedDamageNotes = {};
    selectedDamageMeta = {};
    activeDamagePartKey = "";
    document.querySelectorAll(".damage-part.selected").forEach((btn) => btn.classList.remove("selected"));
    setupDamageDiagram();
    updateDamageSummary();
  }

  function fieldValue(id, value) {
    if ($(id)) $(id).value = value == null ? "" : value;
  }

  function loadDamageAssessmentPayload(damage) {
    damage = damage || {};
    const parts = Array.isArray(damage.parts) ? damage.parts : [];
    selectedDamageParts = new Set(parts.map((part) => part && part.key).filter(Boolean));
    selectedDamageNotes = {};
    selectedDamageMeta = {};
    parts.forEach((part) => {
      if (!part || !part.key) return;
      if (part.note) selectedDamageNotes[part.key] = part.note;
      selectedDamageMeta[part.key] = {
        type: part.type || "outro",
        severity: part.severity || "leve",
        photoType: part.photoType || ""
      };
    });
    activeDamagePartKey = "";
    if ($("damageVehicleType")) $("damageVehicleType").value = damage.vehicleType || $("damageVehicleType").value || "carro";
    fieldValue("proofDamageDetails", damage.details || "");
    setupDamageDiagram();
  }

  function loadProofFormForCall(callId, sourceCall) {
    const call = sourceCall || state.calls[callId];
    if (!call) return;
    lastLoadedProofCallId = callId || "";
    const checklist = call.proofChecklist || {};
    PROOF_STAGES.forEach((stage) => {
      const cfg = PROOF_STAGE_FIELDS[stage] || {};
      const row = checklist[stage] || {};
      setProofStageValue(stage, row.status || "pendente", false);
      if (cfg.justification) fieldValue(cfg.justification, row.justificativa || "");
    });
    fieldValue("proofChecklistNotes", checklist.notes || "");
    const inspection = checklist.vehicleInspection || {};
    fieldValue("proofFuelLevel", inspection.fuelLevel || "");
    fieldValue("proofOdometer", inspection.odometer || "");
    fieldValue("proofTireCondition", inspection.tireCondition || "");
    fieldValue("proofKeyDocument", inspection.keyDocument || "");
    fieldValue("proofVehicleLoaded", inspection.vehicleLoaded || "");
    fieldValue("proofEasyRemoval", inspection.easyRemoval || "");
    fieldValue("proofVehicleTechnicalNotes", inspection.technicalNotes || "");
    fieldValue("proofPickupResponsibleName", inspection.pickupResponsible && inspection.pickupResponsible.name || "");
    fieldValue("proofPickupResponsibleDoc", inspection.pickupResponsible && inspection.pickupResponsible.document || "");
    fieldValue("proofDeliveryResponsibleName", inspection.deliveryResponsible && inspection.deliveryResponsible.name || "");
    fieldValue("proofDeliveryResponsibleDoc", inspection.deliveryResponsible && inspection.deliveryResponsible.document || "");
    loadDamageAssessmentPayload(checklist.damageAssessment || call.damageAssessment || {});
    renderSavedEvidenceSummary(call);
    restoreProofWizardStep(call);
    setProofSubmitStatus("Checklist carregado. Avance etapa por etapa e salve o rascunho antes de sair.", "info", false);
  }

  function normalizeDriverProfile(user, data) {
    const profile = Object.assign({}, data || {}, {
      uid: user.uid,
      email: String(user.email || "").toLowerCase(),
      role: normalizedRole(data && data.role || "driver") || "driver",
      active: data && data.active !== false
    });
    if (!isDriverRole(profile.role)) {
      throw new Error("Este login existe, mas não está marcado como motorista.");
    }
    if (profile.active === false) {
      throw new Error("Seu usuário não está ativo no cadastro da JM Guinchos.");
    }
    return profile;
  }

  async function repairDriverFromAccess(user) {
    const email = String(user.email || "").toLowerCase().trim();
    if (!email) return null;
    const permitSnap = await db.collection("driverAccess").doc(email).get();
    if (!permitSnap.exists) return null;
    const permit = permitSnap.data() || {};
    const profile = normalizeDriverProfile(user, {
      nome: permit.nome || user.displayName || email.split("@")[0],
      role: permit.role || "driver",
      active: permit.active !== false,
      source: "motorista-driverAccessRepair"
    });
    const payload = Object.assign({}, permit, profile, {
      repairedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await db.collection("users").doc(user.uid).set(payload, { merge: true });
    return { id: user.uid, ...payload };
  }

  async function loadProfile(user) {
    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();
    if (snap.exists) {
      return { id: user.uid, ...normalizeDriverProfile(user, snap.data()) };
    }

    const repairedByAccess = await repairDriverFromAccess(user);
    if (repairedByAccess) {
      return repairedByAccess;
    }

    // Reparo para e-mail criado no Auth antes de existir users/{uid}.
    const byEmail = await db.collection("users").where("email", "==", String(user.email || "").toLowerCase().trim()).limit(1).get();
    if (!byEmail.empty) {
      const doc = byEmail.docs[0];
      const data = normalizeDriverProfile(user, doc.data() || {});
      const repaired = Object.assign({}, data, {
        uid: user.uid,
        email: user.email,
        repairedUidAt: new Date().toISOString()
      });
      await ref.set(repaired, { merge: true });
      return { id: user.uid, ...repaired };
    }
    throw new Error("Seu motorista existe no Auth, mas não está liberado em driverAccess. Recrie/atualize o motorista no jm.html depois de publicar as regras novas.");
  }

  function startListeners() {
    stopListeners();
    unsubscribers.push(db.collection("vehicles").onSnapshot((snap) => {
      const rows = {};
      snap.forEach((doc) => { rows[doc.id] = { id: doc.id, ...doc.data() }; });
      state.vehicles = rows;
      scheduleRender("vehicles");
    }));
    unsubscribers.push(db.collection("calls").where("driverId", "==", state.user.uid).onSnapshot((snap) => {
      const rows = {};
      snap.forEach((doc) => { rows[doc.id] = { id: doc.id, ...doc.data() }; });
      state.calls = rows;
      state.callsLoaded = true;
      scheduleRender("calls");
    }));
    unsubscribers.push(db.collection("expenses").where("driverId", "==", state.user.uid).onSnapshot((snap) => {
      const rows = {};
      snap.forEach((doc) => { rows[doc.id] = { id: doc.id, ...doc.data() }; });
      state.expenses = rows;
      scheduleRender("expenses");
    }));
    // V32.7: motorista lê somente a configuração pública sanitizada.
    // O token do rastreador permanece exclusivamente em settings/integrations.
    const applyDriverSettingsSnapshot = (snap) => {
      state.settings = snap && snap.exists ? snap.data() : {};
      state.settingsLoaded = true;
      applyMobileGpsVisibility();
      scheduleRender("settings");
    };
    unsubscribers.push(db.collection("settings").doc("publicIntegrations").onSnapshot(applyDriverSettingsSnapshot, (err) => {
      console.warn("settings/publicIntegrations indisponível; usando fallback público do config.firebase.js.", err && err.message || err);
      state.settings = {};
      state.settingsLoaded = true;
      applyMobileGpsVisibility();
      scheduleRender("settings");
    }));
  }

  auth.onAuthStateChanged(async (user) => {
    stopListeners();
    state.user = user || null;
    state.activeCallRestored = false;
    state.callsLoaded = false;
    if (!user) {
      if (driverLocationWatchId != null) stopDriverPhoneLocation({ silent: true });
      state.selectedCallId = "";
      $("driverLoginView").classList.remove("hidden");
      $("driverAppView").classList.add("hidden");
      return;
    }
    try {
      state.profile = await loadProfile(user);
      $("driverLoginView").classList.add("hidden");
      $("driverAppView").classList.remove("hidden");
      $("driverUserBox").textContent = `${state.profile.nome || user.email} - ${state.profile.role || "motorista"}`;
      startListeners();
      renderDriverConnectivity();
      applyMobileGpsVisibility();
      setTimeout(() => setupCollapsiblePanels(document, { collapseOnMobile: true, openFirst: 1 }), 80);
    } catch (err) {
      $("driverLoginError").textContent = err.message;
      await auth.signOut();
    }
  });

  $("driverLoginForm").onsubmit = async (e) => {
    e.preventDefault();
    $("driverLoginError").textContent = "";
    try {
      await auth.signInWithEmailAndPassword($("driverLoginEmail").value.trim(), $("driverLoginPass").value);
    } catch (err) {
      $("driverLoginError").textContent = friendlyAuthError(err);
    }
  };

  $("driverLogoutBtn").onclick = () => auth.signOut();
  $("driverRefreshBtn").onclick = () => render("manual");
  if ($("driverExpenseCall")) $("driverExpenseCall").onchange = syncDriverExpenseContext;
  if ($("driverProofCall")) $("driverProofCall").onchange = () => loadProofFormForCall($("driverProofCall").value);
  if ($("driverStartLocationBtn")) $("driverStartLocationBtn").onclick = () => startDriverPhoneLocation();
  if ($("driverStopLocationBtn")) $("driverStopLocationBtn").onclick = () => stopDriverPhoneLocation();
  if ($("driverActiveRouteBtn")) $("driverActiveRouteBtn").onclick = () => {
    const call = requireActiveCall("abrir a rota");
    if (call) openRouteForCall(call.id);
  };
  if ($("driverActiveStartRouteBtn")) $("driverActiveStartRouteBtn").onclick = () => {
    const call = requireActiveCall("iniciar o deslocamento");
    if (call) startRouteForCall(call.id);
  };
  if ($("driverApplyStatusBtn")) $("driverApplyStatusBtn").onclick = () => {
    const call = requireActiveCall("atualizar o status");
    if (call) setStatus(call.id, $("driverQuickStatus").value);
  };
  if ($("driverClearActiveCallBtn")) $("driverClearActiveCallBtn").onclick = () => clearActiveCall();
  document.querySelectorAll("[data-driver-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(button.dataset.driverTarget);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll("[data-driver-target]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  window.addEventListener("online", () => renderDriverConnectivity("conexão restabelecida"));
  window.addEventListener("offline", () => renderDriverConnectivity("sem conexão"));

  function activeCalls() {
    return visibleRows(state.calls).filter((c) => !isFinalStatus(c));
  }

  function render(reason) {
    const active = state.selectedCallId && state.calls[state.selectedCallId];
    if (state.selectedCallId && (!active || isFinalStatus(active) || active.deletedAt)) {
      state.selectedCallId = "";
      persistActiveCall("");
    }
    restoreActiveCallFromStorage();
    renderActiveCall();
    renderCalls();
    renderExpenseSelects();
    renderDriverConnectivity();
    applyMobileGpsVisibility();
    scheduleMapRender();
  }

  function renderCalls() {
    const calls = activeCalls().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    $("driverCallsBox").innerHTML = calls.length ? calls.map((call) => {
      const vehicle = state.vehicles[call.vehicleId] || {};
      const url = call.routeExternalUrl || call.routeUrl || mapsRouteUrl(call, vehicle);
      const km = routeKm(call, vehicle);
      const metric = call.routeDistanceText || call.routeMetrics && call.routeMetrics.fullRoute && call.routeMetrics.fullRoute.distanceText || (km ? km.toFixed(1).replace(".", ",") + " km estimados" : "aguardando coordenadas");
      const routeBadge = call.routePrecision === "osrm_openstreetmap" || call.routeMetrics && call.routeMetrics.fullRoute && call.routeMetrics.fullRoute.isPrecise ? `<span class="badge ok">Rota por ruas</span>` : `<span class="badge warn">Rota estimada/fallback</span>`;
      const proof = proofBadge(call);
      const selected = state.selectedCallId === call.id;
      const recommendedStatus = nextStatusKey(call);
      const actionButtons = selected ? `
          <button class="btn primary" onclick="JM.motorista.setStatus('${esc(call.id)}','${esc(recommendedStatus)}')">Continuar: ${esc(statusLabel(recommendedStatus))}</button>
          <button class="btn good" onclick="JM.motorista.openRouteForCall('${esc(call.id)}')">Ver rota</button>
          ${url ? `<button class="btn" onclick="JM.motorista.openExternalRouteForCall('${esc(call.id)}')">Maps/Waze</button>` : ""}
          <button class="btn warn" data-mobile-gps-only onclick="JM.motorista.startLocationForCall('${esc(call.id)}')" ${isMobileGpsEnabled() ? "" : "disabled"}>Ligar GPS</button>
          <button class="btn" onclick="document.getElementById('driverPanelProofs').scrollIntoView({behavior:'smooth'})">Abrir checklist</button>` : `
          <button class="btn primary" onclick="JM.motorista.selectCall('${esc(call.id)}')">Selecionar atendimento</button>
          <button class="btn" disabled title="Selecione este atendimento antes de executar ações">Rota e status bloqueados</button>`;
      return `<div class="card driver-call-card ${selected ? "selected" : ""}" style="margin-bottom:10px">
        <div class="actions" style="justify-content:space-between">
          <div><b>${esc(call.protocolo || call.id)}</b><br><span class="muted small">${esc(call.cliente || call.beneficiary || "")} - ${esc(vehicle.placa || "")}</span></div>
          <span class="badge ${statusClass(call)}">${esc(statusLabel(call))}</span>
        </div>
        ${selected ? '<div class="driver-selected-ribbon">ATENDIMENTO ATUAL</div>' : ''}
        <p class="small"><b>Origem:</b> ${esc(call.origem?.label || call.originLabel || "-")}<br><b>Destino:</b> ${esc(call.destino?.label || call.destLabel || "-")}<br><b>Rota:</b> ${esc(metric)} ${routeBadge} ${proof}<br><b>Acionamento:</b> ${esc(call.source || "Particular")}${call.insurance ? " · " + esc(call.insurance) : ""}${call.insuranceProtocol ? " · Prot. " + esc(call.insuranceProtocol) : ""}<br><b>Veículo cliente:</b> ${esc(call.customerPlate || "-")} ${call.customerVehicle ? "· " + esc(call.customerVehicle) : ""}</p>
        <div class="actions">${actionButtons}</div>
      </div>`;
    }).join("") : `<p class="muted">Nenhum chamado vinculado ao seu usuário.</p>`;
  }

  function renderExpenseSelects() {
    const currentCall = $("driverExpenseCall") && $("driverExpenseCall").value || "";
    const currentVehicle = $("driverExpenseVehicle") && $("driverExpenseVehicle").value || "";
    const currentReportCall = $("driverReportCall") && $("driverReportCall").value || "";
    const currentProofCall = $("driverProofCall") && $("driverProofCall").value || "";
    const currentLocationCall = $("driverLocationCall") && $("driverLocationCall").value || "";
    const currentLocationVehicle = $("driverLocationVehicle") && $("driverLocationVehicle").value || "";
    const calls = activeCalls();
    const sig = optionSignature(calls, state.vehicles);
    const callOptions = calls.map((c) => `<option value="${esc(c.id)}">${esc(c.protocolo || c.cliente || c.id)}</option>`).join("");
    const callHtmlEmpty = `<option value="">Sem chamado</option>` + callOptions;
    const callHtmlSelect = `<option value="">Selecione</option>` + callOptions;
    const vehicleHtml = `<option value="">Selecione</option>` + visibleRows(state.vehicles).map((v) => `<option value="${esc(v.id)}">${esc(v.placa || v.id)}</option>`).join("");

    const activeId = state.selectedCallId || "";
    setSelectOptionsStable($("driverExpenseCall"), callHtmlEmpty, activeId || currentCall);
    setSelectOptionsStable($("driverReportCall"), callHtmlSelect, activeId || currentReportCall);
    setSelectOptionsStable($("driverProofCall"), callHtmlSelect, activeId || currentProofCall);
    setSelectOptionsStable($("driverLocationCall"), callHtmlSelect, activeId || currentLocationCall);
    setSelectOptionsStable($("driverLocationVehicle"), vehicleHtml, currentLocationVehicle || selectedCallVehicleId());
    setSelectOptionsStable($("driverExpenseVehicle"), vehicleHtml, currentVehicle || selectedCallVehicleId());

    syncActiveCallForms();
    lastSelectSignature = sig;
    if (activeId && activeId !== lastLoadedProofCallId) loadProofFormForCall(activeId);
    syncDriverExpenseContext();
    updateContextLockState();
  }

  function callRouteUrl(call) {
    if (!call) return "";
    const vehicle = state.vehicles[call.vehicleId] || {};
    return call.routeExternalUrl || call.routeUrl || mapsRouteUrl(call, vehicle) || "";
  }

  function openRouteForCall(id) {
    focusCallRoute(id, true);
  }

  function openExternalRouteForCall(id) {
    const call = state.calls[id];
    if (!call) return toast("Chamado não encontrado para abrir rota.", "danger");
    if (state.selectedCallId !== id) return toast("Selecione este atendimento antes de abrir a rota externa.", "danger");
    const url = callRouteUrl(call);
    if (!url) return toast("Este chamado ainda não tem origem/destino suficientes para abrir rota.", "danger");
    window.open(url, "_blank", "noopener");
    toast("Rota aberta no aplicativo de mapas.", "ok");
  }

  async function acceptCall(id) {
    if (state.selectedCallId !== id) return toast("Selecione este atendimento antes de aceitá-lo.", "danger");
    focusCallRoute(id, false);
    await setStatus(id, "despachado");
    toast("Chamado aceito. Inicie a rota quando estiver pronto para deslocar.", "ok");
  }

  async function startRouteForCall(id) {
    const call = state.calls[id];
    if (!call) return toast("Chamado não encontrado para iniciar rota.", "danger");
    if (state.selectedCallId !== id) return toast("Selecione este atendimento antes de iniciar a rota.", "danger");
    focusCallRoute(id, true);
    if (isMobileGpsEnabled()) startDriverPhoneLocation(id).catch((err) => setDriverRouteStatus("Rota iniciada, mas o GPS do celular não ligou: " + (err && err.message || "falha de permissão"), "danger"));
    if (statusFlowIndex(call.statusKey || call.status) < statusFlowIndex("motorista_a_caminho")) {
      await setStatus(id, "motorista_a_caminho");
    } else {
      toast("Rota aberta. O atendimento já está em deslocamento ou em uma etapa posterior.", "ok");
    }
  }

  function setDriverLocationStatus(message, type) {
    const box = $("driverLocationStatus");
    if (!box) return;
    box.textContent = message;
    box.className = "wide small " + (type || "muted");
  }

  async function stopDriverPhoneLocation(options) {
    options = options || {};
    if (driverLocationWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(driverLocationWatchId);
    }
    driverLocationWatchId = null;
    try {
      const callId = options.preserveCallId || state.selectedCallId || "";
      const call = callId && state.calls[callId];
      const vehicleId = (call && (call.vehicleId || call.vehicle || call.truckId || "")) || ($("driverLocationVehicle") && $("driverLocationVehicle").value) || "";
      const now = new Date().toISOString();
      if (callId) await db.collection("calls").doc(callId).set({ phoneLocationActive: false, phoneLocationStoppedAt: now, updatedAt: now }, { merge: true });
      if (isMobileGpsRealtime()) {
        const gps = activeMobileGpsSettings();
        const rtdb = getRealtimeDb && getRealtimeDb(gps.databaseURL);
        if (rtdb) {
          // Nunca criar ponto 0,0 ao desligar. Só atualiza o estado de registros que já
          // receberam ao menos uma coordenada válida nesta sessão.
          if (state.driverLivePoint) {
            const updates = {};
            const driverKey = rtdbKey(state.user && state.user.uid || "driver");
            const bases = ["mobileGps/drivers/" + driverKey];
            if (callId) bases.push("mobileGps/calls/" + rtdbKey(callId));
            if (vehicleId) bases.push("mobileGps/vehicles/" + rtdbKey(vehicleId));
            bases.forEach((base) => {
              updates[base + "/active"] = false;
              updates[base + "/updatedAt"] = now;
              updates[base + "/stoppedAt"] = now;
            });
            await rtdb.ref().update(updates);
          }
        }
      }
    } catch (err) {
      console.warn("Falha ao encerrar GPS do celular", err);
    }
    state.gpsState = "stopped";
    updateGpsButtons();
    if (!options.silent) setDriverLocationStatus("Localização do celular desligada. O último ponto permanece registrado na central.", "muted");
  }

  async function saveDriverLocationPoint(callId, pos, options) {
    callId = normalizeCallIdInput(callId);
    options = options || {};
    if (!isMobileGpsEnabled()) {
      throw new Error("Módulo de localização por celular desativado no superadmin.");
    }
    const call = callId ? state.calls[callId] || {} : {};
    const vehicleId = options.vehicleId || call.vehicleId || call.vehicle || call.truckId || "";
    if (!callId || !call.id) throw new Error("Selecione o atendimento atual antes de ligar o GPS do celular.");
    if (state.selectedCallId !== callId) throw new Error("O GPS só pode ser vinculado ao atendimento atual selecionado.");
    if (!shouldPersistDriverGps(callId, pos, !!options.force, vehicleId)) {
      return null;
    }
    const rtdbCallId = callId ? rtdbKey(callId) : "";
    const rtdbVehicleId = vehicleId ? rtdbKey(vehicleId) : "";
    const point = {
      lat: Number(pos.coords.latitude),
      lng: Number(pos.coords.longitude),
      accuracy: pos.coords.accuracy || null,
      altitude: pos.coords.altitude || null,
      heading: pos.coords.heading || null,
      speed: pos.coords.speed || null,
      source: isMobileGpsRealtime() ? "driver_phone_realtime_database" : "driver_phone_geolocation",
      capturedAt: new Date().toISOString(),
      driverId: state.user.uid,
      driverName: state.profile.nome || state.user.email,
      callId: callId || "",
      vehicleId
    };
    lastDriverPhoneWrite = { callId: callId || vehicleId || "driver", at: Date.now(), lat: point.lat, lng: point.lng };
    state.driverLivePoint = point;
    state.gpsState = "active";
    scheduleMapRender(80);
    if (callId) {
      setDriverRouteStatus("GPS do celular atualizado. A rota interna foi recalculada com a posição viva do motorista.", "ok");
    }

    if (isMobileGpsRealtime()) {
      const gps = activeMobileGpsSettings();
      const rtdb = getRealtimeDb && getRealtimeDb(gps.databaseURL);
      if (!rtdb) throw new Error("Realtime Database não configurado. Informe databaseURL no superadmin ou use modo Firestore.");
      const payload = {
        point,
        lat: point.lat,
        lng: point.lng,
        accuracy: point.accuracy,
        heading: point.heading,
        speed: point.speed,
        capturedAt: point.capturedAt,
        updatedAt: point.capturedAt,
        active: true,
        callId: rtdbCallId,
        rawCallId: callId || "",
        vehicleId: rtdbVehicleId,
        rawVehicleId: vehicleId,
        driverId: state.user.uid,
        driverName: state.profile.nome || state.user.email,
        driverEmail: state.user.email || ""
      };
      const updates = {};
      if (rtdbCallId) updates["mobileGps/calls/" + rtdbCallId] = payload;
      if (rtdbVehicleId) updates["mobileGps/vehicles/" + rtdbVehicleId] = payload;
      updates["mobileGps/drivers/" + rtdbKey(state.user.uid)] = payload;
      await rtdb.ref().update(updates);
      if (options.force && callId) {
        await db.collection("calls").doc(callId).set({
          phoneLocationActive: true,
          phoneLocationBackend: "realtime_database",
          gpsSource: "driver_phone_rtdb",
          phoneLocationStartedAt: point.capturedAt,
          phoneLocationUpdatedAt: point.capturedAt,
          activePhoneGpsVehicleId: vehicleId || "",
          updatedAt: point.capturedAt
        }, { merge: true });
      }
      const vehicleLabel = vehicleId ? " · RTDB do veículo atualizado" : " · somente ponto do motorista";
      const callLabel = callId ? " · chamado vinculado" : " · sem chamado ativo";
      setDriverLocationStatus("Localização ativa via Realtime DB: " + point.lat.toFixed(6) + ", " + point.lng.toFixed(6) + " · precisão " + Math.round(point.accuracy || 0) + "m" + vehicleLabel + callLabel + " · atualizado " + new Date().toLocaleTimeString("pt-BR"), vehicleId ? "ok" : "warn");
      updateGpsButtons();
      return point;
    }

    const callPayload = {
      driverPhoneLocation: point,
      mobileLocation: point,
      phoneLocationActive: true,
      phoneLocationBackend: "firestore",
      phoneLocationUpdatedAt: point.capturedAt,
      gpsSource: "driver_phone",
      updatedAt: point.capturedAt
    };

    if (callId) await db.collection("calls").doc(callId).set(callPayload, { merge: true });

    if (vehicleId) {
      try {
        await db.collection("vehicles").doc(vehicleId).set({
          location: point,
          mobileLocation: point,
          driverPhoneLocation: point,
          gpsSource: "driver_phone",
          trackerStatus: "GPS celular motorista",
          lastPhoneGpsAt: point.capturedAt,
          lastTrackerAt: point.capturedAt,
          activeCallId: callId || "",
          activeDriverId: state.user.uid,
          activeDriverName: state.profile.nome || state.user.email,
          updatedAt: point.capturedAt,
          updatedBy: state.user.uid
        }, { merge: true });
      } catch (err) {
        console.warn("GPS do celular foi salvo no chamado, mas o veículo recusou atualização. Publique o firestore.rules da versão atual.", err);
      }
    }

    const vehicleLabel = vehicleId ? " · veículo atualizado" : " · somente ponto do motorista";
    setDriverLocationStatus("Localização ativa: " + point.lat.toFixed(6) + ", " + point.lng.toFixed(6) + " · precisão " + Math.round(point.accuracy || 0) + "m" + vehicleLabel + " · atualizado " + new Date().toLocaleTimeString("pt-BR"), vehicleId ? "ok" : "warn");
    updateGpsButtons();
    return point;
  }

  function normalizeCallIdInput(value) {
    if (typeof value !== "string") return "";
    const id = value.trim();
    return id && state.calls[id] ? id : "";
  }

  async function startDriverPhoneLocation(callIdOverride) {
    if (!isMobileGpsEnabled()) return toast("GPS do celular desativado pela empresa.", "danger");
    if (!navigator.geolocation) return toast("Este celular/navegador não oferece geolocalização.", "danger");
    const active = requireActiveCall("ligar o GPS do celular");
    if (!active) return;
    const requestedId = normalizeCallIdInput(callIdOverride) || active.id;
    if (requestedId !== active.id) return toast("O GPS só pode ser ligado no atendimento atual selecionado.", "danger");
    const callId = active.id;
    const vehicleId = active.vehicleId || active.vehicle || active.truckId || "";
    syncActiveCallForms();
    await stopDriverPhoneLocation({ silent: true, preserveCallId: callId });
    state.gpsState = "requesting";
    updateGpsButtons();
    setDriverLocationStatus("Solicitando permissão e sinal de localização do celular...", "warn");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await saveDriverLocationPoint(callId, pos, { force: true, vehicleId });
        toast("GPS do celular ligado e vinculado ao atendimento atual.", "ok");
      } catch (err) {
        state.gpsState = "save-error";
        setDriverLocationStatus("Falha ao salvar localização: " + (err && err.message || "erro desconhecido"), "danger");
        updateGpsButtons();
      }
    }, (err) => {
      state.gpsState = err && err.code === 1 ? "permission-denied" : "signal-error";
      if (err && err.code === 1 && driverLocationWatchId != null) {
        try { navigator.geolocation.clearWatch(driverLocationWatchId); } catch (_) {}
        driverLocationWatchId = null;
      }
      const detail = err && err.message || "permissão ou sinal indisponível";
      setDriverLocationStatus("Não foi possível iniciar o GPS: " + detail + ". Verifique a permissão de Localização do navegador.", "danger");
      updateGpsButtons();
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 });

    driverLocationWatchId = navigator.geolocation.watchPosition(async (pos) => {
      try {
        await saveDriverLocationPoint(callId, pos, { vehicleId });
      } catch (err) {
        state.gpsState = "save-error";
        setDriverLocationStatus("GPS capturou a posição, mas não conseguiu enviar: " + (err && err.message || "erro de conexão"), "danger");
      }
    }, (err) => {
      state.gpsState = err && err.code === 1 ? "permission-denied" : "signal-error";
      if (err && err.code === 1 && driverLocationWatchId != null) {
        try { navigator.geolocation.clearWatch(driverLocationWatchId); } catch (_) {}
        driverLocationWatchId = null;
      }
      setDriverLocationStatus("GPS em espera: " + (err && err.message || "aguardando sinal melhor") + ".", "danger");
      updateGpsButtons();
    }, { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 });
    updateGpsButtons();
  }

  async function setStatus(id, status) {
    const call = state.calls[id];
    if (!call) return;
    if (state.selectedCallId !== id) return toast("Selecione este atendimento antes de alterar o status.", "danger");
    if (state.statusUpdating) return toast("A atualização anterior ainda está sendo salva.", "warn");
    const currentKey = statusKey(call.statusKey || call.status);
    const key = statusKey(status);
    const label = statusLabel(key);
    if (currentKey === key) return toast("O atendimento já está em “" + label + "”.", "warn");
    if (isFinalStatus(currentKey)) return toast("Atendimento encerrado não pode ter o status alterado pelo motorista.", "danger");

    const currentIndex = statusFlowIndex(currentKey);
    const targetIndex = statusFlowIndex(key);
    const normalizedCurrentIndex = currentIndex < 0 ? -1 : currentIndex;
    const backwards = targetIndex >= 0 && normalizedCurrentIndex >= 0 && targetIndex < normalizedCurrentIndex;
    const forwardJump = targetIndex >= 0 && normalizedCurrentIndex >= 0 && targetIndex > normalizedCurrentIndex + 1;
    if (forwardJump) return toast("Avance uma etapa por vez. A próxima etapa válida é “" + statusLabel(nextStatusKey(call)) + "”.", "danger");
    if (key === "finalizado" && currentKey !== "entregue") return toast("Antes de finalizar, marque o atendimento como Entregue.", "danger");
    if (key === "finalizado" && !["completo", "revisado"].includes(call.proofStatus || proofStatusFor(call))) {
      state.proofWizardStep = PROOF_WIZARD_STEPS.length - 1;
      renderProofWizard();
      const proofPanel = $("driverPanelProofs");
      if (proofPanel) proofPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast("Antes de finalizar, conclua checklist, fotos obrigatórias e assinatura/aceite do cliente.", "danger");
    }

    let confirmation = { confirmed: true, reason: "" };
    if (backwards || key === "finalizado") confirmation = await requestStatusConfirmation(call, key, backwards);
    if (!confirmation.confirmed) return;
    state.statusUpdating = true;
    refreshQuickStatusOptions(call);
    const now = new Date().toISOString();
    const metadata = deviceStatusMetadata();
    const reasonText = confirmation.reason ? " · Motivo: " + confirmation.reason : "";
    const updates = {
      status: label,
      statusKey: key,
      closedAt: key === "finalizado" ? now : call.closedAt || "",
      closedBy: key === "finalizado" ? state.user.uid : call.closedBy || "",
      closedByEmail: key === "finalizado" ? state.user.email : call.closedByEmail || "",
      locked: key === "finalizado" ? true : call.locked || false,
      phoneLocationActive: key === "finalizado" ? false : call.phoneLocationActive || false,
      updatedAt: now,
      timeline: arrayUnion({
        at: now,
        by: state.profile.nome || state.user.email,
        text: "Motorista alterou status de " + statusLabel(currentKey) + " para " + label + reasonText,
        statusKey: key,
        previousStatusKey: currentKey,
        reason: confirmation.reason || "",
        device: metadata
      })
    };
    if (key === "finalizado") {
      const currentBilling = String(call.billingStatus || "").toLowerCase();
      const hasValue = Number(call.valor || call.value || call.amount || 0) > 0;
      if (hasValue && !/(recebido|fechado)/.test(currentBilling)) {
        updates.billingStatus = currentBilling.includes("receber") ? call.billingStatus : "a_faturar";
        updates.financePending = true;
      } else if (!hasValue) {
        updates.billingStatus = call.billingStatus || "sem_valor";
        updates.financePending = false;
      }
    }
    try {
      await db.collection("calls").doc(id).update(updates);
      state.calls[id] = Object.assign({}, call, updates, { timeline: call.timeline || [] });
      await syncPublicCallFromDriver(call, updates).catch((err) => console.warn("Falha ao atualizar espelho público", err));
      if (key === "finalizado") {
        await stopDriverPhoneLocation({ silent: true, preserveCallId: id });
        state.selectedCallId = "";
        persistActiveCall("");
        render("finalizado");
      } else {
        renderActiveCall();
        renderCalls();
        if (["motorista_no_local", "veiculo_carregado", "em_transporte", "entregue"].includes(key)) {
          state.proofWizardStep = proofStepForCallStatus(state.calls[id]);
          renderProofWizard();
        }
      }
      toast("Chamado atualizado para " + label + ".", "ok");
    } catch (err) {
      toast("Não foi possível atualizar o status: " + (err && (err.code || err.message) || "erro desconhecido"), "danger");
    } finally {
      state.statusUpdating = false;
      refreshQuickStatusOptions(selectedCall());
    }
  }

  async function uploadToCloudinaryAsset(file, options) {
    const cloud = activeCloudinaryConfig();
    if (!file) return null;
    if (!cloud.cloudName || !cloud.uploadPreset) {
      throw new Error("Cloudinary não configurado: salve cloudName e uploadPreset no superadmin antes de enviar fotos.");
    }
    const isAudio = String(file.type || "").toLowerCase().startsWith("audio/");
    const resourceType = options && options.resourceType || (isAudio ? "auto" : "image");
    const preparedFile = resourceType === "image" ? await imageFileToCanvas(file, 1600, 0.82) : file;
    const endpoint = `https://api.cloudinary.com/v1_1/${cloud.cloudName}/${resourceType}/upload`;

    function buildForm(withFolder) {
      const form = new FormData();
      if (options && options.fileName) form.append("file", preparedFile, options.fileName);
      else form.append("file", preparedFile);
      form.append("upload_preset", cloud.uploadPreset);
      if (withFolder) {
        const folder = [cloud.folder || "jm-guinchos", options && options.folder].filter(Boolean).join("/");
        if (folder) form.append("folder", folder);
      }
      return form;
    }

    async function send(withFolder) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint, true);
        xhr.timeout = 60000;
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable || !options || typeof options.onProgress !== "function") return;
          options.onProgress(Math.round(event.loaded / event.total * 100));
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao enviar para o Cloudinary."));
        xhr.ontimeout = () => reject(new Error("Tempo esgotado ao enviar para o Cloudinary. Confira a internet ou use um arquivo menor."));
        xhr.onload = () => {
          let data = null;
          try { data = JSON.parse(xhr.responseText || "{}"); } catch (_) { data = {}; }
          if (xhr.status < 200 || xhr.status >= 300) {
            const detail = data && data.error && data.error.message ? data.error.message : "Cloudinary recusou o upload.";
            const err = new Error(detail);
            err.status = xhr.status;
            reject(err);
            return;
          }
          if (options && typeof options.onProgress === "function") options.onProgress(100);
          resolve(data || {});
        };
        xhr.send(buildForm(withFolder));
      });
    }

    let data;
    try {
      data = await send(true);
    } catch (err) {
      const msg = String(err && err.message || "").toLowerCase();
      if (err && err.name === "AbortError") throw new Error("Tempo esgotado ao enviar para o Cloudinary. Teste com uma foto menor ou confira a internet do celular.");
      if (/folder|public_id|parameter|not allowed|disallowed|unsigned|preset/i.test(msg)) {
        data = await send(false);
      } else {
        throw err;
      }
    }

    if (!data.secure_url && !data.url) throw new Error("Cloudinary respondeu, mas não devolveu URL do arquivo.");
    return {
      cloudinaryUrl: data.secure_url || data.url || "",
      publicId: data.public_id || "",
      resourceType: data.resource_type || "image",
      bytes: data.bytes || 0,
      format: data.format || "",
      uploadedAt: new Date().toISOString()
    };
  }

  async function uploadToCloudinary(file) {
    const asset = await uploadToCloudinaryAsset(file);
    return asset && asset.cloudinaryUrl || "";
  }

  $("driverExpenseForm").onsubmit = async (e) => {
    e.preventDefault();
    const photo = $("driverExpensePhoto").files && $("driverExpensePhoto").files[0];
    let photoUrl = "";
    try { photoUrl = await uploadToCloudinary(photo); } catch (err) { toast("Foto não enviada: " + err.message, "danger"); }
    const active = requireActiveCall("lançar uma despesa");
    if (!active) return;
    const callId = active.id;
    const call = active;
    const vehicleId = call && call.vehicleId || $("driverExpenseVehicle").value;
    const expenseType = $("driverExpenseType").value;
    const expenseNotes = $("driverExpenseNotes").value.trim();
    if (isVehicleCostType(expenseType, expenseNotes) && !vehicleId) return toast("Despesa de frota precisa estar vinculada a um veículo. Selecione o caminhão/guincho antes de enviar.", "danger");
    if (callId && !vehicleId) return toast("Este chamado ainda não tem veículo. Selecione o veículo antes de enviar a despesa.", "danger");
    setPendingOperations(1, "enviando despesa");
    try {
      await db.collection("expenses").add({
      callId,
      vehicleId,
      type: expenseType,
      amount: parseMoney($("driverExpenseAmount").value),
      notes: expenseNotes,
      photoUrl,
      status: "pendente",
      driverId: state.user.uid,
      driverName: state.profile.nome || state.user.email,
      customerId: call && call.customerId || "",
      billingParty: callDisplayName(call),
      protocol: callProtocolLabel(call, callId),
      insurance: call && call.insurance || "",
      insuranceProtocol: call && call.insuranceProtocol || "",
      customerPlate: call && call.customerPlate || "",
      sourceType: "driver_expense",
      vehicleCost: !!vehicleId,
      vehicleCostKind: vehicleCostKind(expenseType, expenseNotes),
      vehicleCostCategory: expenseType || "Despesa motorista",
      createdAt: new Date().toISOString(),
        createdBy: state.user.uid
      });
      e.target.reset();
      renderExpenseSelects();
      toast("Despesa enviada para aprovação já vinculada ao chamado, veículo e pagador.", "ok");
    } finally {
      setPendingOperations(-1);
    }
  };

  $("driverReportForm") && ($("driverReportForm").onsubmit = async (e) => {
    e.preventDefault();
    const call = requireActiveCall("enviar o relatório");
    if (!call) return;
    const callId = call.id;
    const photo = $("driverReportPhoto").files && $("driverReportPhoto").files[0];
    let photoUrl = "";
    try { photoUrl = await uploadToCloudinary(photo); } catch (err) { toast("Foto não enviada: " + err.message, "danger"); }
    await db.collection("calls").doc(callId).update({
      driverReports: arrayUnion({
        at: new Date().toISOString(),
        by: state.profile.nome || state.user.email,
        checklist: $("driverReportChecklist").value,
        notes: $("driverReportNotes").value.trim(),
        photoUrl
      }),
      timeline: arrayUnion({ at: new Date().toISOString(), by: state.profile.nome || state.user.email, text: "Motorista enviou relatório/checklist" }),
      updatedAt: new Date().toISOString()
    });
    e.target.reset();
    toast("Relatório enviado para a central.", "ok");
  });

  function collectProofChecklist(call) {
    const previousChecklist = call && call.proofChecklist || {};
    const checklist = {
      notes: $("proofChecklistNotes") ? $("proofChecklistNotes").value.trim() || previousChecklist.notes || "" : previousChecklist.notes || "",
      vehicleInspection: technicalInspectionPayload(),
      damageAssessment: damageAssessmentPayload(),
      updatedAt: new Date().toISOString(),
      updatedBy: state.user.uid
    };
    PROOF_STAGES.forEach((stage) => {
      const cfg = PROOF_STAGE_FIELDS[stage] || {};
      const select = stageSelect(stage);
      const previous = previousChecklist[stage] || {};
      const justification = cfg.justification && $(cfg.justification) ? $(cfg.justification).value.trim() : previous.justificativa || "";
      const selectedStatus = select && select.value || "pendente";
      const touched = !!(select && select.dataset.touched === "true");
      const shouldUpdate = touched || !!justification || selectedStatus !== (previous.status || "pendente");
      checklist[stage] = Object.assign({}, previous, {
        status: shouldUpdate ? selectedStatus : previous.status || "pendente",
        label: cfg.label || previous.label || stage,
        justificativa: shouldUpdate ? justification : previous.justificativa || ""
      });
    });
    return checklist;
  }

  function validateCurrentProofStep(checklist, strict) {
    const step = PROOF_WIZARD_STEPS[state.proofWizardStep];
    const phase = step.phase;
    const row = checklist[phase] || {};
    if (["retirada", "carregamento", "transporte", "entrega", "finalizacao"].includes(step.key) && (!row.status || row.status === "pendente")) {
      return { ok: false, message: "Marque a situação da etapa “" + step.label + "” antes de avançar." };
    }
    if (["avaria", "intercorrencia", "recusa", "justificado"].includes(String(row.status || "")) && !String(row.justificativa || "").trim()) {
      const hasDamage = step.key === "retirada" && selectedDamageParts.size > 0 && String($("proofDamageDetails") && $("proofDamageDetails").value || "").trim();
      if (!hasDamage) return { ok: false, message: "Explique a avaria, intercorrência, recusa ou justificativa desta etapa." };
    }
    if (strict && step.key === "finalizacao") {
      const hasSignatureEvidence = !!(signaturePad && signaturePad.dirty) || !!($("signatureRefusalReason") && $("signatureRefusalReason").value.trim()) || !!(selectedCall() && hasSignature(selectedCall()));
      if (!hasSignatureEvidence) return { ok: false, message: "Na finalização, registre a assinatura ou uma justificativa de recusa/ausência." };
    }
    return { ok: true, message: "" };
  }

  async function saveProofDraft(options) {
    options = options || {};
    const call = requireActiveCall("salvar o rascunho das provas");
    if (!call || state.proofDraftSaving) return false;
    const checklist = collectProofChecklist(call);
    const validation = validateCurrentProofStep(checklist, false);
    if (!validation.ok && options.validate !== false) {
      setProofSubmitStatus(validation.message, "danger");
      return false;
    }
    state.proofDraftSaving = true;
    const button = $("driverSaveProofDraftBtn");
    if (button) { button.disabled = true; button.textContent = "Salvando rascunho..."; }
    try {
      const now = new Date().toISOString();
      const updates = {
        proofChecklist: checklist,
        damageAssessment: checklist.damageAssessment,
        proofStatus: proofStatusFor(Object.assign({}, call, { proofChecklist: checklist })) === "pendente" ? "parcial" : proofStatusFor(Object.assign({}, call, { proofChecklist: checklist })),
        proofUpdatedAt: now,
        proofUpdatedBy: state.user.uid,
        timeline: arrayUnion({ at: now, by: state.profile.nome || state.user.email, text: "Motorista salvou rascunho da etapa " + PROOF_WIZARD_STEPS[state.proofWizardStep].label }),
        updatedAt: now
      };
      await db.collection("calls").doc(call.id).set(updates, { merge: true });
      state.calls[call.id] = Object.assign({}, call, updates);
      renderSavedEvidenceSummary(state.calls[call.id]);
      renderProofWizard();
      if (!options.silent) setProofSubmitStatus("Rascunho da etapa “" + PROOF_WIZARD_STEPS[state.proofWizardStep].label + "” salvo.", "success");
      return true;
    } catch (err) {
      setProofSubmitStatus("Não foi possível salvar o rascunho: " + (err && (err.code || err.message) || "erro desconhecido"), "danger");
      return false;
    } finally {
      state.proofDraftSaving = false;
      if (button) { button.disabled = false; button.textContent = "Salvar rascunho da etapa"; }
    }
  }

  $("driverProofForm") && ($("driverProofForm").onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter || document.querySelector("#driverProofForm button[type='submit']");
    const call = requireActiveCall("salvar as provas");
    if (!call) return setProofSubmitStatus("Selecione o atendimento atual para salvar as provas.", "danger");
    const callId = call.id;

    const acceptedText = $("signatureAcceptedText").value.trim();
    const signatureRefusalReason = $("signatureRefusalReason") ? $("signatureRefusalReason").value.trim() : "";
    const signaturePhase = $("signaturePhase") ? $("signaturePhase").value : "finalizacao";
    const hasNewSignature = !!(signaturePad && signaturePad.dirty);
    if ((hasNewSignature || signatureRefusalReason) && !acceptedText) return setProofSubmitStatus("O aceite textual é obrigatório quando houver assinatura ou justificativa de recusa.", "danger");

    const previousChecklist = call.proofChecklist || {};
    const checklist = collectProofChecklist(call);
    const currentStepValidation = validateCurrentProofStep(checklist, state.proofWizardStep === PROOF_WIZARD_STEPS.length - 1);
    if (!currentStepValidation.ok) return setProofSubmitStatus(currentStepValidation.message, "danger");
    const hasStageTouchedNow = PROOF_STAGES.some((stage) => {
      const select = stageSelect(stage);
      return !!(select && select.dataset.touched === "true");
    });
    const hasAnyStageUpdate = PROOF_STAGES.some((stage) => checklist[stage].status !== "pendente");
    const stagesNeedingJustification = PROOF_STAGES.filter((stage) => {
      const select = stageSelect(stage);
      const row = checklist[stage] || {};
      const touched = !!(select && select.dataset.touched === "true");
      const hasDamageDescription = stage === "retirada"
        && String(row.status || "") === "avaria"
        && (selectedDamageParts.size > 0)
        && (($("proofDamageDetails") && $("proofDamageDetails").value.trim()) || Object.values(selectedDamageNotes).some((note) => String(note || "").trim()));
      return touched && !hasDamageDescription && ["avaria", "intercorrencia", "recusa", "justificado"].includes(String(row.status || "")) && !String(row.justificativa || "").trim();
    });
    if (stagesNeedingJustification.length) {
      return setProofSubmitStatus("Preencha a justificativa das etapas: " + stagesNeedingJustification.map((stage) => checklist[stage].label || stage).join(", ") + ".", "danger");
    }

    const requiredPhotos = requiredProofPhotosForChecklist(checklist);
    const existingPhotos = proofPhotos(call);
    const selectedPhotos = REQUIRED_PHOTOS.filter((photo) => {
      const input = $(photo.input);
      return !!(input && input.files && input.files[0]);
    });
    const audioInput = $("proofAudioFiles");
    const selectedAudios = audioInput && audioInput.files ? Array.from(audioInput.files).filter(Boolean) : [];
    const missingBeforeUpload = requiredPhotos.filter((photo) => !hasPhotoType(call, photo.key) && !selectedPhotos.some((p) => p.key === photo.key));
    if (!hasStageTouchedNow && !selectedPhotos.length && !selectedAudios.length && !hasNewSignature && !signatureRefusalReason && !checklist.notes && selectedDamageParts.size === 0) {
      return setProofSubmitStatus("Toque na etapa que esta registrando agora, marque avarias no desenho ou envie pelo menos uma foto/assinatura/áudio/justificativa.", "danger");
    }
    if (missingBeforeUpload.length) {
      return setProofSubmitStatus("Faltam fotos obrigatórias para a etapa marcada: " + missingBeforeUpload.map((photo) => photo.label).join(", ") + ". Se não for possível fotografar, marque a etapa como Justificado e escreva o motivo.", "danger");
    }

    const cloud = activeCloudinaryConfig();
    const needsCloudinary = selectedPhotos.length > 0 || selectedAudios.length > 0 || hasNewSignature;
    if (needsCloudinary && (!cloud.cloudName || !cloud.uploadPreset)) {
      return setProofSubmitStatus("Cloudinary não configurado para envio de arquivos. Entre no superadmin, salve cloudName e uploadPreset, depois atualize esta tela.", "danger");
    }

    submit.disabled = true;
    setPendingOperations(1, "enviando provas");
    submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
    submit.textContent = "Enviando provas...";
    setProofSubmitStatus("Iniciando envio das provas. Não feche esta tela.", "info", false);

    try {
      const gps = await getCurrentPositionSafe();
      const uploadedPhotos = [];
      for (let i = 0; i < selectedPhotos.length; i += 1) {
        const photo = selectedPhotos[i];
        const input = $(photo.input);
        const file = input && input.files && input.files[0];
        if (!file) continue;
        const uploadKey = proofUploadItemKey(photo.input, file, 0);
        setProofUploadItem(uploadKey, { status: "compressing", progress: 2, error: "" });
        setProofSubmitStatus(`Enviando ${i + 1}/${selectedPhotos.length}: ${photo.label}...`, "info", false);
        const asset = await uploadToCloudinaryAsset(file, {
          folder: "provas/" + callId,
          onProgress: (progress) => setProofUploadItem(uploadKey, { status: "uploading", progress })
        });
        setProofUploadItem(uploadKey, { status: "success", progress: 100 });
        if (!asset || !asset.cloudinaryUrl) throw new Error("Upload sem URL retornada para " + photo.label + ".");
        uploadedPhotos.push(Object.assign({}, asset, {
          type: photo.key,
          label: photo.label,
          callId,
          uploadedBy: state.user.uid,
          uploadedByName: state.profile.nome || state.user.email
        }));
      }

      const existingAudios = proofAudios(call);
      const uploadedAudios = [];
      for (let i = 0; i < selectedAudios.length; i += 1) {
        const file = selectedAudios[i];
        const uploadKey = proofUploadItemKey("proofAudioFiles", file, i);
        const duration = await getMediaDuration(file);
        setProofUploadItem(uploadKey, { status: "uploading", progress: 1, error: "" });
        setProofSubmitStatus(`Enviando áudio ${i + 1}/${selectedAudios.length}: ${file.name || "áudio"}...`, "info", false);
        const asset = await uploadToCloudinaryAsset(file, {
          folder: "audios/" + callId,
          resourceType: "auto",
          onProgress: (progress) => setProofUploadItem(uploadKey, { status: "uploading", progress })
        });
        setProofUploadItem(uploadKey, { status: "success", progress: 100 });
        if (!asset || !asset.cloudinaryUrl) throw new Error("Upload sem URL retornada para áudio " + (file.name || (i + 1)) + ".");
        uploadedAudios.push(Object.assign({}, asset, {
          id: "audio_" + Date.now() + "_" + i,
          type: "audio",
          label: file.name || "Áudio do atendimento",
          filename: file.name || "audio",
          mimeType: file.type || "audio",
          duration,
          bytes: asset.bytes || file.size || 0,
          callId,
          vehicleId: call.vehicleId || "",
          driverId: state.user.uid,
          uploadedBy: state.user.uid,
          uploadedByName: state.profile.nome || state.user.email,
          senderType: "driver",
          visibility: "internal",
          approvedForClient: false,
          approvedForInsurance: false
        }));
      }
      const proofAudiosMerged = existingAudios.concat(uploadedAudios);
      const replacedTypes = new Set(uploadedPhotos.map((photo) => photo.type));
      const proofPhotosMerged = existingPhotos.filter((photo) => !replacedTypes.has(photo.type)).concat(uploadedPhotos);
      let customerSignature = call.customerSignature || null;
      const phaseSignatures = Object.assign({}, call.phaseSignatures || {});
      const sigBlob = await signatureBlob();
      if (sigBlob) {
        setProofSubmitStatus("Enviando assinatura do cliente...", "info", false);
        const sigAsset = await uploadToCloudinaryAsset(sigBlob, { folder: "assinaturas/" + callId, fileName: "assinatura-" + callId + ".png" });
        if (!sigAsset || !sigAsset.cloudinaryUrl) throw new Error("A assinatura foi enviada, mas não retornou URL.");
        const signatureData = Object.assign({}, sigAsset, {
          signatureUrl: sigAsset.cloudinaryUrl || "",
          name: $("signatureCustomerName").value.trim(),
          document: $("signatureCustomerDoc").value.trim(),
          acceptedText,
          signedAt: new Date().toISOString(),
          gps,
          phase: signaturePhase,
          driverId: state.user.uid,
          driverName: state.profile.nome || state.user.email
        });
        phaseSignatures[signaturePhase] = signatureData;
        customerSignature = signaturePhase === "entrega" || signaturePhase === "finalizacao" ? signatureData : (customerSignature || signatureData);
      } else if (customerSignature) {
        customerSignature = Object.assign({}, customerSignature, { acceptedText, reusedAt: new Date().toISOString() });
      } else if (signatureRefusalReason) {
        const signatureData = {
          refused: true,
          signatureUrl: "",
          name: $("signatureCustomerName").value.trim(),
          document: $("signatureCustomerDoc").value.trim(),
          acceptedText,
          refusalReason: signatureRefusalReason,
          signedAt: new Date().toISOString(),
          gps,
          phase: signaturePhase,
          driverId: state.user.uid,
          driverName: state.profile.nome || state.user.email
        };
        phaseSignatures[signaturePhase] = signatureData;
        customerSignature = signaturePhase === "entrega" || signaturePhase === "finalizacao" ? signatureData : (customerSignature || signatureData);
      }

      const nextCall = Object.assign({}, call, { proofChecklist: checklist, proofPhotos: proofPhotosMerged, proofAudios: proofAudiosMerged, customerSignature, phaseSignatures });
      const missingAfterUpload = requiredPhotos.filter((photo) => !proofPhotosMerged.some((saved) => saved && saved.type === photo.key && saved.cloudinaryUrl));
      const nextProofStatus = (missingAfterUpload.length === 0 && hasCompleteChecklist(nextCall) && hasOperationalPhaseAcceptances(nextCall)) ? "completo" : "parcial";
      setProofSubmitStatus("Salvando provas no chamado...", "info", false);
      const callUpdates = {
        proofChecklist: checklist,
        damageAssessment: checklist.damageAssessment,
        proofPhotos: proofPhotosMerged,
        proofAudios: proofAudiosMerged,
        customerSignature,
        phaseSignatures,
        proofStatus: nextProofStatus,
        proofMissingPhotos: missingAfterUpload.map((photo) => photo.label),
        proofUpdatedAt: new Date().toISOString(),
        proofUpdatedBy: state.user.uid,
        billingStatus: nextProofStatus === "completo" && call.billingStatus === "aguardando_provas" ? "a_faturar" : call.billingStatus || "aberto",
        timeline: arrayUnion({ at: new Date().toISOString(), by: state.profile.nome || state.user.email, text: "Motorista salvou evidências da etapa: " + (checklist[signaturePhase] && checklist[signaturePhase].label || signaturePhase) }),
        updatedAt: new Date().toISOString()
      };
      await db.collection("calls").doc(callId).set(callUpdates, { merge: true });
      await syncPublicCallFromDriver(call, callUpdates).catch((err) => console.warn("Falha ao atualizar espelho público", err));

      let auditWarning = "";
      try {
        await db.collection("callProofs").add({
          callId,
          driverId: state.user.uid,
          driverName: state.profile.nome || state.user.email,
          vehicleId: call.vehicleId || "",
          customerId: call.customerId || "",
          protocol: callProtocolLabel(call, callId),
          insurance: call.insurance || "",
          checklist,
          damageAssessment: checklist.damageAssessment,
          photos: uploadedPhotos,
          audios: uploadedAudios,
          customerSignature,
          phaseSignatures,
          proofStatus: nextProofStatus,
          gps,
          createdAt: new Date().toISOString()
        });
      } catch (proofLogErr) {
        auditWarning = " As provas foram salvas no chamado, mas o histórico callProofs não gravou: " + (proofLogErr && (proofLogErr.code || proofLogErr.message) || "sem detalhe") + ".";
        try {
          await db.collection("calls").doc(callId).set({ proofLogWarning: auditWarning, proofLogWarningAt: new Date().toISOString() }, { merge: true });
        } catch (_) {}
      }

      REQUIRED_PHOTOS.forEach((photo) => {
        const input = $(photo.input);
        if (input) input.value = "";
      });
      if ($("proofAudioFiles")) $("proofAudioFiles").value = "";
      fieldValue("signatureRefusalReason", "");
      if (signaturePad) {
        signaturePad.ctx.clearRect(0, 0, signaturePad.canvas.width, signaturePad.canvas.height);
        signaturePad.dirty = false;
        signaturePad.drawing = false;
      }
      state.calls[callId] = Object.assign({}, call, callUpdates);
      loadProofFormForCall(callId, state.calls[callId]);
      renderSavedEvidenceSummary(state.calls[callId]);
      renderProofWizard();
      const audioText = uploadedAudios.length ? (uploadedAudios.length + " áudio(s) salvo(s)") : "";
      const savedLabels = [proofPhotoLabelList(uploadedPhotos), audioText].filter(Boolean).join("; ") || "nenhuma foto/áudio novo, dados atualizados";
      const missingText = missingAfterUpload.length ? " Faltam para ficar completo: " + missingAfterUpload.map((photo) => photo.label).join(", ") + "." : "";
      const okMsg = nextProofStatus === "completo"
        ? "Provas completas e salvas. O chamado já pode ser finalizado." + auditWarning
        : "Etapa salva: " + savedLabels + "." + missingText + " As demais etapas podem continuar pendentes até o atendimento chegar nelas." + auditWarning;
      setProofSubmitStatus(okMsg, auditWarning ? "warn" : "success");
    } catch (err) {
      const detail = err && (err.code || err.message) || "falha operacional";
      proofUploadState.forEach((item, key) => {
        if (["uploading", "compressing"].includes(item.status)) setProofUploadItem(key, { status: "error", error: detail });
      });
      setProofSubmitStatus("Não consegui salvar todas as provas: " + detail + ". Os arquivos continuam selecionados para tentar novamente.", "danger");
    } finally {
      submit.disabled = false;
      submit.textContent = submit.dataset.originalText || "Concluir e salvar provas";
      setPendingOperations(-1);
    }
  });

  if ($("proofWizardTabs")) $("proofWizardTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-proof-index]");
    if (!button) return;
    setProofWizardStep(Number(button.dataset.proofIndex));
  });
  if ($("driverProofPrevBtn")) $("driverProofPrevBtn").onclick = () => setProofWizardStep(state.proofWizardStep - 1);
  if ($("driverProofNextBtn")) $("driverProofNextBtn").onclick = async () => {
    const call = requireActiveCall("avançar o checklist");
    if (!call) return;
    const checklist = collectProofChecklist(call);
    const validation = validateCurrentProofStep(checklist, false);
    if (!validation.ok) return setProofSubmitStatus(validation.message, "danger");
    const saved = await saveProofDraft({ silent: true, validate: false });
    if (saved) setProofWizardStep(state.proofWizardStep + 1);
  };
  if ($("driverSaveProofDraftBtn")) $("driverSaveProofDraftBtn").onclick = () => saveProofDraft();

  window.JM = window.JM || {};
  window.JM.motorista = {
    setStatus,
    acceptCall,
    selectCall: (id) => setActiveCall(id, { scroll: "driverPanelActive" }),
    clearActiveCall,
    openRouteForCall,
    openExternalRouteForCall,
    startRouteForCall,
    startLocationForCall: startDriverPhoneLocation,
    stopDriverPhoneLocation,
    setProofWizardStep,
    saveProofDraft,
    state
  };
  setupProofStageButtons();
  setupProofWizardLayout();
  setupSignaturePad();
  setupDamageDiagram();
  setupAccessoryChecklist();
  renderDriverConnectivity();
  renderActiveCall();
  applyMobileGpsVisibility();
  if (typeof setupCollapsiblePanels === "function") {
    setupCollapsiblePanels(document, { collapseOnMobile: true, openFirst: 1 });
    setTimeout(() => setupCollapsiblePanels(document, { collapseOnMobile: true, openFirst: 1 }), 250);
    window.addEventListener("load", () => setupCollapsiblePanels(document, { collapseOnMobile: true, openFirst: 1 }), { once: true });
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js?v=" + DRIVER_FLOW_VERSION).catch(() => {});
}());
