# CHECKLIST MESTRE — JM GUINCHOS V32.7 FINAL

Versão consolidada: `jm-v32-7-2-login-deterministico`

Base usada: `JM-GUINCHOS-v32-6-fase2-status-checklist-evidencias`

## Legenda

- ✅ Implementado e validado localmente
- 🟨 Implementado; validação final depende do Firebase, Cloudinary, Tracker ou celular real
- ⬜ Não incluído nesta versão

## Fase 0 — Congelamento e auditoria

- ✅ Base preservada sem remoção de módulos.
- ✅ Nenhum arquivo operacional foi substituído cegamente por versão antiga.
- ✅ Sintaxe validada em todos os JavaScripts.
- ✅ Todos os JSONs validados.
- ✅ Testes anteriores preservados.
- ✅ Cache unificado em `jm-v32-7-2-login-deterministico`.
- ✅ Manifesto da versão criado em `version.json`.

## Fase 1 — Atendimento ativo seguro do motorista

- ✅ Nenhuma ação usa silenciosamente o primeiro chamado.
- ✅ Atendimento atual selecionado conscientemente.
- ✅ Seleção persistida apenas enquanto o chamado continua válido.
- ✅ GPS, provas, status, relatório e despesas bloqueados sem atendimento atual.
- ✅ Contexto do chamado exibido no painel motorista.
- 🟨 Testar com `moto@jm.com` após publicação.

## Fase 2 — GPS celular profissional

- ✅ Painel sempre informa o estado do módulo.
- ✅ GPS vinculado a `driverId`, `callId` e `vehicleId`.
- ✅ Escrita preservada nos três caminhos RTDB.
- ✅ `watchPosition` encerrado ao parar, trocar chamado, finalizar ou sair.
- ✅ Coordenada falsa `0,0` não é criada ao desligar.
- ✅ Erros de permissão, sinal e envio são visíveis.
- ✅ Motorista lê somente `settings/publicIntegrations`.
- 🟨 Testar permissão física e posição no mapa do gestor em aparelho Android.

## Fase 3 — Modo de campo

- ✅ Navegação inferior: Atendimento, Rota/GPS, Provas e Despesas.
- ✅ Ações principais concentradas no atendimento atual.
- ✅ Botões grandes e apropriados para toque.
- ✅ Estado online/offline visível.
- ✅ Aviso específico sobre uploads sem conexão.
- ✅ Nenhuma função anterior foi removida.

## Fase 4 — Status operacional guiado

- ✅ Sequência oficial de status preservada.
- ✅ Saltos indevidos bloqueados.
- ✅ Retorno exige confirmação e justificativa.
- ✅ Clique duplo bloqueado durante gravação.
- ✅ Timeline registra usuário, horário, status anterior e novo status.
- ✅ Portal público continua recebendo status permitido.
- 🟨 Testar todas as transições autenticadas no Firebase publicado.

## Fase 5 — Checklist em etapas

- ✅ Retirada.
- ✅ Inspeção.
- ✅ Carregamento.
- ✅ Transporte.
- ✅ Entrega.
- ✅ Finalização.
- ✅ Progresso e rascunho preservados por atendimento.
- ✅ Itens obrigatórios e justificativas preservados.
- 🟨 Testar assinatura por toque no Android.

## Fase 6 — Evidências

- ✅ Fotos com miniatura e progresso individual.
- ✅ Áudios múltiplos sem sobrescrever arquivos anteriores.
- ✅ Assinaturas por fase.
- ✅ Erro individual por arquivo.
- ✅ Metadados de autor, veículo, chamado, data e visibilidade.
- ✅ Dossiê, portal autorizado e relatório preservados.
- 🟨 Testar upload real com Cloudinary publicado.

## Fase 7 — Prancha técnica de avarias

- ✅ Prancha técnica existente preservada e aprimorada.
- ✅ Tipo do dano: risco, amassado, quebrado, ausente, pneu, vidro, vazamento ou outro.
- ✅ Gravidade: leve, moderada ou grave.
- ✅ Observação por região.
- ✅ Foto de evidência vinculável por tipo.
- ✅ Edição e remoção da marcação.
- ✅ Estrutura `damageAssessment` versionada sem quebrar registros antigos.
- ✅ Relatório interno e público exibem os detalhes técnicos.

