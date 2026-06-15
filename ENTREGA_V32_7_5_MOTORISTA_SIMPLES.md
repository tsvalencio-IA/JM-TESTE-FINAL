# ENTREGA V32.7.5 — Motorista simples com pendências clicáveis

Base: JM-ESTABILIZADO-MOTORISTA.zip.

## Alterações cirúrgicas

- Painel motorista recebeu bloco `Pendências para finalizar`.
- Cada pendência vira botão clicável e leva direto ao campo faltante.
- Ao tentar finalizar sem evidência obrigatória, o sistema rola automaticamente para a etapa correta.
- Falta de foto abre o input correto.
- Falta de assinatura abre a assinatura.
- Falta de justificativa abre a justificativa da etapa.
- Falta de aceite textual abre o campo de aceite.
- Não alterei Firebase Rules, RTDB Rules, Cloudinary, RAFA, gestor ou superadmin.

## Arquivos alterados

- motorista.html
- js/motorista.js
- css/style.css
- version.json

## Testes executados

- `npm run check:js` — passou.
- `node tests/run-all.js` — passou.

## Limite honesto

Essa entrega melhora o fluxo do motorista e reduz confusão operacional, mas ainda precisa ser validada no Android real com Firebase, RTDB e Cloudinary de produção.
