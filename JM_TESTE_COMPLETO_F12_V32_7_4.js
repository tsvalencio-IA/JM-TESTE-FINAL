(function () {
  "use strict";

  const SUITE_VERSION = "JM-F12-V32.7.4-2026-06-11";
  const EXPECTED_APP_VERSION = "jm-v32-7-4-motorista-assinatura-header";
  const TEST_PREFIX = "TESTE_F12_";
  const DEFAULT_DRIVER_EMAIL = "moto@jm.com";
  const DEFAULT_DRIVER_UID = "Gfz0edLP9XQQDba4mDp1TeiWBRt1";

  const state = {
    suiteId: localStorage.getItem("JM_TESTE_SUITE_ID") || "",
    testCallId: localStorage.getItem("JM_TESTE_CALL_ID") || "",
    results: []
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function newSuiteId() {
    if (!state.suiteId) {
      state.suiteId = TEST_PREFIX + Date.now();
      localStorage.setItem("JM_TESTE_SUITE_ID", state.suiteId);
    }
    return state.suiteId;
  }

  function pageType() {
    if (document.getElementById("loginView") && document.getElementById("appView")) return "gestor";
    if (document.getElementById("driverLoginView") && document.getElementById("driverAppView")) return "motorista";
    if (document.getElementById("superLoginView") && document.getElementById("superAppView")) return "superadmin";
    if (/cliente-chamado/i.test(location.pathname)) return "cliente";
    if (/relatorio/i.test(location.pathname)) return "relatorio";
    return "desconhecida";
  }

  function row(name, ok, detail, level) {
    const item = {
      horario: new Date().toLocaleTimeString("pt-BR"),
      teste: name,
      resultado: ok ? "OK" : "FALHOU",
      detalhe: detail == null ? "" : String(detail),
      nivel: level || (ok ? "info" : "erro")
    };
    state.results.push(item);
    const prefix = ok ? "✅" : (item.nivel === "aviso" ? "⚠️" : "❌");
    const method = ok ? "log" : (item.nivel === "aviso" ? "warn" : "error");
    console[method](prefix + " " + name, detail == null ? "" : detail);
    return ok;
  }

  function section(title) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🧪 " + title);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  function requireFirebase() {
    if (!window.firebase || !firebase.auth || !firebase.firestore) {
      throw new Error("Firebase não está carregado nesta página.");
    }
    return {
      auth: firebase.auth(),
      db: firebase.firestore(),
      rtdb: firebase.database ? firebase.database() : null
    };
  }

  function currentUserRequired() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("Faça login no painel antes de executar este teste.");
    return user;
  }

  function valueFrom(obj, keys, fallback) {
    for (const key of keys) {
      if (obj && obj[key] != null && obj[key] !== "") return obj[key];
    }
    return fallback;
  }

  async function fetchVersion() {
    try {
      const response = await fetch("version.json?f12=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  async function testCommon() {
    section("TESTES COMUNS");
    row("Página detectada", pageType() !== "desconhecida", pageType());
    row("Firebase carregado", !!window.firebase);
    row("Módulo JM carregado", !!window.JM);
    row("Documento responsivo", document.documentElement.scrollWidth <= Math.max(document.documentElement.clientWidth + 4, window.innerWidth + 4),
      "scrollWidth=" + document.documentElement.scrollWidth + " / viewport=" + window.innerWidth,
      document.documentElement.scrollWidth <= window.innerWidth + 4 ? "info" : "aviso");

    const version = await fetchVersion();
    row("version.json acessível", !version.error, version.error || version.version);
    if (!version.error) {
      row("Versão correta", version.version === EXPECTED_APP_VERSION, version.version,
        version.version === EXPECTED_APP_VERSION ? "info" : "aviso");
    }

    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        row("Service Worker consultável", true, registrations.length + " registro(s)");
        console.table(registrations.map(function (reg) {
          return {
            escopo: reg.scope,
            ativo: reg.active && reg.active.scriptURL || "",
            aguardando: reg.waiting && reg.waiting.scriptURL || ""
          };
        }));
      } catch (error) {
        row("Service Worker consultável", false, error.message, "aviso");
      }
    }

    try {
      const response = await fetch(location.href.split("?")[0] + "?health=" + Date.now(), { cache: "no-store" });
      row("Página responde sem cache", response.ok, "HTTP " + response.status);
    } catch (error) {
      row("Página responde sem cache", false, error.message);
    }
  }

  async function testGestor() {
    section("PAINEL GESTOR");
    const api = requireFirebase();
    const user = currentUserRequired();

    row("Usuário autenticado", true, user.email + " / " + user.uid);
    row("JM.app carregado", !!(window.JM && JM.app && JM.app.state));
    row("Tela do painel aberta", document.getElementById("appView") && !document.getElementById("appView").classList.contains("hidden"));
    row("Central operacional", !!document.getElementById("view-operacao"));
    row("Formulário de chamado", !!document.getElementById("callForm"));
    row("Assistente IA", !!document.getElementById("aiSourceText"));
    row("Mapa da frota", !!document.getElementById("fleetMap"));
    row("Financeiro", !!document.getElementById("financeForm"));
    row("Pagamentos", !!document.getElementById("paymentForm"));
    row("Frota/manutenção", !!document.getElementById("vehicleForm") && !!document.getElementById("maintenanceForm"));
    row("Equipe", !!document.getElementById("teamForm"));
    row("Final UX carregado", !!document.querySelector('script[src*="final-ux.js"]'));

    const collections = ["calls", "vehicles", "users", "expenses", "transactions", "maintenance", "customers", "trackerProviders"];
    for (const collection of collections) {
      try {
        const snap = await api.db.collection(collection).limit(3).get();
        row("Leitura Firestore: " + collection, true, snap.size + " amostra(s)");
      } catch (error) {
        row("Leitura Firestore: " + collection, false, error.code || error.message);
      }
    }

    try {
      const privateSnap = await api.db.collection("settings").doc("integrations").get();
      const data = privateSnap.exists ? privateSnap.data() : null;
      row("settings/integrations", !!data, data ? "encontrado" : "ausente", data ? "info" : "aviso");
      if (data) {
        row("Tracker configurado", !!(data.tracker && data.tracker.endpoint), data.tracker && data.tracker.endpoint || "faltando", "aviso");
        row("GPS celular configurado", !!(data.mobileGps && data.mobileGps.databaseURL), data.mobileGps && data.mobileGps.databaseURL || "faltando", "aviso");
        row("Cloudinary configurado", !!(data.cloudinary && data.cloudinary.cloudName && data.cloudinary.uploadPreset),
          data.cloudinary ? JSON.stringify({
            cloudName: data.cloudinary.cloudName || "",
            uploadPreset: data.cloudinary.uploadPreset || "",
            folder: data.cloudinary.folder || ""
          }) : "faltando",
          "aviso");
      }
    } catch (error) {
      row("settings/integrations", false, error.code || error.message);
    }

    try {
      const publicSnap = await api.db.collection("settings").doc("publicIntegrations").get();
      const data = publicSnap.exists ? publicSnap.data() : null;
      row("settings/publicIntegrations", !!data, data ? "encontrado" : "ausente", data ? "info" : "aviso");
      if (data) row("Documento público sem token RAFA", !JSON.stringify(data).toLowerCase().includes("token"), "segredo não exposto");
    } catch (error) {
      row("settings/publicIntegrations", false, error.code || error.message, "aviso");
    }

    await testInsuranceParser();
    await testRouteAndPricing();

    if (window.JM && JM.app && JM.app.state) {
      const s = JM.app.state;
      console.table({
        chamados: Object.keys(s.calls || {}).length,
        veiculos: Object.keys(s.vehicles || {}).length,
        usuarios: Object.keys(s.users || {}).length,
        despesas: Object.keys(s.expenses || {}).length,
        transacoes: Object.keys(s.transactions || {}).length,
        manutencoes: Object.keys(s.maintenance || {}).length
      });
    }
  }

  async function testInsuranceParser() {
    section("ASSISTENTE IA / PARSER");
    if (!(window.JM && JM.app && typeof JM.app.parseInsuranceText === "function")) {
      row("Parser do Assistente IA disponível", false, "JM.app.parseInsuranceText ausente");
      return;
    }

    const sample = [
      "Item de Cobertura",
      "Finalizado",
      "Situação",
      "R$ 807,00",
      "Valor Total",
      "80.06 km",
      "Percurso Total",
      "32.55 km",
      "Distância da Base",
      "Miller Vinicius da Silva",
      "Técnico",
      "Ordem de Serviço",
      "A26052668515/1",
      "Cliente",
      "ALFA SEGUROS",
      "Solicitante",
      "Thiago",
      "Beneficiário",
      "GELO PEROLA RIO PRETO LTDA",
      "Telefone do Beneficiário",
      "(17) 99101-2151",
      "Veículo",
      "1016 /31 ACCELO 4X2 2P. DIES.",
      "Placa",
      "FJW9092",
      "Endereço",
      "Origem",
      "SP-320, ..., Tanabi",
      "Estr. Mun. Euclídes da Cunha, 451, Tanabi - SP, 15170-000",
      "Destino",
      "Rua Thessalônico Barbosa, 400, Distrito Industrial, São José do Rio Preto",
      "Estr. Mun. Euclídes da Cunha, 451, Tanabi - SP, 15170-000",
      "Ponto de referência: próximo ao recinto disposição",
      "Tarifas",
      "KM COBERTURA\tMaxpar\tR$ 5,50\t34\tR$ 187,00",
      "SAIDA\tMaxpar\tR$ 500,00\t1\tR$ 500,00",
      "HORA TRABALHADA\tMaxpar\tR$ 120,00\t1\tR$ 120,00",
      "Total\tR$ 807,00"
    ].join("\n");

    try {
      const parsed = JM.app.parseInsuranceText(sample);
      console.log("Resultado bruto do parser:", parsed);
      const amount = Number(valueFrom(parsed, ["amount", "totalValue", "valor"], 0));
      const origin = String(valueFrom(parsed, ["origin", "originAddress", "originLabel"], ""));
      const destination = String(valueFrom(parsed, ["destination", "destinationAddress", "destLabel"], ""));
      row("Parser executou", true);
      row("Valor oficial R$ 807", amount === 807, amount);
      row("Origem contém Tanabi", /tanabi/i.test(origin), origin);
      row("Destino contém Rio Preto", /rio preto/i.test(destination), destination);
      row("Destino não contém Tanabi", !/tanabi/i.test(destination), destination);
      row("Status externo separado", parsed.externalStatus === "Finalizado", parsed.externalStatus || "");
    } catch (error) {
      row("Parser executou", false, error.message);
    }
  }

  async function testRouteAndPricing() {
    section("ROTA / PREÇO / PEDÁGIO");
    const router = window.JM && (JM.freeRouter || JM.googleMaps);
    if (!router || typeof router.routeThroughPoints !== "function") {
      row("Motor de rota disponível", false, "JM.freeRouter.routeThroughPoints ausente");
      return;
    }

    const points = [
      { lat: -20.6251, lng: -49.6492 },
      { lat: -20.8113, lng: -49.3758 }
    ];

    try {
      const route = await router.routeThroughPoints(points, {});
      row("Rota calculada", !!route, route && route.source || "");
      row("Distância válida", !!route && Number(route.distanceMeters) > 1000,
        route ? (route.distanceMeters / 1000).toFixed(2) + " km" : "");
      row("Geometria válida", !!(route && route.geometry && Array.isArray(route.geometry.coordinates) && route.geometry.coordinates.length >= 2),
        route && route.geometry && route.geometry.coordinates && route.geometry.coordinates.length + " ponto(s)");

      if (window.JM && JM.app && typeof JM.app.calculateRoutePricing === "function") {
        const result = JM.app.calculateRoutePricing(
          { rawPrice: "807,00", priceMode: "manual", extraKm: 0 },
          route,
          {
            enabled: true,
            baseFare: 500,
            pricePerKm: 5.5,
            pricePerReturnKm: 0,
            includeReturnKm: false,
            includeTolls: true,
            defaultVehicleClass: "leve",
            roundingMode: "up_1",
            tollRouteToleranceMeters: 500
          }
        );
        console.log("Resultado de preço:", result);
        row("Preço manual preservado", result.pricingSuggestion.manualPriceLocked === true &&
          Number(result.pricingSuggestion.finalValue) === 807,
          result.pricingSuggestion);
        row("Pedágio calculado sem duplicidade", Number.isFinite(Number(result.tollEstimate.total)),
          result.tollEstimate);
      } else {
        row("Motor de preço disponível", false, "JM.app.calculateRoutePricing ausente");
      }
    } catch (error) {
      row("Rota calculada", false, error.message);
    }
  }

  async function testMotorista() {
    section("PAINEL MOTORISTA");
    const api = requireFirebase();
    const user = currentUserRequired();

    row("Motorista autenticado", true, user.email + " / " + user.uid);
    row("JM.motorista carregado", !!(window.JM && JM.motorista && JM.motorista.state));
    row("Painel aberto", document.getElementById("driverAppView") && !document.getElementById("driverAppView").classList.contains("hidden"));
    row("Atendimento ativo", !!document.getElementById("driverActiveCallBox"));
    row("Lista de chamados", !!document.getElementById("driverCallsBox"));
    row("GPS presente", !!document.getElementById("driverPanelLocation"));
    row("Botão ativar GPS", !!document.getElementById("driverStartLocationBtn"));
    row("Botão parar GPS", !!document.getElementById("driverStopLocationBtn"));
    row("Checklist em etapas", !!document.getElementById("driverProofWizard"));
    row("Prancha de avarias", !!document.getElementById("damageDiagram"));
    row("Múltiplos áudios", !!document.getElementById("proofAudioFiles"));
    row("Assinatura", !!document.getElementById("signatureCanvas"));
    row("Atalho assinatura", !!document.getElementById("driverOpenSignatureBtn"));
    row("Cabeçalho legível", !!document.getElementById("driverRuntimeDetails") && !!document.getElementById("driverRuntimeSummary"));
    row("Despesa rápida", !!document.getElementById("driverExpenseForm"));
    row("Mapa", !!document.getElementById("driverMap"));

    try {
      const profile = await api.db.collection("users").doc(user.uid).get();
      row("Perfil do motorista", profile.exists, profile.exists ? JSON.stringify(profile.data()) : "ausente");
    } catch (error) {
      row("Perfil do motorista", false, error.code || error.message);
    }

    try {
      const calls = await api.db.collection("calls").where("driverId", "==", user.uid).limit(20).get();
      row("Consulta de chamados por driverId", true, calls.size + " chamado(s)");
      console.table(calls.docs.map(function (doc) {
        const d = doc.data();
        return {
          id: doc.id,
          status: d.statusKey || d.status || "",
          protocolo: d.protocolo || d.protocol || "",
          cliente: d.cliente || d.client || d.clientName || ""
        };
      }));
    } catch (error) {
      row("Consulta de chamados por driverId", false, error.code || error.message);
    }

    try {
      const publicSnap = await api.db.collection("settings").doc("publicIntegrations").get();
      const data = publicSnap.exists ? publicSnap.data() : null;
      row("Configuração pública acessível", !!data, data ? "encontrada" : "ausente");
      if (data) {
        row("RTDB configurado", !!(data.mobileGps && data.mobileGps.databaseURL),
          data.mobileGps && data.mobileGps.databaseURL || "faltando", "aviso");
        row("Cloudinary configurado", !!(data.cloudinary && data.cloudinary.cloudName && data.cloudinary.uploadPreset),
          data.cloudinary ? JSON.stringify(data.cloudinary) : "faltando", "aviso");
        row("Token privado não exposto", !JSON.stringify(data).toLowerCase().includes("token"), "seguro");
      }
    } catch (error) {
      row("Configuração pública acessível", false, error.code || error.message);
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        row("Permissão de localização", permission.state !== "denied", permission.state,
          permission.state === "denied" ? "aviso" : "info");
      } catch (error) {
        row("Permissão de localização consultável", false, error.message, "aviso");
      }
    }
  }

  async function testSuperadmin() {
    section("SUPERADMIN");
    const api = requireFirebase();
    const user = currentUserRequired();

    row("Superadmin autenticado", true, user.email + " / " + user.uid);
    row("Painel aberto", document.getElementById("superAppView") && !document.getElementById("superAppView").classList.contains("hidden"));
    row("Cadastro empresa", !!document.getElementById("companyForm"));
    row("Cadastro equipe", !!document.getElementById("adminUserForm"));
    row("Tracker legado", !!document.getElementById("trackerForm"));
    row("Múltiplos rastreadores", !!document.getElementById("trackerProviderForm"));
    row("Cloudinary", !!document.getElementById("superCloudForm"));
    row("Google Maps opcional", !!document.getElementById("superGoogleMapsForm"));
    row("GPS celular", !!document.getElementById("superMobileGpsForm"));

    try {
      const integrations = await api.db.collection("settings").doc("integrations").get();
      const data = integrations.exists ? integrations.data() : null;
      row("settings/integrations", !!data, data ? "encontrado" : "ausente");
      if (data) {
        row("Tracker endpoint", !!(data.tracker && data.tracker.endpoint), data.tracker && data.tracker.endpoint || "faltando", "aviso");
        row("Tracker token", !!(data.tracker && data.tracker.token), data.tracker && data.tracker.token ? "presente" : "faltando", "aviso");
        row("Cloudinary", !!(data.cloudinary && data.cloudinary.cloudName && data.cloudinary.uploadPreset),
          data.cloudinary ? JSON.stringify(data.cloudinary) : "faltando", "aviso");
        row("GPS/RTDB", !!(data.mobileGps && data.mobileGps.databaseURL),
          data.mobileGps ? JSON.stringify(data.mobileGps) : "faltando", "aviso");
      }
    } catch (error) {
      row("settings/integrations", false, error.code || error.message);
    }

    try {
      const providers = await api.db.collection("trackerProviders").limit(20).get();
      row("Provedores de rastreador", true, providers.size + " provedor(es)");
      console.table(providers.docs.map(function (doc) {
        const d = doc.data();
        return { id: doc.id, nome: d.name || "", tipo: d.providerType || "", ativo: d.active !== false };
      }));
    } catch (error) {
      row("Provedores de rastreador", false, error.code || error.message);
    }

    try {
      const vehicles = await api.db.collection("vehicles").limit(20).get();
      row("Veículos cadastrados", true, vehicles.size + " veículo(s)");
    } catch (error) {
      row("Veículos cadastrados", false, error.code || error.message);
    }
  }

  async function createScenario() {
    section("CRIAR CENÁRIO E2E DE TESTE");
    if (pageType() !== "gestor") throw new Error("Execute createScenario() no jm.html, logado como gestor.");
    const api = requireFirebase();
    const user = currentUserRequired();
    const suiteId = newSuiteId();
    const callId = suiteId + "_CALL";
    state.testCallId = callId;
    localStorage.setItem("JM_TESTE_CALL_ID", callId);

    let driver = { uid: DEFAULT_DRIVER_UID, email: DEFAULT_DRIVER_EMAIL, nome: "Miller" };
    try {
      const snap = await api.db.collection("users").where("email", "==", DEFAULT_DRIVER_EMAIL).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        driver = Object.assign({ uid: doc.id }, doc.data());
      }
    } catch (_) {}

    let vehicleId = "";
    let vehiclePlate = "";
    if (window.JM && JM.app && JM.app.state) {
      const vehicle = Object.values(JM.app.state.vehicles || {})[0];
      if (vehicle) {
        vehicleId = vehicle.id || "";
        vehiclePlate = vehicle.placa || vehicle.plate || "";
      }
    }

    const data = {
      testMode: true,
      testSuiteId: suiteId,
      deleted: false,
      archived: false,
      source: "DevTools F12",
      sourceType: "devtools_e2e",
      statusKey: "despachado",
      status: "Despachado",
      operationalStatus: "despachado",
      routeValidationStatus: "validado",
      protocolo: "F12-" + Date.now(),
      protocol: "F12-" + Date.now(),
      cliente: "CLIENTE TESTE F12",
      client: "CLIENTE TESTE F12",
      clientName: "CLIENTE TESTE F12",
      beneficiary: "CLIENTE TESTE F12",
      phone: "(17) 99999-0000",
      serviceType: "Guincho plataforma",
      customerVehicle: "VEÍCULO TESTE",
      customerPlate: "F12T123",
      insurance: "SEGURADORA TESTE",
      insuranceProtocol: "PROTOCOLO F12",
      valor: 807,
      value: 807,
      amount: 807,
      priceMode: "manual",
      manualPriceLocked: true,
      pricingSource: "devtools_e2e",
      billingStatus: "a_faturar",
      financePending: true,
      originLabel: "Tanabi, SP, Brasil",
      destLabel: "Rua Thessalônico Barbosa, 400, São José do Rio Preto, SP, Brasil",
      destinationLabel: "Rua Thessalônico Barbosa, 400, São José do Rio Preto, SP, Brasil",
      originAddress: {
        label: "Tanabi, SP, Brasil",
        coords: { lat: -20.6251, lng: -49.6492 },
        source: "devtools_e2e"
      },
      destinationAddress: {
        label: "Rua Thessalônico Barbosa, 400, São José do Rio Preto, SP, Brasil",
        coords: { lat: -20.8113, lng: -49.3758 },
        source: "devtools_e2e"
      },
      origem: {
        label: "Tanabi, SP, Brasil",
        coords: { lat: -20.6251, lng: -49.6492 },
        source: "devtools_e2e"
      },
      destino: {
        label: "Rua Thessalônico Barbosa, 400, São José do Rio Preto, SP, Brasil",
        coords: { lat: -20.8113, lng: -49.3758 },
        source: "devtools_e2e"
      },
      driverId: driver.uid || DEFAULT_DRIVER_UID,
      driverUid: driver.uid || DEFAULT_DRIVER_UID,
      assignedDriverId: driver.uid || DEFAULT_DRIVER_UID,
      driverEmail: driver.email || DEFAULT_DRIVER_EMAIL,
      driverName: driver.nome || driver.name || "Miller",
      vehicleId: vehicleId,
      vehiclePlate: vehiclePlate,
      fleetVehiclePlate: vehiclePlate,
      proofPhotos: [],
      proofAudios: [],
      proofChecklist: {},
      publicProofsEnabled: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid,
      createdByEmail: user.email || ""
    };

    await api.db.collection("calls").doc(callId).set(data);
    row("Chamado E2E criado", true, callId);
    row("Motorista vinculado", true, data.driverEmail + " / " + data.driverId);
    row("Valor manual preservado", data.valor === 807 && data.manualPriceLocked === true, "R$ 807,00");

    await new Promise(function (resolve) { setTimeout(resolve, 2000); });
    const check = await api.db.collection("calls").doc(callId).get();
    row("Chamado continua salvo", check.exists, check.exists ? "persistente" : "sumiu");

    console.log("➡️ Próximo passo: abra motorista.html, entre com " + DEFAULT_DRIVER_EMAIL + ", cole o mesmo script e execute:");
    console.log("await JM_TESTE.selectTestCall()");
    console.log("Depois: await JM_TESTE.liveGps()");
    console.log("Depois: await JM_TESTE.driverExpense()");
    console.log("Depois: await JM_TESTE.driverStatus()");
    return { callId, suiteId, driver, vehicleId, vehiclePlate };
  }

  async function selectTestCall() {
    section("SELECIONAR CHAMADO E2E");
    if (pageType() !== "motorista") throw new Error("Execute selectTestCall() no motorista.html.");
    const api = requireFirebase();
    const user = currentUserRequired();
    const savedId = localStorage.getItem("JM_TESTE_CALL_ID");

    let doc = null;
    if (savedId) {
      const snap = await api.db.collection("calls").doc(savedId).get();
      if (snap.exists) doc = snap;
    }
    if (!doc) {
      const snap = await api.db.collection("calls")
        .where("driverId", "==", user.uid)
        .limit(30)
        .get();
      doc = snap.docs.find(function (item) {
        const d = item.data();
        return d.testMode === true && String(d.testSuiteId || "").startsWith(TEST_PREFIX);
      }) || null;
    }
    if (!doc) throw new Error("Nenhum chamado de teste F12 foi encontrado para este motorista.");

    state.testCallId = doc.id;
    state.suiteId = doc.data().testSuiteId || state.suiteId;
    localStorage.setItem("JM_TESTE_CALL_ID", doc.id);
    localStorage.setItem("JM_TESTE_SUITE_ID", state.suiteId);

    if (window.JM && JM.motorista && typeof JM.motorista.selectCall === "function") {
      JM.motorista.selectCall(doc.id);
      row("Chamado selecionado pela lógica do painel", true, doc.id);
    } else {
      row("Chamado selecionado pela lógica do painel", false, "JM.motorista.selectCall ausente");
    }
    return { id: doc.id, data: doc.data() };
  }

  async function liveGps() {
    section("GPS REAL / RTDB");
    if (pageType() !== "motorista") throw new Error("Execute liveGps() no motorista.html.");
    const api = requireFirebase();
    const user = currentUserRequired();
    const callId = state.testCallId || localStorage.getItem("JM_TESTE_CALL_ID");
    if (!callId) throw new Error("Selecione o chamado de teste antes: await JM_TESTE.selectTestCall()");

    if (!(window.JM && JM.motorista && typeof JM.motorista.startLocationForCall === "function")) {
      throw new Error("JM.motorista.startLocationForCall não está disponível.");
    }

    console.log("📍 O navegador solicitará permissão de localização. Clique em PERMITIR.");
    await JM.motorista.startLocationForCall(callId);
    row("Comando para ativar GPS executado", true, callId);

    await new Promise(function (resolve) { setTimeout(resolve, 7000); });

    if (!api.rtdb) {
      row("Realtime Database carregado", false, "firebase.database() ausente");
      return;
    }

    const snap = await api.rtdb.ref("mobileGps/calls/" + callId).once("value");
    const point = snap.val();
    row("Ponto GPS salvo no RTDB", !!(point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))),
      point || "não encontrado");

    if (point) {
      row("driverId do GPS correto", point.driverId === user.uid, point.driverId);
      row("callId do GPS correto", point.callId === callId, point.callId);
      row("Coordenadas não são 0,0", Number(point.lat) !== 0 && Number(point.lng) !== 0,
        point.lat + "," + point.lng);
    }

    console.log("🛑 Para parar o GPS depois: await JM_TESTE.stopGps()");
    return point;
  }

  async function stopGps() {
    if (pageType() !== "motorista") throw new Error("Execute stopGps() no motorista.html.");
    if (window.JM && JM.motorista && typeof JM.motorista.stopDriverPhoneLocation === "function") {
      await JM.motorista.stopDriverPhoneLocation();
      row("GPS parado pela lógica do painel", true);
    } else {
      row("GPS parado pela lógica do painel", false, "função ausente");
    }
  }

  async function driverExpense() {
    section("DESPESA DO MOTORISTA");
    if (pageType() !== "motorista") throw new Error("Execute driverExpense() no motorista.html.");
    const api = requireFirebase();
    const user = currentUserRequired();
    const callId = state.testCallId || localStorage.getItem("JM_TESTE_CALL_ID");
    if (!callId) throw new Error("Selecione o chamado de teste antes.");

    const callSnap = await api.db.collection("calls").doc(callId).get();
    if (!callSnap.exists) throw new Error("Chamado de teste não existe.");
    const call = callSnap.data();

    const payload = {
      testMode: true,
      testSuiteId: call.testSuiteId || state.suiteId || newSuiteId(),
      callId: callId,
      vehicleId: call.vehicleId || "",
      type: "Combustível",
      amount: 1.23,
      notes: "Despesa automática de teste F12 — pode ser removida",
      status: "pendente",
      driverId: user.uid,
      driverName: user.email || "Motorista",
      protocol: call.protocolo || call.protocol || "",
      billingParty: call.cliente || call.client || "",
      vehicleCost: !!call.vehicleId,
      vehicleCostKind: "operational",
      vehicleCostCategory: "Combustível",
      createdAt: nowIso()
    };

    const ref = await api.db.collection("expenses").add(payload);
    row("Despesa criada", true, ref.id);

    const check = await ref.get();
    row("Despesa permanece salva", check.exists, check.exists ? check.data() : "sumiu");
    return { id: ref.id, data: payload };
  }

  async function driverStatus() {
    section("STATUS DO MOTORISTA");
    if (pageType() !== "motorista") throw new Error("Execute driverStatus() no motorista.html.");
    const api = requireFirebase();
    const callId = state.testCallId || localStorage.getItem("JM_TESTE_CALL_ID");
    if (!callId) throw new Error("Selecione o chamado de teste antes.");

    const snap = await api.db.collection("calls").doc(callId).get();
    if (!snap.exists) throw new Error("Chamado não encontrado.");
    const call = snap.data();
    const current = call.statusKey || call.operationalStatus || call.status || "";

    let next = "motorista_a_caminho";
    if (/a_caminho/i.test(current)) next = "motorista_no_local";
    else if (/no_local/i.test(current)) next = "carregado";

    if (window.JM && JM.motorista && typeof JM.motorista.setStatus === "function") {
      await JM.motorista.setStatus(callId, next);
      row("Atualização de status solicitada pela lógica do painel", true, current + " -> " + next);
    } else {
      throw new Error("JM.motorista.setStatus não está disponível.");
    }

    await new Promise(function (resolve) { setTimeout(resolve, 1500); });
    const after = await api.db.collection("calls").doc(callId).get();
    const data = after.data() || {};
    row("Status persistiu", (data.statusKey || data.operationalStatus || data.status) !== current,
      data.statusKey || data.operationalStatus || data.status);
    return data;
  }

  async function verifyScenario() {
    section("VERIFICAÇÃO E2E NO GESTOR");
    if (pageType() !== "gestor") throw new Error("Execute verifyScenario() no jm.html.");
    const api = requireFirebase();
    const callId = state.testCallId || localStorage.getItem("JM_TESTE_CALL_ID");
    if (!callId) throw new Error("Nenhum chamado de teste registrado.");

    const callSnap = await api.db.collection("calls").doc(callId).get();
    row("Chamado de teste existe", callSnap.exists, callId);
    if (callSnap.exists) {
      const call = callSnap.data();
      console.log("Chamado:", call);
      row("Motorista vinculado", !!call.driverId, call.driverId);
      row("Valor oficial preservado", Number(call.valor || call.value || call.amount) === 807,
        call.valor || call.value || call.amount);
      row("Status atualizado", !!(call.statusKey || call.operationalStatus || call.status),
        call.statusKey || call.operationalStatus || call.status);
    }

    const expenses = await api.db.collection("expenses").where("testSuiteId", "==", state.suiteId || localStorage.getItem("JM_TESTE_SUITE_ID")).get();
    row("Despesa do motorista chegou ao gestor", expenses.size > 0, expenses.size + " despesa(s)");
    console.table(expenses.docs.map(function (doc) {
      const d = doc.data();
      return { id: doc.id, tipo: d.type, valor: d.amount, status: d.status, callId: d.callId, vehicleId: d.vehicleId };
    }));

    if (api.rtdb) {
      const gps = await api.rtdb.ref("mobileGps/calls/" + callId).once("value");
      row("GPS do chamado visível no RTDB", gps.exists(), gps.val() || "ausente", "aviso");
    }
  }

  async function cleanup() {
    section("LIMPEZA DOS DADOS DE TESTE");
    if (pageType() !== "gestor" && pageType() !== "superadmin") {
      throw new Error("Execute cleanup() no jm.html ou superadmin.html com perfil autorizado.");
    }

    const api = requireFirebase();
    currentUserRequired();
    const suiteId = state.suiteId || localStorage.getItem("JM_TESTE_SUITE_ID");
    const callId = state.testCallId || localStorage.getItem("JM_TESTE_CALL_ID");
    if (!suiteId && !callId) throw new Error("Nenhum cenário de teste registrado.");

    const collections = ["expenses", "transactions", "maintenance", "callProofs", "integrationInbox"];
    for (const collection of collections) {
      try {
        const snap = await api.db.collection(collection).where("testSuiteId", "==", suiteId).get();
        for (const doc of snap.docs) await doc.ref.delete();
        row("Limpeza " + collection, true, snap.size + " removido(s)");
      } catch (error) {
        row("Limpeza " + collection, false, error.code || error.message, "aviso");
      }
    }

    if (callId) {
      try {
        await api.db.collection("calls").doc(callId).delete();
        row("Chamado de teste removido", true, callId);
      } catch (error) {
        row("Chamado de teste removido", false, error.code || error.message);
      }

      if (api.rtdb) {
        try {
          await api.rtdb.ref("mobileGps/calls/" + callId).remove();
          row("GPS do chamado removido do RTDB", true);
        } catch (error) {
          row("GPS do chamado removido do RTDB", false, error.message, "aviso");
        }
      }
    }

    localStorage.removeItem("JM_TESTE_SUITE_ID");
    localStorage.removeItem("JM_TESTE_CALL_ID");
    state.suiteId = "";
    state.testCallId = "";
    row("Estado local limpo", true);
  }

  function report() {
    section("RELATÓRIO FINAL");
    console.table(state.results);
    const failures = state.results.filter(function (item) { return item.resultado === "FALHOU"; });
    console.log(failures.length
      ? "⚠️ " + failures.length + " teste(s) falharam. Copie somente as linhas vermelhas para análise."
      : "✅ TODOS OS TESTES EXECUTADOS NESTA ETAPA PASSARAM.");
    return {
      suiteVersion: SUITE_VERSION,
      page: pageType(),
      suiteId: state.suiteId,
      testCallId: state.testCallId,
      results: state.results.slice()
    };
  }

  async function run() {
    state.results.length = 0;
    console.clear();
    console.log("JM TESTE COMPLETO F12", SUITE_VERSION);
    await testCommon();

    const type = pageType();
    if (type === "gestor") await testGestor();
    else if (type === "motorista") await testMotorista();
    else if (type === "superadmin") await testSuperadmin();
    else row("Painel suportado", false, "Abra jm.html, motorista.html ou superadmin.html.");

    return report();
  }

  window.JM_TESTE = {
    version: SUITE_VERSION,
    run,
    report,
    createScenario,
    selectTestCall,
    liveGps,
    stopGps,
    driverExpense,
    driverStatus,
    verifyScenario,
    cleanup,
    testInsuranceParser,
    testRouteAndPricing,
    state
  };

  console.log("✅ JM_TESTE carregado.");
  console.log("Execute: await JM_TESTE.run()");
  console.log("Fluxo E2E: gestor createScenario → motorista selectTestCall/liveGps/driverExpense/driverStatus → gestor verifyScenario/cleanup");
})();