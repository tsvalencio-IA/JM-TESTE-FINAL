(async () => {
  console.clear();
  console.log("🧪 JM V32.7.1 — diagnóstico de login gestor");
  const report = {
    version: window.JM_CONFIG ? "config carregado" : "config ausente",
    firebase: !!window.firebase,
    auth: !!(window.JM && window.JM.firebase && window.JM.firebase.auth),
    app: !!(window.JM && window.JM.app),
    loginForm: !!document.getElementById("loginForm"),
    loginSubmit: !!document.getElementById("loginSubmit"),
    loginStatus: !!document.getElementById("loginStatus")
  };
  console.table(report);
  if (!report.firebase || !report.auth) {
    console.error("❌ Firebase/Auth não carregou.");
    return;
  }
  const auth = window.JM.firebase.auth;
  console.log("Usuário atual:", auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : "nenhum");
  console.log("E-mails permitidos no frontend:", (window.JM_CONFIG.auth && window.JM_CONFIG.auth.adminEmails) || []);
  if (auth.currentUser) {
    try {
      const snap = await window.JM.firebase.db.collection("users").doc(auth.currentUser.uid).get();
      console.log("Perfil Firestore:", snap.exists ? snap.data() : "não existe");
    } catch (err) {
      console.error("❌ Falha ao ler perfil:", err.code, err.message);
    }
  }
  console.log("✅ Diagnóstico concluído. Não houve gravação nem alteração de dados.");
})();
