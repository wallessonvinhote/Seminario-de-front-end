# Sistema Acadêmico de Gestão de Alunos e Desempenho

Faculdade Horizonte do Saber (instituição fictícia) — Seminário de Desenvolvimento Front-End, **Grupo 4**.
Centro Universitário FAMETRO · Engenharia de Software · Prof. Jean da Silva Holguim.

Protótipo funcional de website dinâmico. **Dados 100% fictícios.**

## Como executar

**Opção A — direto no navegador (offline):** dê duplo clique em `index.html`.
**Opção B — Live Server (VS Code):** botão direito em `index.html` → *Open with Live Server*. Nesse modo a carga inicial dos dados usa `fetch()` em `data/seed.json`.

Não é preciso instalar nada para executar. O CSS (`css/styles.css`) já vem compilado.

| Perfil | E-mail | Senha |
|---|---|---|
| Coordenação | coordenacao@horizonte.edu.br | coord123 |
| Secretaria | secretaria@horizonte.edu.br | secret123 |
| Aluno | ana.souza@aluno.horizonte.edu.br | aluno123 |


## Tecnologias

HTML5 semântico · Tailwind CSS 3 · JavaScript ES6+ (sem framework) · localStorage / sessionStorage · Fetch API.

## Funcionalidades

- **Cadastros (CRUD):** alunos, cursos, disciplinas e matrículas, com pesquisa, filtros e confirmação de exclusão.
- **Notas e frequência:** lançamento, edição e exclusão, com **média, % de presença e situação calculadas automaticamente** (Aprovado, Em Atenção, Reprovado, Cursando).
- **Boletim** por aluno, com impressão.
- **Painel gerencial** da coordenação: indicadores, distribuição por situação, média por disciplina e alunos em atenção (filtro por nota baixa ou baixa frequência).
- **Controle de acesso por perfil**, CPF mascarado, **auditoria** das operações, bloqueio por tentativas de login e encerramento por inatividade.
- Validação em tempo real, mensagens de sucesso, alerta e erro, e interface responsiva e acessível (navegação por teclado, ARIA, foco visível, contraste AA).

## Regras de negócio (do relatório)

| Regra | Onde |
|---|---|
| RN01 matrícula única, aluno vinculado a um curso | `js/validators.js` (`validarAluno`) |
| RN02 nota entre 0,0 e 10,0 | `js/validators.js` (`validarNota`) |
| RN03 faltas ≤ aulas ministradas | `js/validators.js` (`validarFrequencia`) |
| RN04 recálculo automático de média, frequência e situação | `js/rules.js` (`recalcular`) |
| RN05 sinalização de alunos em atenção | `js/rules.js` (`indicadores`) e `js/views/painel.js` |

## Estrutura

```
index.html            página única (SPA com rotas por hash: #/painel, #/alunos, ...)
css/input.css         entrada do Tailwind  →  css/styles.css (compilado)
data/seed.json        dados iniciais fictícios (carregados via Fetch)
js/config.js          parâmetros institucionais e permissões por perfil
js/storage.js         persistência (localStorage), Fetch do seed, auditoria
js/auth.js            login (hash SHA-256), sessão, permissões
js/validators.js      validações e máscaras
js/rules.js           cálculos acadêmicos e indicadores
js/ui.js              componentes: toasts, modais, campos, badges, gráfico
js/crud.js            componente reutilizável de CRUD
js/views/*.js         telas (painel, alunos, cursos, disciplinas, matrículas, lançamentos, boletim, auditoria, login)
js/app.js             inicialização e roteador
scripts/gerar-seed.js gerador dos dados fictícios
docs/                 roteiro da apresentação
```

## Para alterar o visual (opcional)

Requer Node.js. Execute `npm install` uma vez e depois `npm run css` (ou `npm run css:watch`) para recompilar o Tailwind. `npm run build` também regera os dados iniciais.

## Limitação de segurança

O front-end sozinho **não garante segurança**. Login, perfis e `localStorage` são simulados no navegador e podem ser alterados por quem tiver acesso ao DevTools. Em produção, autenticação, autorização e validação definitiva devem ocorrer no servidor, e dados sensíveis não devem ficar em `localStorage`.
