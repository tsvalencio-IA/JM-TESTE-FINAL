# ENTREGA V32.7.7 — MOTORISTA COM PROVAS COMO FONTE ÚNICA

Alterações principais:
- Versionamento/cache unificado em `jm-v32-7-7-motorista-provas-fonte-unica`.
- Criada `validateCompleteProofPackage(call, checklist)` como fonte única para pendências, proofStatus, etapa concluída e bloqueio de finalização.
- Finalização não confia mais em `call.proofStatus` antigo quando ainda existem pendências.
- Carregamento, Entrega e Finalização deixam de exibir ✓ quando faltam fotos, assinatura, aceite ou responsáveis obrigatórios.
- Relatório antigo foi mantido por compatibilidade, mas recolhido como relatório complementar opcional.
- Teste novo `motorista-pendencias-v32-7-7.test.js` valida estruturalmente a nova regra.

Limites:
- Não houve teste real autenticado com Firebase/RTDB/Cloudinary/GPS físico.
- Regras de produção não foram alteradas.
