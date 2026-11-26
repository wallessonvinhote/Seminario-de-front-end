(function (App) {
  'use strict';

  const { esc, fmt } = App.ui;
  const C = App.config;
  const V = App.validators;

  const rotuloMatricula = (m) => {
    const a = App.store.obter('alunos', m.alunoId), d = App.store.obter('disciplinas', m.disciplinaId);
    return `${a ? a.nome : '?'} — ${d ? d.nome : '?'} (${m.semestre})`;
  };

  App.views.lancamentos = {
    titulo: 'Notas e frequência',

    render(raiz, params) {
      const podeEditar = App.auth.pode('editar:lancamentos');
      let matriculaId = params.matricula ? Number(params.matricula) : null;
      let editando = null; // { tipo: 'nota'|'freq', id }

      raiz.innerHTML = `
        <h1 id="titulo-pagina" tabindex="-1" class="text-2xl font-bold text-slate-900">Notas e frequência</h1>
        <p class="mt-1 text-sm text-slate-700">Selecione a matrícula do aluno na disciplina. A média, a frequência e a situação acadêmica são calculadas automaticamente.</p>

        <div class="card mt-4">
          <div class="grid gap-3 md:grid-cols-3">
            <div>
              <label for="busca-aluno" class="label">Buscar aluno</label>
              <input id="busca-aluno" type="search" class="input" placeholder="Digite parte do nome…" autocomplete="off">
            </div>
            <div class="md:col-span-2">
              <label for="sel-matricula" class="label">Matrícula (aluno — disciplina)</label>
              <select id="sel-matricula" class="input"></select>
            </div>
          </div>
        </div>
        <div id="detalhe" class="mt-4"></div>`;

      const selMat = raiz.querySelector('#sel-matricula');
      const detalhe = raiz.querySelector('#detalhe');

      function preencherSelect() {
        const termo = raiz.querySelector('#busca-aluno').value.trim().toLowerCase();
        const mats = App.store.listar('matriculas').slice()
          .filter((m) => !termo || rotuloMatricula(m).toLowerCase().includes(termo))
          .sort((a, b) => rotuloMatricula(a).localeCompare(rotuloMatricula(b), 'pt-BR'));
        selMat.innerHTML = `<option value="">${mats.length ? 'Selecione uma matrícula…' : 'Nenhuma matrícula encontrada'}</option>` +
          mats.map((m) => `<option value="${m.id}" ${m.id === matriculaId ? 'selected' : ''}>${esc(rotuloMatricula(m))}</option>`).join('');
      }

      // ---------- Resumo calculado ----------
      function htmlResumo(r) {
        const motivos = r.motivos.length
          ? `<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-950">${r.motivos.map((m) => `<li>${esc(m.texto)}</li>`).join('')}</ul>` : '';
        return `<section class="card" aria-labelledby="resumo-titulo">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="resumo-titulo" tabindex="-1" class="text-lg font-bold">${esc(r.aluno.nome)}</h2>
              <p class="text-sm text-slate-700">${esc(r.disciplina.nome)} · semestre ${esc(r.matricula.semestre)}</p>
            </div>
            <div aria-live="polite" aria-atomic="true"><span class="sr-only">Situação acadêmica: </span>${App.ui.badge(r.situacao)}</div>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt class="text-xs font-medium uppercase text-slate-600">Média (mín. ${fmt.num(C.MEDIA_APROVACAO)})</dt><dd class="text-2xl font-bold ${r.media !== null && r.media < C.MEDIA_APROVACAO ? 'text-red-800' : 'text-slate-900'}">${fmt.num(r.media)}</dd></div>
            <div><dt class="text-xs font-medium uppercase text-slate-600">Frequência (mín. ${C.FREQ_MINIMA}%)</dt><dd class="text-2xl font-bold ${r.percentual !== null && r.percentual < C.FREQ_MINIMA ? 'text-red-800' : 'text-slate-900'}">${fmt.pct(r.percentual)}</dd></div>
            <div><dt class="text-xs font-medium uppercase text-slate-600">Aulas ministradas</dt><dd class="text-2xl font-bold text-slate-900">${r.aulas}</dd></div>
            <div><dt class="text-xs font-medium uppercase text-slate-600">Faltas</dt><dd class="text-2xl font-bold text-slate-900">${r.faltas}</dd></div>
          </dl>${motivos}
        </section>`;
      }

      // ---------- Formulários ----------
      function camposNota(n) {
        return [
          { id: 'nota-valor', name: 'valor', label: 'Nota (0 a 10)', type: 'text', inputmode: 'decimal', value: n ? String(n.valor).replace('.', ',') : '', required: true, placeholder: 'Ex.: 7,5', maxlength: 5, autocomplete: 'off' },
          { id: 'nota-tipo', name: 'tipo', label: 'Avaliação', type: 'select', value: n ? n.tipo : '', required: true, options: C.TIPOS_NOTA.map((t) => ({ value: t, label: t })) },
          { id: 'nota-data', name: 'data', label: 'Data', type: 'date', value: n ? n.data : V.hoje(), required: true, max: V.hoje() }
        ].map((c) => App.ui.campo(c, '')).join('');
      }
      function camposFreq(f) {
        return [
          { id: 'freq-aulas', name: 'aulasMinistradas', label: 'Aulas ministradas', type: 'number', inputmode: 'numeric', value: f ? f.aulasMinistradas : '', required: true, min: 1, max: 200, step: 1, placeholder: 'Ex.: 20' },
          { id: 'freq-faltas', name: 'faltas', label: 'Faltas', type: 'number', inputmode: 'numeric', value: f ? f.faltas : '', required: true, min: 0, step: 1, placeholder: 'Ex.: 2', hint: 'Não pode ser maior que as aulas ministradas.' },
          { id: 'freq-data', name: 'data', label: 'Data', type: 'date', value: f ? f.data : V.hoje(), required: true, max: V.hoje() }
        ].map((c) => App.ui.campo(c, '')).join('');
      }

      function htmlFormularios(r) {
        const eN = editando && editando.tipo === 'nota' ? App.store.obter('notas', editando.id) : null;
        const eF = editando && editando.tipo === 'freq' ? App.store.obter('frequencias', editando.id) : null;
        const botoes = (rotulo, edit) => `<div class="mt-2 flex gap-2"><button type="submit" class="btn-primary">${edit ? 'Salvar alteração' : rotulo}</button>${edit ? '<button type="button" class="btn-secondary" data-acao="cancelar-edicao">Cancelar edição</button>' : ''}</div>`;
        return `<div class="grid gap-4 lg:grid-cols-2">
          <section class="card" aria-labelledby="h-nota">
            <h2 id="h-nota" class="mb-3 text-base font-bold">${eN ? 'Editar nota' : 'Registrar nota'}</h2>
            <form id="form-nota" novalidate><input type="hidden" name="matriculaId" value="${r.matricula.id}">
              <div class="grid gap-x-3 sm:grid-cols-3">${camposNota(eN)}</div>${botoes('Registrar nota', !!eN)}</form>
          </section>
          <section class="card" aria-labelledby="h-freq">
            <h2 id="h-freq" class="mb-3 text-base font-bold">${eF ? 'Editar frequência' : 'Registrar frequência'}</h2>
            <form id="form-freq" novalidate><input type="hidden" name="matriculaId" value="${r.matricula.id}">
              <div class="grid gap-x-3 sm:grid-cols-3">${camposFreq(eF)}</div>${botoes('Registrar frequência', !!eF)}</form>
          </section>
        </div>`;
      }

      function htmlHistorico(r) {
        const acoes = (tipo, id, desc) => podeEditar ? `<button type="button" class="btn-ghost" data-acao="editar-${tipo}" data-id="${id}" aria-label="Editar ${esc(desc)}">Editar</button>
          <button type="button" class="btn-ghost-danger" data-acao="excluir-${tipo}" data-id="${id}" aria-label="Excluir ${esc(desc)}">Excluir</button>` : '';
        const notas = r.notas.slice().sort((a, b) => a.data.localeCompare(b.data));
        const regs = r.registros.slice().sort((a, b) => a.data.localeCompare(b.data));
        return `<div class="grid gap-4 lg:grid-cols-2">
          <section class="card" aria-labelledby="h-hn"><h2 id="h-hn" class="mb-3 text-base font-bold">Notas lançadas</h2>
            ${notas.length ? `<div class="overflow-x-auto"><table class="min-w-full"><caption class="sr-only">Notas lançadas</caption><thead><tr><th class="th" scope="col">Avaliação</th><th class="th" scope="col">Nota</th><th class="th" scope="col">Data</th><th class="th" scope="col">Ações</th></tr></thead><tbody class="divide-y divide-slate-100">
              ${notas.map((n) => `<tr><td class="td">${esc(n.tipo)}</td><td class="td font-semibold tabular-nums ${n.valor < C.MEDIA_APROVACAO ? 'text-red-800' : ''}">${fmt.num(n.valor)}</td><td class="td">${fmt.data(n.data)}</td><td class="td whitespace-nowrap">${acoes('nota', n.id, `nota ${n.tipo}`)}</td></tr>`).join('')}
            </tbody></table></div>` : App.ui.vazio('Nenhuma nota lançada para esta matrícula.')}
          </section>
          <section class="card" aria-labelledby="h-hf"><h2 id="h-hf" class="mb-3 text-base font-bold">Frequência lançada</h2>
            ${regs.length ? `<div class="overflow-x-auto"><table class="min-w-full"><caption class="sr-only">Frequência lançada</caption><thead><tr><th class="th" scope="col">Data</th><th class="th" scope="col">Aulas</th><th class="th" scope="col">Faltas</th><th class="th" scope="col">Ações</th></tr></thead><tbody class="divide-y divide-slate-100">
              ${regs.map((f) => `<tr><td class="td">${fmt.data(f.data)}</td><td class="td tabular-nums">${f.aulasMinistradas}</td><td class="td tabular-nums">${f.faltas}</td><td class="td whitespace-nowrap">${acoes('freq', f.id, `frequência de ${fmt.data(f.data)}`)}</td></tr>`).join('')}
            </tbody></table></div>` : App.ui.vazio('Nenhuma frequência lançada para esta matrícula.')}
          </section>
        </div>`;
      }

      function desenharDetalhe(foco) {
        const m = matriculaId ? App.store.obter('matriculas', matriculaId) : null;
        if (!m) {
          detalhe.innerHTML = App.ui.vazio('Selecione uma matrícula acima para ver o resumo e lançar notas e frequência.');
          return;
        }
        const r = App.rules.resumirMatricula(m);
        detalhe.innerHTML = `<div class="space-y-4">${htmlResumo(r)}${podeEditar ? htmlFormularios(r) : '<p class="rounded-lg bg-slate-200 px-3 py-2 text-sm">Somente consulta para o seu perfil.</p>'}${htmlHistorico(r)}</div>`;
        if (podeEditar) ligarFormularios(m, r);
        if (foco) { const el = detalhe.querySelector(foco); if (el) el.focus(); }
      }

      function ligarFormularios(m) {
        const fN = detalhe.querySelector('#form-nota');
        const fF = detalhe.querySelector('#form-freq');
        const liveN = App.ui.validacaoEmTempoReal(fN, V.validarNota);
        const liveF = App.ui.validacaoEmTempoReal(fF, V.validarFrequencia);

        async function salvar(form, live, tipo) {
          if (!live.validar()) { App.ui.toast('Corrija os campos destacados antes de continuar.', 'warning'); return; }
          const antes = App.rules.resumirMatricula(m).situacao;
          const d = live.dados();
          const botao = form.querySelector('[type=submit]');
          await App.ui.comCarregamento(botao, 'Salvando…', async () => {
            const idEd = editando && editando.tipo === tipo ? editando.id : null;
            if (tipo === 'nota') {
              const obj = { matriculaId: m.id, valor: Number(String(d.valor).replace(',', '.')), tipo: d.tipo, data: d.data };
              if (idEd) App.store.atualizar('notas', idEd, obj); else App.store.inserir('notas', obj);
              App.store.registrar(idEd ? 'ALTERAR' : 'CRIAR', 'nota', `${obj.tipo} = ${obj.valor} — ${rotuloMatricula(m)}`);
            } else {
              const obj = { matriculaId: m.id, aulasMinistradas: Number(d.aulasMinistradas), faltas: Number(d.faltas), data: d.data };
              if (idEd) App.store.atualizar('frequencias', idEd, obj); else App.store.inserir('frequencias', obj);
              App.store.registrar(idEd ? 'ALTERAR' : 'CRIAR', 'frequência', `${obj.faltas} falta(s) em ${obj.aulasMinistradas} aula(s) — ${rotuloMatricula(m)}`);
            }
            const depois = App.rules.recalcular(m.id).situacao; // RN04
            editando = null;
            const mudou = antes !== depois ? ` (antes: ${antes})` : '';
            const grave = depois === 'Em Atenção' || depois === 'Reprovado';
            App.ui.toast(`${tipo === 'nota' ? 'Nota' : 'Frequência'} ${idEd ? 'atualizada' : 'registrada'}. Situação recalculada: ${depois}${mudou}.`, grave ? 'warning' : 'success');
          });
          desenharDetalhe(tipo === 'nota' ? '#nota-valor' : '#freq-aulas');
        }
        fN.addEventListener('submit', (e) => { e.preventDefault(); salvar(fN, liveN, 'nota'); });
        fF.addEventListener('submit', (e) => { e.preventDefault(); salvar(fF, liveF, 'freq'); });
      }

      // ---------- Eventos ----------
      raiz.querySelector('#busca-aluno').addEventListener('input', preencherSelect);
      selMat.addEventListener('change', () => {
        matriculaId = selMat.value ? Number(selMat.value) : null;
        editando = null;
        desenharDetalhe();
      });

      // Delegação: um listener trata editar/excluir/cancelar de todas as linhas
      detalhe.addEventListener('click', async (ev) => {
        const alvo = ev.target.closest('[data-acao]');
        if (!alvo) return;
        const { acao, id } = alvo.dataset;
        if (acao === 'cancelar-edicao') { editando = null; desenharDetalhe(); return; }
        if (acao === 'editar-nota') { editando = { tipo: 'nota', id: Number(id) }; desenharDetalhe('#nota-valor'); return; }
        if (acao === 'editar-freq') { editando = { tipo: 'freq', id: Number(id) }; desenharDetalhe('#freq-aulas'); return; }
        if (acao === 'excluir-nota' || acao === 'excluir-freq') {
          const nota = acao === 'excluir-nota';
          const ok = await App.ui.confirmar({
            titulo: nota ? 'Excluir nota?' : 'Excluir registro de frequência?',
            mensagem: 'O registro será removido e a média e a situação serão recalculadas. Esta ação não pode ser desfeita.',
            rotulo: 'Excluir', perigo: true
          });
          if (!ok) return;
          const m = App.store.obter('matriculas', matriculaId);
          const antes = App.rules.resumirMatricula(m).situacao;
          App.store.remover(nota ? 'notas' : 'frequencias', id);
          App.store.registrar('EXCLUIR', nota ? 'nota' : 'frequência', rotuloMatricula(m));
          const depois = App.rules.recalcular(m.id).situacao;
          editando = null;
          App.ui.toast(`Registro excluído. Situação recalculada: ${depois}.`, antes === depois ? 'success' : 'warning');
          desenharDetalhe('#resumo-titulo');
        }
      });

      preencherSelect();
      desenharDetalhe();
    }
  };
})(window.App = window.App || {});
