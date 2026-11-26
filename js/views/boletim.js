(function (App) {
  'use strict';

  const { esc, fmt } = App.ui;
  const C = App.config;
  const V = App.validators;

  App.views.boletim = {
    titulo: 'Boletim',

    render(raiz, params) {
      const usuario = App.auth.usuarioAtual();
      const ehAluno = usuario.perfil === 'aluno';
      let alunoId = params.aluno ? Number(params.aluno) : null;

      if (ehAluno) {
        if (alunoId && alunoId !== usuario.alunoId) {
          App.store.registrar('ACESSO_NEGADO', 'boletim', `Aluno tentou abrir o boletim de outro aluno (id ${alunoId})`);
          App.ui.toast('Acesso negado: você só pode consultar o seu próprio boletim.', 'error', 7000);
        }
        alunoId = usuario.alunoId;
      }

      const alunos = App.store.listar('alunos').slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      raiz.innerHTML = `
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 id="titulo-pagina" tabindex="-1" class="text-2xl font-bold text-slate-900">Boletim e situação acadêmica</h1>
            <p class="mt-1 text-sm text-slate-700">Notas, frequência, média e situação por disciplina.</p>
          </div>
          <button type="button" class="btn-secondary no-print" id="btn-imprimir">Imprimir boletim</button>
        </div>
        ${ehAluno ? '' : `<div class="card no-print mb-4"><label for="sel-aluno" class="label">Aluno</label>
          <select id="sel-aluno" class="input max-w-xl"><option value="">Selecione um aluno…</option>
          ${alunos.map((a) => `<option value="${a.id}" ${a.id === alunoId ? 'selected' : ''}>${esc(a.nome)} (${esc(a.matricula)})</option>`).join('')}</select></div>`}
        <div id="boletim"></div>`;

      const alvo = raiz.querySelector('#boletim');

      function desenhar() {
        const aluno = alunoId ? App.store.obter('alunos', alunoId) : null;
        if (!aluno) { alvo.innerHTML = App.ui.vazio('Selecione um aluno para ver o boletim.'); return; }
        const curso = App.store.obter('cursos', aluno.cursoId) || {};
        const { resumos, situacao } = App.rules.resumirAluno(aluno.id);
        const atencao = resumos.filter((r) => r.situacao === 'Em Atenção' || r.situacao === 'Reprovado');

        alvo.innerHTML = `
          <section class="card" aria-labelledby="aluno-nome">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="aluno-nome" class="text-xl font-bold">${esc(aluno.nome)}</h2>
                <p class="text-sm text-slate-700">${esc(curso.nome || '—')} · matrícula <span class="font-mono">${esc(aluno.matricula)}</span></p>
                <p class="text-sm text-slate-700">CPF <span class="font-mono">${esc(V.cpfExibicao(aluno.cpf, aluno.id))}</span> · ${esc(aluno.email)}</p>
              </div>
              <div class="text-right"><p class="text-xs font-medium uppercase text-slate-600">Situação geral</p>${App.ui.badge(situacao)}</div>
            </div>
          </section>
          ${atencao.length ? `<div class="mt-4 rounded-lg border-l-4 border-amber-700 bg-amber-50 p-4 text-sm text-amber-950" role="status">
            <p class="font-semibold">Atenção: ${atencao.length} disciplina(s) exigem acompanhamento.</p>
            <ul class="mt-1 list-disc pl-5">${atencao.map((r) => `<li><strong>${esc(r.disciplina.nome)}</strong>: ${esc(r.motivos.map((m) => m.texto).join('; ') || r.situacao)}</li>`).join('')}</ul></div>` : ''}
          <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            ${resumos.length ? `<table class="min-w-full divide-y divide-slate-200"><caption class="sr-only">Boletim de ${esc(aluno.nome)}</caption>
              <thead><tr><th class="th" scope="col">Disciplina</th><th class="th" scope="col">Notas</th><th class="th" scope="col">Média</th><th class="th" scope="col">Frequência</th><th class="th" scope="col">Situação</th></tr></thead>
              <tbody class="divide-y divide-slate-100">${resumos.map((r) => `<tr>
                <td class="td font-medium">${esc(r.disciplina.nome)}<br><span class="text-xs font-normal text-slate-600">${esc(r.matricula.semestre)}</span></td>
                <td class="td">${r.notas.length ? r.notas.slice().sort((a, b) => a.data.localeCompare(b.data)).map((n) => `<span class="mr-2 inline-block whitespace-nowrap"><span class="text-xs text-slate-600">${esc(n.tipo)}:</span> <span class="font-semibold tabular-nums">${fmt.num(n.valor)}</span></span>`).join('') : '<span class="text-slate-600">sem notas</span>'}</td>
                <td class="td font-bold tabular-nums ${r.media !== null && r.media < C.MEDIA_APROVACAO ? 'text-red-800' : ''}">${fmt.num(r.media)}</td>
                <td class="td tabular-nums ${r.percentual !== null && r.percentual < C.FREQ_MINIMA ? 'font-bold text-red-800' : ''}">${fmt.pct(r.percentual)}<br><span class="text-xs text-slate-600">${r.faltas} falta(s) em ${r.aulas} aula(s)</span></td>
                <td class="td">${App.ui.badge(r.situacao)}</td></tr>`).join('')}</tbody></table>` : App.ui.vazio('Este aluno ainda não está matriculado em nenhuma disciplina.')}
          </div>
          <p class="mt-3 text-xs text-slate-600">Critérios: aprovado com média ≥ ${fmt.num(C.MEDIA_APROVACAO)} e frequência ≥ ${C.FREQ_MINIMA}%; em atenção abaixo desses mínimos; reprovado com média < ${fmt.num(C.MEDIA_REPROVACAO)} ou frequência < ${C.FREQ_CRITICA}%.</p>`;
      }

      raiz.addEventListener('change', (ev) => {
        if (ev.target.id === 'sel-aluno') { alunoId = ev.target.value ? Number(ev.target.value) : null; desenhar(); }
      });
      raiz.querySelector('#btn-imprimir').addEventListener('click', () => window.print());
      desenhar();
    }
  };
})(window.App = window.App || {});