## Fase 8 — Despesa rápida e integrada

- ✅ Categorias rápidas por toque.
- ✅ Chamado e veículo puxados do atendimento atual.
- ✅ Revisão do valor antes de enviar.
- ✅ Confirmação consciente.
- ✅ Rascunho local de texto quando necessário.
- ✅ Bloqueio de valor zero.
- ✅ Histórico recente e status da aprovação.
- ✅ Fluxo já existente continua alimentando financeiro, chamado e frota após aprovação.
- 🟨 Testar comprovante real no Cloudinary.

## Fase 9 — Central Operacional principal

- ✅ Central aberta como home operacional na primeira entrada da sessão.
- ✅ Fila, mapa e frota preservados.
- ✅ Ranking de veículos por proximidade da origem.
- ✅ Fonte da posição identificada: RAFA, GPS celular ou sem posição.
- ✅ Veículo indisponível perde prioridade.
- ✅ Despacho e abertura da rota no mesmo painel.
- ✅ Indicadores e alertas operacionais anteriores preservados.
- 🟨 Validar distância e atualização simultânea RAFA + RTDB em produção.

## Fase 10 — Formulário do chamado em etapas

- ✅ Etapa 1: Atendimento.
- ✅ Etapa 2: Endereços.
- ✅ Etapa 3: Rota e preço.
- ✅ Nenhum campo foi removido.
- ✅ Rascunho local automático.
- ✅ Botões de restaurar e limpar rascunho.
- ✅ Formulário original continua sendo o responsável pela gravação oficial.
- ✅ Chamado com rota pendente continua permitido conforme fluxo existente.

## Fase 11 — Assistente IA

- ✅ Parser real de seguradora preservado.
- ✅ Conferência visual antes de criar o chamado.
- ✅ Origem e destino mostrados separadamente.
- ✅ Alerta de destino contraditório.
- ✅ Valor oficial importado exibido.
- ✅ Status externo separado do status interno.
- ✅ Caso Tanabi → São José do Rio Preto validado por teste automatizado.

## Fase 12 — Geocodificação e rota

- ✅ Restrição ao Brasil preservada.
- ✅ UF e cidade validadas.
- ✅ Paraná/PR cobertos no teste.
- ✅ Resultados europeus rejeitados.
- ✅ Coordenadas inválidas e `0,0` bloqueadas.
- ✅ Link compartilhado e coordenadas preservados.
- ✅ OSRM e fallback existentes preservados.
- ✅ Geometria simplificada para respeitar o limite do Firestore.

## Fase 13 — Preço e pedágio

- ✅ Valor manual/importado continua protegido.
- ✅ Preço sugerido separado do valor oficial.
- ✅ Botão consciente para aplicar sugestão.
- ✅ Distância, duração e pedágio preservados.
- ✅ Praças cadastradas continuam sendo detectadas pela geometria.
- ✅ Financeiro não é duplicado ao recalcular.
- ✅ Custos internos não são expostos no portal público.

## Fase 14 — Financeiro integrado

- ✅ Hub único conecta Financeiro e Pagamentos.
- ✅ KPIs consolidados: receita, saídas, resultado, a receber e pendências.
- ✅ Despesa aprovada continua criando transação por `upsert`.
- ✅ Chamado continua gerando conta a receber por `upsert`.
- ✅ Exportação CSV para lançamentos, despesas e chamados.
- ✅ Fechamentos de seguradora preservados.
- ✅ Auditoria de exclusão preservada.

## Fase 15 — Responsividade mobile/PC

- ✅ Tabelas viram cartões no celular automaticamente.
- ✅ Cabeçalhos são usados como rótulos de cada campo.
- ✅ Sem remoção das tabelas no desktop.
- ✅ Call wizard, financeiro, despesas, central e avarias têm layouts móveis específicos.
- ✅ Áreas de toque mantidas adequadas.
- 🟨 Conferência visual final em 320, 360, 390, 412 px e Android real após publicação.

## Fase 16 — Minimização consistente

