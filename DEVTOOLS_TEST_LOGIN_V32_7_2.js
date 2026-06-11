(async () => {
  console.clear();
  console.log("JM V32.7.2 — diagnóstico de login");
  if (!window.firebase || !window.JM || !JM.firebase) return console.error("Firebase/JM não carregado.");
  const user = JM.firebase.auth.currentUser;
  console.table({
    versaoEsperada: "jm-v32-7-4-motorista-assinatura-header",
    usuarioAutenticado: !!user,
    email: user && user.email || "sem sessão",
    uid: user && user.uid || "-",
    loginVisivel: !document.getElementById("loginView").classList.contains("hidden"),
    appVisivel: !document.getElementById("appView").classList.contains("hidden"),
    botaoDesabilitado: document.getElementById("loginSubmit").disabled
  });
  if (user) {
    try {
      const snap = await JM.firebase.db.collection("users").doc(user.uid).get();
      console.log("Perfil próprio:", snap.exists ? snap.data() : "NÃO EXISTE");
    } catch (error) {
      console.error("Falha ao ler perfil próprio:", error);
    }
  }
})();
