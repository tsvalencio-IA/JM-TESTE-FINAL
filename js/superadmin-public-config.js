(function () {
  "use strict";
  const VERSION = "jm-v32-7-3-login-sem-travamento";
  const jm = window.JM || {};
  const firebaseApi = jm.firebase;
  if (!firebaseApi || !firebaseApi.db || !firebaseApi.auth) return;
  const db = firebaseApi.db;
  const auth = firebaseApi.auth;

  function publicPayload(data) {
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
      publishedBy: auth.currentUser && auth.currentUser.uid || "",
      version: VERSION
    };
  }

  async function publish(data) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await db.collection("settings").doc("publicIntegrations").set(publicPayload(data), { merge: true });
      console.info("Configuração pública do motorista sincronizada", VERSION);
    } catch (error) {
      console.warn("Não foi possível publicar settings/publicIntegrations", error);
    }
  }

  auth.onAuthStateChanged((user) => {
    if (!user) return;
    db.collection("settings").doc("integrations").onSnapshot((snapshot) => {
      if (snapshot.exists) publish(snapshot.data());
    }, (error) => console.warn("Integrações privadas indisponíveis", error));
  });
})();
