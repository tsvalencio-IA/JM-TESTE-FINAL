# JM Guinchos V32.7.2 — Login determinístico

## Correção

- Remove do frontend o e-mail inexistente `jm@jm.com.br`.
- Mantém como acessos administrativos `jm@jm.com` e `tsvalencio@gmail.com`.
- O botão Entrar usa vínculo direto `onsubmit`, persistência LOCAL e chamada direta de conclusão do login.
- O painel não depende exclusivamente do evento `onAuthStateChanged` para abrir.
- O fluxo registra no console as etapas `[JM LOGIN] 1/4` até `4/4`.
- Erros de perfil não desconectam silenciosamente o usuário.
- Falha de listener não fecha novamente o painel.

## Firebase

Esta correção não exige publicar regras no Firebase. Para preservar a versão antiga em produção, mantenha as regras atualmente publicadas durante o teste. O arquivo `database.rules.json` não foi alterado.

## Teste

Abra `jm.html?v=jm-v32-7-2-login-deterministico`, entre com `jm@jm.com` e acompanhe o console. O resultado esperado é `etapa 4/4 — painel gestor pronto`.
