(async () => {
  console.clear();
  const required = [
    'driverStatusGuide','driverStatusSteps','driverQuickStatus','driverProofWizard',
    'proofWizardTabs','driverSaveProofDraftBtn','proofUploadQueue','driverSubmitProofBtn'
  ];
  const missing = required.filter((id) => !document.getElementById(id));
  console.table({
    versao: window.JM && window.JM.motorista ? 'motorista carregado' : 'motorista não carregado',
    atendimentoAtivo: window.JM?.motorista?.state?.selectedCallId || 'nenhum',
    statusUpdating: String(window.JM?.motorista?.state?.statusUpdating || false),
    etapaChecklist: String((window.JM?.motorista?.state?.proofWizardStep ?? -1) + 1),
    componentesAusentes: missing.join(', ') || 'nenhum'
  });
  if (missing.length) console.error('❌ Componentes faltando:', missing);
  else console.log('✅ Estrutura visual da Fase 2 carregada.');
  console.log('Teste manual: selecione um chamado, avance status somente uma etapa, abra Provas, salve rascunho, selecione uma foto e veja a prévia/progresso.');
})();
