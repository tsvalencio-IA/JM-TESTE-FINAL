# JM Guinchos — V32.7.1 Login Gestor Estável

## Causa encontrada

A V32.7 tinha dois defeitos concretos no fluxo de login do `jm.html`:

1. O perfil `superadmin` não estava incluído em `OFFICE_ROLES` no frontend.
2. O e-mail `tsvalencio@gmail.com` não estava nas listas `adminEmails` e `superadminEmails` do `config.firebase.js`.

Além disso, enquanto o Firebase Authentication ou o Firestore carregavam o perfil, a tela não mostrava progresso nem oferecia recuperação. Isso dava a impressão de travamento.

## Correções

- `superadmin` agora é aceito no painel gestor.
- `tsvalencio@gmail.com`, `jm@jm.com` e `jm@jm.com` são reconhecidos no bootstrap do frontend.
- O botão Entrar fica desabilitado durante a autenticação e mostra o estágio atual.
- Há timeout de autenticação e carregamento do perfil.
- Falhas temporárias permitem tentar novamente.
- Falhas de acesso continuam bloqueadas e explicadas.
- Cache atualizado para `jm-v32-7-2-login-deterministico`.

## Firebase

- `firestore.rules`: não alterado.
- `database.rules.json`: não alterado.

## Testes locais

- Sintaxe de todos os JavaScripts.
- Validação de todos os JSONs.
- Todos os testes anteriores.
- Novo teste do login gestor/superadmin.
