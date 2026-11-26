(function (App) {
  'use strict';

  const { esc } = App.ui;
  const V = App.validators;

  function proximaMatricula() {
    const maior = App.store.listar('alunos').reduce((m, a) => Math.max(m, Number(a.matricula) || 0), 0);
    return String(Math.max(maior + 1, Number(`${new Date().getFullYear()}0001`)));
  }

  App.views.alunos = App.criarCrud({
    titulo: 'Alunos',
    dica: 'Cadastro de alunos. Cada aluno possui matrícula única e está vinculado a um curso.',
    singular: 'aluno', singularMaiusculo: 'Aluno', artigo: 'o', genero: 'o',
    colecao: 'alunos',
    permissaoEditar: 'editar:alunos',
    ordenar: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
    texto: (a) => `${a.nome} ${a.matricula} ${a.email} ${(App.store.obter('cursos', a.cursoId) || {}).nome || ''}`,
    filtros: [{
      id: 'curso', rotulo: 'Curso',
      opcoes: App.ui.opcoesCursos,
      combina: (a, v) => a.cursoId === Number(v)
    }],
    colunas: [
      { rotulo: 'Matrícula', celula: (a) => `<span class="font-mono">${esc(a.matricula)}</span>` },
      { rotulo: 'Nome', celula: (a) => `<span class="font-medium">${esc(a.nome)}</span>` },
      { rotulo: 'CPF', celula: (a) => `<span class="font-mono">${esc(V.cpfExibicao(a.cpf, a.id))}</span>` },
      { rotulo: 'E-mail', celula: (a) => esc(a.email) },
      { rotulo: 'Curso', celula: (a) => esc((App.store.obter('cursos', a.cursoId) || {}).nome || '—') },
      { rotulo: 'Situação', celula: (a) => App.ui.badge(App.rules.resumirAluno(a.id).situacao) }
    ],
    acoesExtras: (a) => `<a class="btn-ghost" href="#/boletim?aluno=${a.id}" aria-label="Ver boletim de ${esc(a.nome)}">Boletim</a>`,
    descricao: (a) => `${a.nome} (${a.matricula})`,

    campos: (a, editando) => [
      { name: 'matricula', label: 'Matrícula', type: 'text', value: a.matricula || proximaMatricula(), readonly: true, required: true, hint: 'Gerada automaticamente e única (RN01).' },
      { name: 'cursoId', label: 'Curso', type: 'select', value: a.cursoId, required: true, options: App.ui.opcoesCursos() },
      { name: 'nome', label: 'Nome completo', type: 'text', value: a.nome, required: true, maxlength: 80, autocomplete: 'off', classe: 'sm:col-span-2' },
      { name: 'cpf', label: 'CPF', type: 'text', value: a.cpf, required: true, inputmode: 'numeric', maxlength: 14, placeholder: '000.000.000-00', autocomplete: 'off', hint: 'Dado pessoal protegido: exibido parcialmente conforme o perfil.' },
      { name: 'email', label: 'E-mail', type: 'email', value: a.email, required: true, maxlength: 80, autocomplete: 'off' }
    ],

    // Máscara de CPF em tempo real (evento input)
    aoMontarFormulario(form) {
      const cpf = form.querySelector('[name=cpf]');
      cpf.addEventListener('input', () => { cpf.value = V.mascararCPFDigitando(cpf.value); });
    },

    validar: (d, ctx) => V.validarAluno(d, ctx),

    paraObjeto: (d) => ({
      matricula: d.matricula,
      nome: d.nome.trim().replace(/\s+/g, ' '),
      cpf: V.mascararCPFDigitando(d.cpf),
      email: d.email.trim().toLowerCase(),
      cursoId: Number(d.cursoId)
    }),

    // Mantém o login do aluno em sincronia com o cadastro
    async aposAtualizar(novo) {
      const u = App.store.buscar('usuarios', (x) => x.alunoId === novo.id)[0];
      if (u) App.store.atualizar('usuarios', u.id, { nome: novo.nome, email: novo.email });
    },

    async aposSalvar(aluno, criado) {
      if (!criado) return;
      App.store.inserir('usuarios', {
        nome: aluno.nome, email: aluno.email, perfil: 'aluno', alunoId: aluno.id,
        senhaHash: await App.auth.hash(aluno.matricula)
      });
      App.store.registrar('CRIAR', 'acesso do aluno', aluno.email);
      App.ui.abrirModal({
        titulo: 'Aluno cadastrado',
        largura: 'max-w-md',
        html: `<p class="text-sm text-slate-700"><strong>${esc(aluno.nome)}</strong> foi cadastrado com a matrícula <span class="font-mono">${esc(aluno.matricula)}</span>.</p>
          <p class="mt-2 text-sm text-slate-700">O acesso do aluno foi criado: e-mail cadastrado e senha inicial igual ao número da matrícula.</p>
          <p class="mt-2 text-sm font-medium text-slate-900">Próximo passo: matricular o aluno em disciplinas para lançar notas e frequência.</p>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="btn-secondary" data-fechar-x>Agora não</button>
            <a class="btn-primary" href="#/matriculas?novo=${aluno.id}" data-ir>Matricular agora</a>
          </div>`,
        aoMontar(corpo, fechar) {
          corpo.querySelector('[data-fechar-x]').addEventListener('click', fechar);
          corpo.querySelector('[data-ir]').addEventListener('click', fechar);
        }
      });
    },

    // Exclusão em cascata das matrículas, notas, frequências e do acesso do aluno
    avisoExclusao(a) {
      const n = App.store.buscar('matriculas', (m) => m.alunoId === a.id).length;
      return n ? `Também serão excluídas ${n} matrícula(s), com todas as notas e frequências, e o acesso do aluno.` : 'O acesso do aluno também será removido.';
    },
    cascata(a) {
      const mats = App.store.buscar('matriculas', (m) => m.alunoId === a.id).map((m) => m.id);
      App.store.removerVarios('notas', (n) => mats.includes(n.matriculaId));
      App.store.removerVarios('frequencias', (f) => mats.includes(f.matriculaId));
      App.store.removerVarios('matriculas', (m) => m.alunoId === a.id);
      App.store.removerVarios('usuarios', (u) => u.alunoId === a.id);
    }
  });
})(window.App = window.App || {});
