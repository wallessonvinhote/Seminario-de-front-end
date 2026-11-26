(function (App) {
  'use strict';

  const C = App.config;
  const arredondar = (n, casas = 2) => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;

  /** Média aritmética das notas da matrícula (null se não houver notas). */
  function calcularMedia(notas) {
    if (!notas.length) return null;
    return arredondar(notas.reduce((s, n) => s + Number(n.valor), 0) / notas.length);
  }

  /** Soma aulas/faltas e calcula o percentual de presença (null se não houver aulas). */
  function calcularFrequencia(registros) {
    const aulas = registros.reduce((s, r) => s + Number(r.aulasMinistradas), 0);
    const faltas = registros.reduce((s, r) => s + Number(r.faltas), 0);
    const percentual = aulas > 0 ? arredondar(((aulas - faltas) / aulas) * 100, 1) : null;
    return { aulas, faltas, percentual };
  }

  /**
   * Situação acadêmica a partir da média e da frequência:
   *   Reprovado  → média < 5,0  OU  frequência < 60%
   *   Em Atenção → média < 7,0  OU  frequência < 75%
   *   Aprovado   → média >= 7,0 E   frequência >= 75% (com ambos os dados lançados)
   *   Cursando   → ainda faltam lançamentos
   */
  function verificarSituacao(media, percentual) {
    if (media === null && percentual === null) return 'Cursando';
    if ((media !== null && media < C.MEDIA_REPROVACAO) || (percentual !== null && percentual < C.FREQ_CRITICA)) return 'Reprovado';
    if ((media !== null && media < C.MEDIA_APROVACAO) || (percentual !== null && percentual < C.FREQ_MINIMA)) return 'Em Atenção';
    if (media !== null && percentual !== null) return 'Aprovado';
    return 'Cursando';
  }

  const fmt1 = (n) => n.toFixed(1).replace('.', ',');

  function motivos(media, percentual) {
    const m = [];
    if (media !== null && media < C.MEDIA_APROVACAO) m.push({ tipo: 'nota', texto: `Média ${fmt1(media)} abaixo de ${fmt1(C.MEDIA_APROVACAO)}` });
    if (percentual !== null && percentual < C.FREQ_MINIMA) m.push({ tipo: 'frequencia', texto: `Frequência ${fmt1(percentual)}% abaixo de ${C.FREQ_MINIMA}%` });
    return m;
  }

  /** Monta o resumo calculado de uma matrícula (sem alterar o armazenamento). */
  function resumirMatricula(matricula) {
    const notas = App.store.buscar('notas', (n) => n.matriculaId === matricula.id);
    const registros = App.store.buscar('frequencias', (f) => f.matriculaId === matricula.id);
    const media = calcularMedia(notas);
    const freq = calcularFrequencia(registros);
    const situacao = verificarSituacao(media, freq.percentual);
    return {
      matricula,
      aluno: App.store.obter('alunos', matricula.alunoId),
      disciplina: App.store.obter('disciplinas', matricula.disciplinaId),
      notas,
      registros,
      media,
      aulas: freq.aulas,
      faltas: freq.faltas,
      percentual: freq.percentual,
      situacao,
      motivos: motivos(media, freq.percentual)
    };
  }

  /** RN04: recalcula e PERSISTE a situação na matrícula. Chamar após qualquer nota/frequência. */
  function recalcular(matriculaId) {
    const m = App.store.obter('matriculas', matriculaId);
    if (!m) return null;
    const resumo = resumirMatricula(m);
    if (m.situacao !== resumo.situacao) App.store.atualizar('matriculas', m.id, { situacao: resumo.situacao });
    return resumo;
  }

  const GRAVIDADE = { Reprovado: 3, 'Em Atenção': 2, Cursando: 1, Aprovado: 0 };

  /** Situação geral do aluno = a pior entre suas matrículas. */
  function resumirAluno(alunoId) {
    const resumos = App.store.buscar('matriculas', (m) => m.alunoId === alunoId).map(resumirMatricula);
    let geral = resumos.length ? 'Aprovado' : 'Cursando';
    for (const r of resumos) if (GRAVIDADE[r.situacao] > GRAVIDADE[geral]) geral = r.situacao;
    if (resumos.length && geral === 'Aprovado' && resumos.some((r) => r.situacao === 'Cursando')) geral = 'Cursando';
    return { resumos, situacao: geral };
  }

  /** Indicadores do painel gerencial (opcionalmente filtrados por curso). */
  function indicadores(cursoId) {
    const alunos = App.store.listar('alunos').filter((a) => !cursoId || a.cursoId === cursoId);
    const ids = new Set(alunos.map((a) => a.id));
    const resumos = App.store.listar('matriculas').filter((m) => ids.has(m.alunoId)).map(resumirMatricula);

    const comMedia = resumos.filter((r) => r.media !== null);
    const comFreq = resumos.filter((r) => r.percentual !== null);
    const media = (lista, campo) => (lista.length ? arredondar(lista.reduce((s, r) => s + r[campo], 0) / lista.length) : null);

    const distribuicao = { Aprovado: 0, 'Em Atenção': 0, Reprovado: 0, Cursando: 0 };
    resumos.forEach((r) => { distribuicao[r.situacao]++; });

    const porDisciplina = {};
    comMedia.forEach((r) => {
      const k = r.disciplina.id;
      (porDisciplina[k] = porDisciplina[k] || { nome: r.disciplina.nome, soma: 0, n: 0 });
      porDisciplina[k].soma += r.media;
      porDisciplina[k].n++;
    });
    const mediaPorDisciplina = Object.values(porDisciplina)
      .map((d) => ({ nome: d.nome, media: arredondar(d.soma / d.n), alunos: d.n }))
      .sort((a, b) => a.media - b.media);

    const atencao = resumos
      .filter((r) => r.situacao === 'Em Atenção' || r.situacao === 'Reprovado')
      .sort((a, b) => GRAVIDADE[b.situacao] - GRAVIDADE[a.situacao] || (a.media ?? 99) - (b.media ?? 99));

    const alunosEmAtencao = new Set(atencao.map((r) => r.aluno.id)).size;

    return {
      totalAlunos: alunos.length,
      totalMatriculas: resumos.length,
      mediaGeral: media(comMedia, 'media'),
      frequenciaMedia: media(comFreq, 'percentual'),
      distribuicao,
      mediaPorDisciplina,
      atencao,
      alunosEmAtencao,
      taxaAprovacao: resumos.length ? arredondar((distribuicao.Aprovado / resumos.length) * 100, 0) : null
    };
  }

  App.rules = { calcularMedia, calcularFrequencia, verificarSituacao, resumirMatricula, recalcular, resumirAluno, indicadores };
})(window.App = window.App || {});
