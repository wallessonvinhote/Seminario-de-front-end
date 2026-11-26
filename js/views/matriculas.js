(function (App) {
  'use strict';

  const { esc } = App.ui;
  const C = App.config;

  const opcoesAlunos = () => App.store.listar('alunos').slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((a) => ({ value: a.id, label: `${a.nome} (${a.matricula})` }));

  const opcoesDisciplinasDoAluno = (alunoId) => {
    const aluno = App.store.obter('alunos', alunoId);
    if (!aluno) return [];
    return App.store.buscar('disciplinas', (d) => d.cursoId === aluno.cursoId)
      .sort((a, b) => a.semestre - b.semestre)
      .map((d) => ({ value: d.id, label: `${d.nome} (${d.semestre}º sem.)` }));
  };

  function textoMatricula(m) {
    const r = App.rules.resumirMatricula(m);
    return `${r.aluno ? r.aluno.nome : ''} ${r.disciplina ? r.disciplina.nome : ''} ${m.semestre}`;
  }

  App.views.matriculas = App.criarCrud({
    titulo: 'Matrículas',
    dica: 'Matrícula do aluno nas disciplinas ofertadas pelo seu curso.',
    singular: 'matrícula', singularMaiusculo: 'Matrícula', artigo: 'a', genero: 'a',
    colecao: 'matriculas',
    permissaoEditar: 'editar:matriculas',
    ordenar: (a, b) => {
      const na = (App.store.obter('alunos', a.alunoId) || {}).nome || '';
      const nb = (App.store.obter('alunos', b.alunoId) || {}).nome || '';
      return na.localeCompare(nb, 'pt-BR') || a.disciplinaId - b.disciplinaId;
    },
    texto: textoMatricula,
    filtros: [
      { id: 'curso', rotulo: 'Curso', opcoes: App.ui.opcoesCursos, combina: (m, v) => (App.store.obter('alunos', m.alunoId) || {}).cursoId === Number(v) },
      {
        id: 'situacao', rotulo: 'Situação',
        opcoes: () => ['Aprovado', 'Em Atenção', 'Reprovado', 'Cursando'].map((s) => ({ value: s, label: s })),
        combina: (m, v) => App.rules.resumirMatricula(m).situacao === v
      }
    ],
    colunas: [
      { rotulo: 'Aluno', celula: (m) => `<span class="font-medium">${esc((App.store.obter('alunos', m.alunoId) || {}).nome || '—')}</span>` },
      { rotulo: 'Disciplina', celula: (m) => esc((App.store.obter('disciplinas', m.disciplinaId) || {}).nome || '—') },
      { rotulo: 'Semestre', celula: (m) => esc(m.semestre) },
      { rotulo: 'Média', celula: (m) => App.ui.fmt.num(App.rules.resumirMatricula(m).media) },
      { rotulo: 'Frequência', celula: (m) => App.ui.fmt.pct(App.rules.resumirMatricula(m).percentual) },
      { rotulo: 'Situação', celula: (m) => App.ui.badge(App.rules.resumirMatricula(m).situacao) }
    ],
    acoesExtras: (m) => `<a class="btn-ghost" href="#/lancamentos?matricula=${m.id}" aria-label="Lançar notas e frequência">Lançar</a>`,
    descricao: (m) => {
      const a = App.store.obter('alunos', m.alunoId), d = App.store.obter('disciplinas', m.disciplinaId);
      return `${a ? a.nome : '?'} em ${d ? d.nome : '?'} (${m.semestre})`;
    },

    campos: (m, editando) => [
      { name: 'alunoId', label: 'Aluno', type: 'select', value: m.alunoId, required: true, options: opcoesAlunos(), disabled: editando, classe: 'sm:col-span-2' },
      { name: 'disciplinaId', label: 'Disciplina (do curso do aluno)', type: 'select', value: m.disciplinaId, required: true, options: opcoesDisciplinasDoAluno(m.alunoId), disabled: editando, classe: 'sm:col-span-2', placeholder: m.alunoId ? 'Selecione…' : 'Escolha primeiro o aluno' },
      { name: 'semestre', label: 'Semestre letivo', type: 'text', value: m.semestre || C.SEMESTRE_ATUAL, required: true, maxlength: 6, hint: 'Formato AAAA.1 ou AAAA.2' },
      { name: 'dataMatricula', label: 'Data da matrícula', type: 'date', value: m.dataMatricula || App.validators.hoje(), required: true }
    ],

    // Ao trocar o aluno, recarrega as disciplinas do curso dele
    aoMontarFormulario(form) {
      const selAluno = form.querySelector('[name=alunoId]');
      const selDisc = form.querySelector('[name=disciplinaId]');
      selAluno.addEventListener('change', () => {
        const opcoes = opcoesDisciplinasDoAluno(selAluno.value);
        selDisc.innerHTML = `<option value="">${selAluno.value ? 'Selecione…' : 'Escolha primeiro o aluno'}</option>` +
          opcoes.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      });
    },

    validar: (d, ctx) => App.validators.validarMatricula(d, ctx),
    paraObjeto: (d, item) => ({
      alunoId: Number(d.alunoId || (item && item.alunoId)),
      disciplinaId: Number(d.disciplinaId || (item && item.disciplinaId)),
      semestre: d.semestre.trim(),
      dataMatricula: d.dataMatricula,
      situacao: item ? item.situacao : 'Cursando'
    }),

    abrirComParametros: (p) => (p.novo ? { alunoId: Number(p.novo) } : null),

    async aposSalvar(m, criada) {
      if (criada) App.rules.recalcular(m.id);
    },

    avisoExclusao(m) {
      const n = App.store.buscar('notas', (x) => x.matriculaId === m.id).length;
      const f = App.store.buscar('frequencias', (x) => x.matriculaId === m.id).length;
      return n || f ? `Serão excluídas também ${n} nota(s) e ${f} registro(s) de frequência.` : '';
    },
    cascata(m) {
      App.store.removerVarios('notas', (n) => n.matriculaId === m.id);
      App.store.removerVarios('frequencias', (f) => f.matriculaId === m.id);
    }
  });
})(window.App = window.App || {});
