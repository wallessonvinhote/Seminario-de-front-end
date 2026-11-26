(function (App) {
  'use strict';

  const C = App.config;
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');

  function mascararCPFDigitando(valor) {
    const d = soDigitos(valor).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  /** Valida CPF pelos dígitos verificadores. */
  function cpfValido(cpf) {
    const d = soDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (base) => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(d.slice(0, 9)) === Number(d[9]) && dv(d.slice(0, 10)) === Number(d[10]);
  }

  /** Oculta parte do CPF conforme o perfil (proteção de dados pessoais). */
  function cpfExibicao(cpf, alunoId) {
    const u = App.auth.usuarioAtual();
    const completo = u && (App.auth.pode('cpf:completo') || (u.perfil === 'aluno' && u.alunoId === alunoId));
    if (completo) return cpf;
    const d = soDigitos(cpf);
    return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '***';
  }

  const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
  const nomeValido = (n) => /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’. -]*$/.test(String(n || '').trim());
  const vazio = (v) => v === undefined || v === null || String(v).trim() === '';
  const hoje = () => new Date().toISOString().slice(0, 10);

  // ---------- Validadores por formulário ----------

  function validarAluno(d, ctx = {}) {
    const e = {};
    const nome = String(d.nome || '').trim();
    if (!nome) e.nome = 'Informe o nome completo.';
    else if (nome.length < 5 || !nome.includes(' ')) e.nome = 'Informe nome e sobrenome.';
    else if (!nomeValido(nome)) e.nome = 'Use apenas letras no nome.';

    if (vazio(d.cpf)) e.cpf = 'Informe o CPF.';
    else if (!cpfValido(d.cpf)) e.cpf = 'CPF inválido. Confira os 11 dígitos.';
    else {
      const dup = App.store.buscar('alunos', (a) => soDigitos(a.cpf) === soDigitos(d.cpf) && a.id !== ctx.id);
      if (dup.length) e.cpf = 'Já existe um aluno cadastrado com este CPF.';
    }

    if (vazio(d.email)) e.email = 'Informe o e-mail.';
    else if (!emailValido(d.email)) e.email = 'E-mail inválido. Exemplo: nome@dominio.com.br';
    else {
      const dup = App.store.buscar('alunos', (a) => a.email.toLowerCase() === String(d.email).trim().toLowerCase() && a.id !== ctx.id);
      if (dup.length) e.email = 'Já existe um aluno com este e-mail.';
    }

    if (vazio(d.cursoId)) e.cursoId = 'Selecione o curso.';
    else if (!App.store.obter('cursos', d.cursoId)) e.cursoId = 'Curso inexistente.';

    // RN01: matrícula única
    if (vazio(d.matricula)) e.matricula = 'Informe a matrícula.';
    else if (!/^\d{8}$/.test(d.matricula)) e.matricula = 'A matrícula deve ter 8 dígitos.';
    else if (App.store.buscar('alunos', (a) => a.matricula === d.matricula && a.id !== ctx.id).length) e.matricula = 'Matrícula já utilizada por outro aluno.';
    return e;
  }

  function validarCurso(d, ctx = {}) {
    const e = {};
    const nome = String(d.nome || '').trim();
    if (!nome) e.nome = 'Informe o nome do curso.';
    else if (nome.length < 3) e.nome = 'O nome deve ter ao menos 3 caracteres.';
    else if (App.store.buscar('cursos', (c) => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== ctx.id).length) e.nome = 'Já existe um curso com este nome.';

    const ch = Number(d.cargaHoraria);
    if (vazio(d.cargaHoraria)) e.cargaHoraria = 'Informe a carga horária.';
    else if (!Number.isInteger(ch) || ch < 100 || ch > 6000) e.cargaHoraria = 'Informe um número inteiro entre 100 e 6000 horas.';

    const coord = String(d.coordenador || '').trim();
    if (!coord) e.coordenador = 'Informe o coordenador.';
    else if (coord.length < 5) e.coordenador = 'Informe o nome completo do coordenador.';
    return e;
  }

  function validarDisciplina(d, ctx = {}) {
    const e = {};
    const nome = String(d.nome || '').trim();
    if (!nome) e.nome = 'Informe o nome da disciplina.';
    else if (nome.length < 3) e.nome = 'O nome deve ter ao menos 3 caracteres.';

    if (vazio(d.cursoId)) e.cursoId = 'Selecione o curso.';
    else if (!App.store.obter('cursos', d.cursoId)) e.cursoId = 'Curso inexistente.';
    else if (nome && App.store.buscar('disciplinas', (x) => x.cursoId === Number(d.cursoId) && x.nome.toLowerCase() === nome.toLowerCase() && x.id !== ctx.id).length) {
      e.nome = 'Este curso já possui uma disciplina com este nome.';
    }

    const ch = Number(d.cargaHoraria);
    if (vazio(d.cargaHoraria)) e.cargaHoraria = 'Informe a carga horária.';
    else if (!Number.isInteger(ch) || ch < 20 || ch > 400) e.cargaHoraria = 'Informe um número inteiro entre 20 e 400 horas.';

    const s = Number(d.semestre);
    if (vazio(d.semestre)) e.semestre = 'Informe o semestre.';
    else if (!Number.isInteger(s) || s < 1 || s > 12) e.semestre = 'O semestre deve ser um inteiro entre 1 e 12.';
    return e;
  }

  function validarMatricula(d, ctx = {}) {
    const e = {};
    if (vazio(d.alunoId)) e.alunoId = 'Selecione o aluno.';
    if (vazio(d.disciplinaId)) e.disciplinaId = 'Selecione a disciplina.';
    if (!e.alunoId && !e.disciplinaId) {
      const aluno = App.store.obter('alunos', d.alunoId);
      const disc = App.store.obter('disciplinas', d.disciplinaId);
      if (!aluno || !disc) e.disciplinaId = 'Aluno ou disciplina inexistente.';
      else if (aluno.cursoId !== disc.cursoId) e.disciplinaId = 'A disciplina não pertence ao curso do aluno.';
      else if (App.store.buscar('matriculas', (m) => m.alunoId === aluno.id && m.disciplinaId === disc.id && m.semestre === d.semestre && m.id !== ctx.id).length) {
        e.disciplinaId = 'O aluno já está matriculado nesta disciplina neste semestre.';
      }
    }
    if (vazio(d.semestre)) e.semestre = 'Informe o semestre letivo.';
    else if (!/^\d{4}\.[12]$/.test(d.semestre)) e.semestre = 'Use o formato AAAA.1 ou AAAA.2 (ex.: 2026.2).';
    if (vazio(d.dataMatricula)) e.dataMatricula = 'Informe a data da matrícula.';
    return e;
  }

  // RN02: nota entre 0,0 e 10,0
  function validarNota(d) {
    const e = {};
    if (vazio(d.matriculaId)) e.matriculaId = 'Selecione a matrícula.';
    if (vazio(d.valor)) e.valor = 'Informe a nota.';
    else {
      const v = Number(String(d.valor).replace(',', '.'));
      if (Number.isNaN(v)) e.valor = 'Informe um número válido.';
      else if (v < C.NOTA_MIN || v > C.NOTA_MAX) e.valor = `A nota deve estar entre ${C.NOTA_MIN.toFixed(1).replace('.', ',')} e ${C.NOTA_MAX.toFixed(1).replace('.', ',')}.`;
    }
    if (vazio(d.tipo)) e.tipo = 'Selecione o tipo da avaliação.';
    if (vazio(d.data)) e.data = 'Informe a data.';
    else if (d.data > hoje()) e.data = 'A data não pode estar no futuro.';
    return e;
  }

  // RN03: faltas não podem ultrapassar as aulas ministradas
  function validarFrequencia(d) {
    const e = {};
    if (vazio(d.matriculaId)) e.matriculaId = 'Selecione a matrícula.';
    const aulas = Number(d.aulasMinistradas);
    const faltas = Number(d.faltas);
    if (vazio(d.aulasMinistradas)) e.aulasMinistradas = 'Informe as aulas ministradas.';
    else if (!Number.isInteger(aulas) || aulas < 1 || aulas > 200) e.aulasMinistradas = 'Informe um inteiro entre 1 e 200.';
    if (vazio(d.faltas)) e.faltas = 'Informe o número de faltas.';
    else if (!Number.isInteger(faltas) || faltas < 0) e.faltas = 'Informe um inteiro igual ou maior que 0.';
    else if (!e.aulasMinistradas && faltas > aulas) e.faltas = `As faltas (${faltas}) não podem superar as aulas ministradas (${aulas}).`;
    if (vazio(d.data)) e.data = 'Informe a data.';
    else if (d.data > hoje()) e.data = 'A data não pode estar no futuro.';
    return e;
  }

  App.validators = {
    soDigitos, mascararCPFDigitando, cpfValido, cpfExibicao, emailValido, hoje,
    validarAluno, validarCurso, validarDisciplina, validarMatricula, validarNota, validarFrequencia
  };
})(window.App = window.App || {});