- ✅ Uma única estrutura visual final para cabeçalho e conteúdo.
- ✅ Somente `.panel-collapse-body` é ocultado.
- ✅ Painel inteiro não quebra ao minimizar.
- ✅ Mapas continuam sendo invalidados após abrir/fechar.
- ✅ Estado persistente anterior preservado.

## Fase 17 — Cache e PWA

- ✅ Versão única em HTML, JS, testes e Service Worker.
- ✅ Novos arquivos incluídos no cache.
- ✅ Caches antigos removidos na ativação.
- ✅ Código e HTML usam estratégia network-first.
- ✅ Aviso de atualização disponível no gestor e motorista.
- ✅ `SKIP_WAITING` suportado.
- ✅ `version.json` incluído.
- 🟨 Testar atualização da PWA instalada no Android.

## Fase 18 — Permissões e segurança

- ✅ Token RAFA permanece em `settings/integrations` privado.
- ✅ Criado espelho sanitizado `settings/publicIntegrations`.
- ✅ Espelho contém somente Cloudinary público, GPS celular e mapa básico.
- ✅ Superadmin publica o espelho automaticamente.
- ✅ Gestor proprietário também pode sincronizar o espelho.
- ✅ Motorista não consulta mais o documento privado.
- ✅ Firestore Rules atualizadas para separar privado e público.
- ✅ Regras RTDB preservadas.
- 🟨 Publicar as novas Firestore Rules antes de validar o motorista.

# Resultado dos testes locais

- ✅ `node --check` em todos os JavaScripts.
- ✅ Todos os JSONs válidos.
- ✅ `insurance-parser.test.js`.
- ✅ `geocode-brasil.test.js`.
- ✅ `version-cache.test.js`.
- ✅ `phase1-motorista.test.js`.
- ✅ `phase2-motorista.test.js`.
- ✅ `final-phases.test.js`.
- ✅ Páginas e arquivos principais retornando HTTP 200 em servidor local.
- ✅ Nenhum ID duplicado nas páginas principais.
- ✅ Todos os arquivos declarados no Service Worker existem.

# Fora do escopo desta versão

- ⬜ SaaS multiempresa / multi-tenant.
- ⬜ Backend privado para esconder token de rastreador do navegador do gestor.
- ⬜ Publicação na Play Store.

## Hotfix V32.7.1 — Login gestor/superadmin

- ✅ Perfil `superadmin` incluído no conjunto de perfis de escritório do `jm.html`.
- ✅ `tsvalencio@gmail.com` restaurado nas listas de bootstrap do frontend.
- ✅ Botão Entrar mostra estado real: validando, credenciais aceitas, carregando perfil ou erro.
- ✅ Autenticação e leitura do perfil possuem tempo limite; a tela não fica parada silenciosamente.
- ✅ Falha temporária oferece `Tentar novamente` sem exigir nova senha.
- ✅ Falha de autorização continua bloqueando acesso indevido.
- ✅ Nenhuma regra Firestore ou RTDB foi alterada.
- ✅ Teste automatizado `tests/login-gestor.test.js` incluído.
- 🟨 Confirmar login real de `jm@jm.com` e `tsvalencio@gmail.com` após publicação.


## Hotfix V32.7.4 — Motorista: assinatura e cabeçalho legível

- ✅ A assinatura não foi removida; o fluxo de upload, `customerSignature` e `phaseSignatures` foi preservado.
- ✅ Etapa final renomeada para **Finalização e assinatura**.
- ✅ Atalho **Ir para assinatura** adicionado ao checklist.
- ✅ Área de assinatura virou um cartão técnico visível, com estado Pendente/Pronta/Salva/Justificada.
- ✅ Canvas redimensionado ao abrir a etapa, evitando área pequena ou aparentemente vazia.
- ✅ Botão Ativar assinatura, limpeza, aceite textual e justificativa preservados.
- ✅ Cabeçalho mobile reorganizado; botões não ficam mais amontoados no canto.
- ✅ Conexão, atendimento e sincronização ficam em painel expansível legível.
- ✅ Layout específico para 420 px ou menos, com ações em duas colunas e textos quebrando corretamente.
- ✅ Nenhuma regra Firestore ou RTDB foi alterada.
- ✅ Teste `tests/motorista-signature-header.test.js` incluído.
- 🟨 Testar assinatura por toque em aparelho Android real após publicação.
