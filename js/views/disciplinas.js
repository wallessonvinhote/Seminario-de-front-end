(function (App) {
  'use strict';

  const { esc } = App.ui;
  const nomeCurso = (id) => (App.store.obter('cursos', id) || {}).nome || '—';

  App.views.disciplinas = App.criarCrud({
    titulo: 'Disciplinas',
    dica: 'Consulta e cadastro de disciplinas por curso e semestre.',
    singular: 'disciplina', singularMaiusculo: 'Disciplina', artigo: 'a', genero: 'a',
    colecao: 'disciplinas',
    permissaoEditar: 'editar:disciplinas',
    ordenar: (a, b) => a.cursoId - b.cursoId || a.semestre - b.semestre || a.nome.localeCompare(b.nome, 'pt-BR'),
    texto: (d) => `${d.nome} ${nomeCurso(d.cursoId)} ${d.semestre}º`,
    filtros: [
      { id: 'curso', rotulo: 'Curso', opcoes: App.ui.opcoesCursos, combina: (d, v) => d.cursoId === Number(v) },
      {
        id: 'semestre', rotulo: 'Semestre',
        opcoes: () => Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1}º semestre` })),
        combina: (d, v) => d.semestre === Number(v)
      }
    ],
    colunas: [
      { rotulo: 'Disciplina', celula: (d) => `<span class="font-medium">${esc(d.nome)}</span>` },
      { rotulo: 'Curso', celula: (d) => esc(nomeCurso(d.cursoId)) },
      { rotulo: 'Semestre', celula: (d) => `${esc(d.semestre)}º` },
      { rotulo: 'Carga horária', celula: (d) => `${esc(d.cargaHoraria)} h` },
      { rotulo: 'Matriculados', celula: (d) => App.store.buscar('matriculas', (m) => m.disciplinaId === d.id).length }
    ],
    descricao: (d) => `${d.nome} — ${nomeCurso(d.cursoId)}`,
    campos: (d) => [
      { name: 'cursoId', label: 'Curso', type: 'select', value: d.cursoId, required: true, options: App.ui.opcoesCursos(), classe: 'sm:col-span-2' },
      { name: 'nome', label: 'Nome da disciplina', type: 'text', value: d.nome, required: true, maxlength: 70, classe: 'sm:col-span-2' },
      { name: 'cargaHoraria', label: 'Carga horária (h)', type: 'number', value: d.cargaHoraria, required: true, min: 20, max: 400, step: 1, inputmode: 'numeric' },
      { name: 'semestre', label: 'Semestre do curso', type: 'number', value: d.semestre, required: true, min: 1, max: 12, step: 1, inputmode: 'numeric' }
    ],
    validar: (d, ctx) => App.validators.validarDisciplina(d, ctx),
    paraObjeto: (d) => ({ cursoId: Number(d.cursoId), nome: d.nome.trim(), cargaHoraria: Number(d.cargaHoraria), semestre: Number(d.semestre) }),
    bloquearExclusao(d) {
      const n = App.store.buscar('matriculas', (m) => m.disciplinaId === d.id).length;
      return n ? `Não é possível excluir "${d.nome}": existem ${n} matrícula(s) nesta disciplina.` : null;
    }
  });
})(window.App = window.App || {});
