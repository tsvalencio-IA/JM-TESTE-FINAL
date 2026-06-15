# JM Guinchos — V32.7.6 Motorista Fluxo Guiado

## Status honesto
Candidato validado localmente por sintaxe, estrutura e suíte automatizada incluída. Não altera regras Firebase/RTDB.

## Correções aplicadas
- Versionamento/cache unificado para `jm-v32-7-6-motorista-fluxo-guiado-validacao`.
- `package.json` atualizado para `32.7.6`.
- Manifesto SHA256 próprio da V32.7.6 criado.
- Pendências do motorista não são mais cortadas em 8 itens.
- Pendências agora mostram contagem total e agrupamento por Retirada, Inspeção, Entrega, Fotos e Assinatura.
- Clique na pendência reabre painel minimizado, abre `<details>`, muda etapa, rola e foca no campo.
- Inspeção não marca ✓ só com um campo isolado: exige campos básicos e fotos básicas.
- Campos obrigatórios adicionados à lista de pendências: combustível, quilometragem, pneus, chave/documento, veículo carregado, fácil remoção, responsáveis e documentos de retirada/entrega.
- Compatibilidade controlada: motorista tenta `settings/publicIntegrations`; se não existir/der erro, tenta `settings/integrations`; se ambos falharem, usa fallback local.
- Teste automatizado novo para as pendências V32.7.6.

## Testes executados localmente
- `npm run check:js` — passou.
- `node tests/run-all.js` — passou com 10 testes.

## Dependem de produção
- Login real Firebase.
- Escrita real no Firestore.
- Upload real Cloudinary.
- GPS físico Android.
- RTDB real.
- Tracker RAFA.
- PWA instalada em celular com cache anterior.
