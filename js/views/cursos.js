(function (App) {
  'use strict';

  const { esc } = App.ui;

  App.views.cursos = App.criarCrud({
    titulo: 'Cursos',
    dica: 'Cursos oferecidos pela faculdade. Um curso oferece uma ou mais disciplinas.',
    singular: 'curso', singularMaiusculo: 'Curso', artigo: 'o', genero: 'o',
    colecao: 'cursos',
    permissaoEditar: 'editar:cursos',
    ordenar: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
    texto: (c) => `${c.nome} ${c.coordenador}`,
    colunas: [
      { rotulo: 'Curso', celula: (c) => `<span class="font-medium">${esc(c.nome)}</span>` },
      { rotulo: 'Carga horária', celula: (c) => `${esc(c.cargaHoraria)} h` },
      { rotulo: 'Coordenador(a)', celula: (c) => esc(c.coordenador) },
      { rotulo: 'Disciplinas', celula: (c) => App.store.buscar('disciplinas', (d) => d.cursoId === c.id).length },
      { rotulo: 'Alunos', celula: (c) => App.store.buscar('alunos', (a) => a.cursoId === c.id).length }
    ],
    descricao: (c) => c.nome,
    campos: (c) => [
      { name: 'nome', label: 'Nome do curso', type: 'text', value: c.nome, required: true, maxlength: 70, classe: 'sm:col-span-2' },
      { name: 'cargaHoraria', label: 'Carga horária total (h)', type: 'number', value: c.cargaHoraria, required: true, min: 100, max: 6000, step: 1, inputmode: 'numeric' },
      { name: 'coordenador', label: 'Coordenador(a)', type: 'text', value: c.coordenador, required: true, maxlength: 70 }
    ],
    validar: (d, ctx) => App.validators.validarCurso(d, ctx),
    paraObjeto: (d) => ({ nome: d.nome.trim(), cargaHoraria: Number(d.cargaHoraria), coordenador: d.coordenador.trim() }),
    bloquearExclusao(c) {
      const disc = App.store.buscar('disciplinas', (d) => d.cursoId === c.id).length;
      const alu = App.store.buscar('alunos', (a) => a.cursoId === c.id).length;
      if (disc || alu) return `Não é possível excluir "${c.nome}": há ${alu} aluno(s) e ${disc} disciplina(s) vinculados. Remova ou transfira esses registros primeiro.`;
      return null;
    }
  });
})(window.App = window.App || {});
