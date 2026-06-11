# JM Guinchos V32.7.3 — Login sem travamento

## Causa real
O arquivo `js/final-ux.js` mantinha um `MutationObserver` global no `document.body`. Quando nenhum chamado estava selecionado, `renderDispatchAdvisor()` regravava `innerHTML` em toda execução, mesmo sem mudança de estado. Essa gravação criava nova mutação, que chamava a função novamente, formando um ciclo contínuo e bloqueando a thread principal. Por isso nem os campos de e-mail e senha aceitavam clique.

## Correções
- Estado vazio do despacho agora possui assinatura e não regrava o DOM sem necessidade.
- Recursos pesados de UX só inicializam quando `appView` fica visível após o login.
- Observer dinâmico foi limitado ao painel da aplicação.
- Atualizações foram agrupadas com `requestAnimationFrame`.
- Login, perfis, Firebase, Firestore Rules e RTDB Rules foram preservados.
- Cache unificado em `jm-v32-7-4-motorista-assinatura-header`.
