# Entrega — estabilização do painel motorista JM

Base usada: `JM-TESTE-FINAL-main.zip` enviado pelo Thiago.

## Arquivos alterados
- `js/motorista-final-ux.js`
- `css/final-ux.css`

## O que foi corrigido
1. Removido o `MutationObserver` global sobre `document.body` do painel motorista.
   - Motivo: esse tipo de observador pode entrar em ciclo, travar clique, campo de login e rolagem no celular.
   - Substituição: atualização segura por eventos pontuais, `online` e dois refreshes controlados.

2. Reforçado o layout mobile do painel motorista.
   - Cabeçalho passa a quebrar em linhas no celular.
   - Botões Atualizar/Sair ficam em grid, sem sobrepor textos.
   - Painéis ficam em uma coluna no mobile.
   - Ações sticky do atendimento e provas foram neutralizadas para não ficarem amontoadas sobre outros elementos.

3. GPS do celular fica sempre visível.
   - O painel `driverPanelLocation` não desaparece silenciosamente.
   - O status do GPS continua mostrando se está aguardando chamado, desativado pela empresa, sem permissão ou pronto.

4. Assinatura fica forçada como visível e utilizável.
   - `driverSignatureSection` não pode ficar escondido por CSS.
   - `signatureCanvas` ocupa 100% da largura no celular.
   - O canvas permite rolagem quando modo assinatura está desligado e bloqueia rolagem somente quando o modo assinatura está ligado.

## Testes executados localmente
- `npm run check:js` — passou.
- `node tests/run-all.js` — passou.

## Não alterado
- Não alterei Firebase Rules.
- Não alterei RTDB Rules.
- Não alterei credenciais.
- Não mexi em `motorista.js`, `app.js`, `firebase.js`, `config.firebase.js`, `jm.html`, `superadmin.html` ou `service-worker.js`.
- Não misturei arquivos de outras versões.
