(function (App) {
  'use strict';

  const { esc, fmt } = App.ui;
  const C = App.config;

  App.views.painel = {
    titulo: 'Painel gerencial',

    render(raiz) {
      let cursoId = null;
      let motivoFiltro = 'todos';

      raiz.innerHTML = `
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="titulo-pagina" tabindex="-1" class="text-2xl font-bold text-slate-900">Painel gerencial</h1>
            <p class="mt-1 text-sm text-slate-700">Indicadores para apoiar decisões da coordenação.</p>
          </div>
          <div>
            <label for="filtro-curso" class="label">Curso</label>
            <select id="filtro-curso" class="input min-w-[16rem]"><option value="">Todos os cursos</option>
              ${App.ui.opcoesCursos().map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join('')}</select>
          </div>
        </div>
        <div id="painel" aria-live="polite"></div>`;

      const alvo = raiz.querySelector('#painel');

      function desenhar() {
        const ind = App.rules.indicadores(cursoId);
        const d = ind.distribuicao;
        const totalMat = ind.totalMatriculas || 1;
        const cores = { Aprovado: 'bg-emerald-600', 'Em Atenção': 'bg-amber-500', Reprovado: 'bg-red-700', Cursando: 'bg-slate-500' };

        const listaAtencao = ind.atencao.filter((r) => motivoFiltro === 'todos' || r.motivos.some((m) => m.tipo === motivoFiltro));

        alvo.innerHTML = `
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            ${App.ui.kpi('Alunos', ind.totalAlunos, `${ind.totalMatriculas} matrícula(s) em disciplinas`)}
            ${App.ui.kpi('Média geral', fmt.num(ind.mediaGeral), `Mínimo institucional: ${fmt.num(C.MEDIA_APROVACAO)}`)}
            ${App.ui.kpi('Frequência média', fmt.pct(ind.frequenciaMedia), `Mínimo exigido: ${C.FREQ_MINIMA}%`)}
            ${App.ui.kpi('Taxa de aprovação', ind.taxaAprovacao === null ? '—' : `${ind.taxaAprovacao}%`, 'Matrículas aprovadas')}
            ${App.ui.kpi('Alunos em atenção', ind.alunosEmAtencao, 'Com nota ou frequência abaixo do mínimo')}
          </div>

          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <section class="card" aria-labelledby="h-dist">
              <h2 id="h-dist" class="mb-4 text-base font-bold">Matrículas por situação</h2>
              ${App.ui.barras(Object.entries(d).map(([k, v]) => ({ rotulo: k, valor: v, texto: `${v} (${Math.round((v / totalMat) * 100)}%)`, cor: cores[k] })), ind.totalMatriculas)}
            </section>
            <section class="card" aria-labelledby="h-disc">
              <h2 id="h-disc" class="mb-1 text-base font-bold">Média por disciplina</h2>
              <p class="mb-4 text-xs text-slate-600">Das menores para as maiores. Em vermelho: abaixo de ${fmt.num(C.MEDIA_APROVACAO)}.</p>
              ${App.ui.barras(ind.mediaPorDisciplina.map((x) => ({ rotulo: x.nome, valor: x.media, texto: fmt.num(x.media), cor: x.media < C.MEDIA_APROVACAO ? 'bg-red-700' : 'bg-emerald-600' })), 10)}
            </section>
          </div>

          <section class="card mt-4" aria-labelledby="h-atencao">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-atencao" class="text-base font-bold">Alunos em situação de atenção <span class="font-normal text-slate-600">(${listaAtencao.length})</span></h2>
              <div class="flex items-center gap-2">
                <label for="filtro-motivo" class="text-sm font-medium">Motivo</label>
                <select id="filtro-motivo" class="input w-auto">
                  <option value="todos" ${motivoFiltro === 'todos' ? 'selected' : ''}>Todos</option>
                  <option value="nota" ${motivoFiltro === 'nota' ? 'selected' : ''}>Nota baixa</option>
                  <option value="frequencia" ${motivoFiltro === 'frequencia' ? 'selected' : ''}>Baixa frequência</option>
                </select>
              </div>
            </div>
            ${listaAtencao.length ? `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-slate-200"><caption class="sr-only">Alunos em situação de atenção</caption>
              <thead><tr><th class="th" scope="col">Aluno</th><th class="th" scope="col">Disciplina</th><th class="th" scope="col">Média</th><th class="th" scope="col">Frequência</th><th class="th" scope="col">Situação</th><th class="th" scope="col">Motivo</th><th class="th" scope="col">Ação</th></tr></thead>
              <tbody class="divide-y divide-slate-100">${listaAtencao.map((r) => `<tr>
                <td class="td font-medium">${esc(r.aluno.nome)}</td><td class="td">${esc(r.disciplina.nome)}</td>
                <td class="td tabular-nums ${r.media !== null && r.media < C.MEDIA_APROVACAO ? 'font-bold text-red-800' : ''}">${fmt.num(r.media)}</td>
                <td class="td tabular-nums ${r.percentual !== null && r.percentual < C.FREQ_MINIMA ? 'font-bold text-red-800' : ''}">${fmt.pct(r.percentual)}</td>
                <td class="td">${App.ui.badge(r.situacao)}</td>
                <td class="td text-xs">${esc(r.motivos.map((m) => m.texto).join('; '))}</td>
                <td class="td"><a class="btn-ghost" href="#/boletim?aluno=${r.aluno.id}" aria-label="Ver boletim de ${esc(r.aluno.nome)}">Boletim</a></td></tr>`).join('')}</tbody></table></div>`
              : App.ui.vazio('Nenhum aluno em situação de atenção para este filtro.')}
          </section>`;
      }

      raiz.addEventListener('change', (ev) => {
        if (ev.target.id === 'filtro-curso') { cursoId = ev.target.value ? Number(ev.target.value) : null; desenhar(); }
        else if (ev.target.id === 'filtro-motivo') { motivoFiltro = ev.target.value; desenhar(); raiz.querySelector('#filtro-motivo').focus(); }
      });
      desenhar();
    }
  };
})(window.App = window.App || {});
