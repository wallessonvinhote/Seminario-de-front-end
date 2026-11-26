(function (App) {
  'use strict';

  const { esc } = App.ui;

  App.criarCrud = function criarCrud(cfg) {
    const editar = () => App.auth.pode(cfg.permissaoEditar);

    function render(raiz, params) {
      const podeEditar = editar();
      raiz.innerHTML = `
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 id="titulo-pagina" tabindex="-1" class="text-2xl font-bold text-slate-900">${esc(cfg.titulo)}</h1>
            ${cfg.dica ? `<p class="mt-1 text-sm text-slate-700">${esc(cfg.dica)}</p>` : ''}
          </div>
          ${podeEditar ? `<button type="button" class="btn-primary" data-acao="novo">+ Novo ${esc(cfg.singular)}</button>` : `<p class="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-800">Somente consulta para o seu perfil.</p>`}
        </div>
        <div class="card mb-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="lg:col-span-2">
              <label for="busca" class="label">Pesquisar</label>
              <input id="busca" type="search" class="input" placeholder="Digite para filtrar…" autocomplete="off">
            </div>
            ${(cfg.filtros || []).map((f) => `
              <div>
                <label for="filtro-${f.id}" class="label">${esc(f.rotulo)}</label>
                <select id="filtro-${f.id}" class="input" data-filtro="${f.id}">
                  <option value="">Todos</option>
                  ${f.opcoes().map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
                </select>
              </div>`).join('')}
          </div>
        </div>
        <p id="contagem" class="mb-2 text-sm text-slate-700" aria-live="polite"></p>
        <div id="lista"></div>`;

      const lista = raiz.querySelector('#lista');
      const contagem = raiz.querySelector('#contagem');

      function itensFiltrados() {
        const termo = raiz.querySelector('#busca').value.trim().toLowerCase();
        let itens = App.store.listar(cfg.colecao).slice();
        if (cfg.ordenar) itens.sort(cfg.ordenar);
        if (termo) itens = itens.filter((i) => cfg.texto(i).toLowerCase().includes(termo));
        (cfg.filtros || []).forEach((f) => {
          const v = raiz.querySelector(`#filtro-${f.id}`).value;
          if (v) itens = itens.filter((i) => f.combina(i, v));
        });
        return itens;
      }

      function desenharLista() {
        const itens = itensFiltrados();
        const total = App.store.listar(cfg.colecao).length;
        contagem.textContent = `${itens.length} de ${total} registro(s) exibido(s).`;
        if (!itens.length) {
          lista.innerHTML = App.ui.vazio(total ? 'Nenhum registro corresponde à busca ou aos filtros.' : `Nenhum ${cfg.singular} cadastrado ainda.`);
          return;
        }
        lista.innerHTML = `<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-slate-200">
            <caption class="sr-only">${esc(cfg.titulo)}</caption>
            <thead><tr>${cfg.colunas.map((c) => `<th scope="col" class="th">${esc(c.rotulo)}</th>`).join('')}<th scope="col" class="th">Ações</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${itens.map((i) => `<tr class="hover:bg-slate-50">
                ${cfg.colunas.map((c) => `<td class="td">${c.celula(i)}</td>`).join('')}
                <td class="td whitespace-nowrap">
                  ${(cfg.acoesExtras ? cfg.acoesExtras(i) : '')}
                  ${editar() ? `<button type="button" class="btn-ghost" data-acao="editar" data-id="${i.id}" aria-label="Editar ${esc(cfg.singular)} ${esc(cfg.descricao(i))}">Editar</button>
                  <button type="button" class="btn-ghost-danger" data-acao="excluir" data-id="${i.id}" aria-label="Excluir ${esc(cfg.singular)} ${esc(cfg.descricao(i))}">Excluir</button>` : ''}
                </td></tr>`).join('')}
            </tbody></table></div>`;
      }

      // ---------- Formulário (criar/editar) ----------
      function abrirFormulario(item, valores) {
        const editando = !!item;
        const base = item || valores || {};
        const campos = cfg.campos(base, editando);
        abrirFormularioModal(campos, editando, item);
      }

      function abrirFormularioModal(campos, editando, item) {
        const html = `<form novalidate id="form-crud" class="space-y-1">
          <div class="grid gap-x-4 sm:grid-cols-2">${campos.map((c) => App.ui.campo(c, '')).join('')}</div>
          <p class="text-xs text-slate-600">Campos com <span class="text-red-700">*</span> são obrigatórios.</p>
          <div class="flex justify-end gap-2 pt-3">
            <button type="button" class="btn-secondary" data-cancelar>Cancelar</button>
            <button type="submit" class="btn-primary">${editando ? 'Salvar alterações' : 'Cadastrar'}</button>
          </div></form>`;

        App.ui.abrirModal({
          titulo: `${editando ? 'Editar' : 'Novo'} ${cfg.singular}`,
          html,
          aoMontar(corpo, fechar) {
            const form = corpo.querySelector('form');
            const contexto = () => ({ id: item ? item.id : null, editando });
            const live = App.ui.validacaoEmTempoReal(form, cfg.validar, contexto);
            if (cfg.aoMontarFormulario) cfg.aoMontarFormulario(form, item, live);
            corpo.querySelector('[data-cancelar]').addEventListener('click', fechar);

            form.addEventListener('submit', async (ev) => {
              ev.preventDefault();
              if (!live.validar()) {
                App.ui.toast('Corrija os campos destacados antes de continuar.', 'warning');
                return;
              }
              const botao = form.querySelector('[type=submit]');
              await App.ui.comCarregamento(botao, 'Salvando…', async () => {
                let obj = cfg.paraObjeto(live.dados(), item);
                let salvo;
                if (editando) {
                  salvo = App.store.atualizar(cfg.colecao, item.id, obj);
                  App.store.registrar('ALTERAR', cfg.singular, cfg.descricao(salvo));
                  if (cfg.aposAtualizar) await cfg.aposAtualizar(salvo, item);
                  App.ui.toast(`${cfg.singularMaiusculo} atualizad${cfg.genero} com sucesso.`, 'success');
                } else {
                  salvo = App.store.inserir(cfg.colecao, obj);
                  App.store.registrar('CRIAR', cfg.singular, cfg.descricao(salvo));
                  App.ui.toast(`${cfg.singularMaiusculo} cadastrad${cfg.genero} com sucesso.`, 'success');
                }
                fechar();
                desenharLista();
                if (cfg.aposSalvar) await cfg.aposSalvar(salvo, !editando);
                if (document.activeElement === document.body) raiz.querySelector('h1').focus();
              });
            });
          }
        });
      }

      async function excluir(id) {
        const item = App.store.obter(cfg.colecao, id);
        if (!item) return;
        const bloqueio = cfg.bloquearExclusao ? cfg.bloquearExclusao(item) : null;
        if (bloqueio) { App.ui.toast(bloqueio, 'warning', 8000); return; }
        const extra = cfg.avisoExclusao ? ' ' + cfg.avisoExclusao(item) : '';
        const ok = await App.ui.confirmar({
          titulo: `Excluir ${cfg.singular}?`,
          mensagem: `Você vai excluir ${cfg.artigo} ${cfg.singular} "${cfg.descricao(item)}". Esta ação não pode ser desfeita.${extra}`,
          rotulo: 'Excluir',
          perigo: true
        });
        if (!ok) return;
        if (cfg.cascata) cfg.cascata(item);
        App.store.remover(cfg.colecao, item.id);
        App.store.registrar('EXCLUIR', cfg.singular, cfg.descricao(item));
        App.ui.toast(`${cfg.singularMaiusculo} excluíd${cfg.genero} com sucesso.`, 'success');
        desenharLista();
        if (document.activeElement === document.body) raiz.querySelector('h1').focus();
      }

      // ---------- Delegação de eventos ----------
      raiz.addEventListener('click', (ev) => {
        const alvo = ev.target.closest('[data-acao]');
        if (!alvo || !raiz.contains(alvo)) return;
        const { acao, id } = alvo.dataset;
        if (acao === 'novo') abrirFormulario(null, cfg.valoresIniciais ? cfg.valoresIniciais() : null);
        else if (acao === 'editar') abrirFormulario(App.store.obter(cfg.colecao, id));
        else if (acao === 'excluir') excluir(id);
        else if (cfg.aoAcao) cfg.aoAcao(acao, id, { desenharLista });
      });
      raiz.addEventListener('input', (ev) => { if (ev.target.id === 'busca') desenharLista(); });
      raiz.addEventListener('change', (ev) => { if (ev.target.dataset && ev.target.dataset.filtro) desenharLista(); });

      desenharLista();

      // Abre o formulário já preenchido (ex.: vindo do cadastro de aluno)
      if (cfg.abrirComParametros && editar()) {
        const valores = cfg.abrirComParametros(params || {});
        if (valores) setTimeout(() => abrirFormulario(null, valores), 0);
      }
    }

    return { titulo: cfg.titulo, render };
  };
})(window.App = window.App || {});
