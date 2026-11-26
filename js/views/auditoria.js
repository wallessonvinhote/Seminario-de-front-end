(function (App) {
  'use strict';

  const { esc, fmt } = App.ui;

  App.views.auditoria = {
    titulo: 'Auditoria',

    render(raiz) {
      raiz.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 id="titulo-pagina" tabindex="-1" class="text-2xl font-bold text-slate-900">Auditoria de operações</h1>
            <p class="mt-1 text-sm text-slate-700">Quem fez o quê e quando: acessos, cadastros, alterações, exclusões e tentativas negadas.</p>
          </div>
          ${App.auth.pode('dados:restaurar') ? '<button type="button" id="btn-restaurar" class="btn-secondary">Restaurar dados de demonstração</button>' : ''}
        </div>
        <div class="card mt-4 grid gap-3 sm:grid-cols-3">
          <div class="sm:col-span-2"><label for="busca-log" class="label">Pesquisar</label><input id="busca-log" type="search" class="input" placeholder="Usuário, entidade ou detalhe…" autocomplete="off"></div>
          <div><label for="filtro-acao" class="label">Ação</label><select id="filtro-acao" class="input"><option value="">Todas</option>
            ${['LOGIN', 'LOGIN_FALHOU', 'LOGOUT', 'CRIAR', 'ALTERAR', 'EXCLUIR', 'ACESSO_NEGADO'].map((a) => `<option>${a}</option>`).join('')}</select></div>
        </div>
        <p id="contagem" class="mt-3 text-sm text-slate-700" aria-live="polite"></p>
        <div id="log" class="mt-2"></div>`;

      const cor = { LOGIN_FALHOU: 'badge-warn', ACESSO_NEGADO: 'badge-bad', EXCLUIR: 'badge-bad', CRIAR: 'badge-ok', ALTERAR: 'badge-neutral' };

      function desenhar() {
        const termo = raiz.querySelector('#busca-log').value.trim().toLowerCase();
        const acao = raiz.querySelector('#filtro-acao').value;
        const todos = App.store.listar('auditoria').slice().reverse();
        const itens = todos.filter((l) => (!acao || l.acao === acao) && (!termo || `${l.usuario} ${l.entidade} ${l.detalhe}`.toLowerCase().includes(termo))).slice(0, 200);
        raiz.querySelector('#contagem').textContent = `${itens.length} registro(s) exibido(s) (máximo de 200, do mais recente ao mais antigo).`;
        raiz.querySelector('#log').innerHTML = itens.length ? `<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table class="min-w-full divide-y divide-slate-200">
          <caption class="sr-only">Registro de operações</caption>
          <thead><tr><th class="th" scope="col">Quando</th><th class="th" scope="col">Usuário</th><th class="th" scope="col">Perfil</th><th class="th" scope="col">Ação</th><th class="th" scope="col">Entidade</th><th class="th" scope="col">Detalhe</th></tr></thead>
          <tbody class="divide-y divide-slate-100">${itens.map((l) => `<tr><td class="td whitespace-nowrap">${esc(fmt.dataHora(l.quando))}</td><td class="td">${esc(l.usuario)}</td><td class="td">${esc(App.config.PERFIS[l.perfil] || l.perfil)}</td>
            <td class="td"><span class="${cor[l.acao] || 'badge-neutral'}">${esc(l.acao)}</span></td><td class="td">${esc(l.entidade)}</td><td class="td">${esc(l.detalhe)}</td></tr>`).join('')}</tbody></table></div>`
          : App.ui.vazio('Nenhum registro encontrado.');
      }

      const restaurar = raiz.querySelector('#btn-restaurar');
      if (restaurar) {
        restaurar.addEventListener('click', async () => {
          const ok = await App.ui.confirmar({
            titulo: 'Restaurar dados de demonstração?',
            mensagem: 'Todos os cadastros e lançamentos atuais serão apagados e substituídos pelos dados fictícios iniciais. Esta ação não pode ser desfeita.',
            rotulo: 'Restaurar', perigo: true
          });
          if (!ok) return;
          App.auth.sair();
          await App.store.restaurarDemonstracao();
          history.replaceState(null, '', location.pathname + location.search);
          App.rotear();
          App.ui.toast('Dados de demonstração restaurados. Faça login novamente.', 'success');
        });
      }

      raiz.addEventListener('input', (e) => { if (e.target.id === 'busca-log') desenhar(); });
      raiz.addEventListener('change', (e) => { if (e.target.id === 'filtro-acao') desenhar(); });
      desenhar();
    }
  };
})(window.App = window.App || {});
