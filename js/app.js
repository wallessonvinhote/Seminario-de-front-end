(function (App) {
  'use strict';

  const C = App.config;
  const $ = (sel) => document.querySelector(sel);

  const telaLogin = () => $('#tela-login');
  const telaApp = () => $('#tela-app');

  function parseHash() {
    const bruto = location.hash.replace(/^#\/?/, '');
    const [rota, query] = bruto.split('?');
    return { rota: rota || '', params: Object.fromEntries(new URLSearchParams(query || '')) };
  }

  function irPara(rota) { location.hash = '#/' + rota; }

  // ---------- Sessão ----------
  function mostrarLogin() {
    telaApp().hidden = true;
    telaLogin().hidden = false;
    document.title = 'Entrar — Sistema Acadêmico Horizonte do Saber';
    App.views.login.render(telaLogin(), () => {
      const u = App.auth.usuarioAtual();
      telaLogin().hidden = true;
      telaLogin().innerHTML = '';
      location.hash = '#/' + C.ROTA_INICIAL[u.perfil];
      rotear();
    });
  }

  function montarMenu() {
    const u = App.auth.usuarioAtual();
    $('#usuario-nome').textContent = u.nome;
    $('#usuario-perfil').textContent = C.PERFIS[u.perfil];
    $('#menu-lista').innerHTML = App.MENU
      .filter((i) => App.auth.pode('ver:' + i.rota))
      .map((i) => `<li><a class="nav-link block" href="#/${i.rota}" data-rota="${i.rota}">${App.ui.esc(i.rotulo)}</a></li>`).join('');
  }

  // ---------- Roteador ----------
  function rotear() {
    const u = App.auth.usuarioAtual();
    if (!u) { mostrarLogin(); return; }

    telaLogin().hidden = true;
    telaApp().hidden = false;
    montarMenu();

    let { rota, params } = parseHash();
    if (!rota) { irPara(C.ROTA_INICIAL[u.perfil]); return; }

    const view = App.views[rota];
    if (!view || rota === 'login' || !App.auth.pode('ver:' + rota)) {
      if (view && rota !== 'login') {
        App.store.registrar('ACESSO_NEGADO', 'rota', `Tentou abrir "${rota}" sem permissão`);
        App.ui.toast('Você não tem permissão para acessar esta área.', 'error');
      }
      irPara(C.ROTA_INICIAL[u.perfil]);
      return;
    }

    const contenedor = $('#view');
    contenedor.innerHTML = '';
    const pagina = document.createElement('div');
    contenedor.appendChild(pagina);
    view.render(pagina, params);

    document.querySelectorAll('#menu-lista a').forEach((a) => {
      if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${view.titulo} — Sistema Acadêmico Horizonte do Saber`;
    $('#menu-lista').classList.add('hidden');
    $('#btn-menu').setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
    const h1 = pagina.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true }); // leitores de tela anunciam a nova página
  }

  // ---------- Inatividade: encerra a sessão após 15 min ----------
  let ultimaAtividade = Date.now();
  const LIMITE_INATIVIDADE = 15 * 60 * 1000;
  ['click', 'keydown', 'pointerdown'].forEach((ev) => document.addEventListener(ev, () => { ultimaAtividade = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (App.auth.usuarioAtual() && Date.now() - ultimaAtividade > LIMITE_INATIVIDADE) {
      App.auth.sair();
      App.ui.toast('Sessão encerrada por inatividade.', 'warning', 8000);
      location.hash = '';
      rotear();
    }
  }, 30000);

  // ---------- Eventos globais ----------
  function ligarEventosGlobais() {
    window.addEventListener('hashchange', rotear);

    $('#btn-sair').addEventListener('click', () => {
      App.auth.sair();
      location.hash = '';
      rotear();
    });

    $('#btn-menu').addEventListener('click', () => {
      const lista = $('#menu-lista');
      const aberto = lista.classList.toggle('hidden') === false;
      $('#btn-menu').setAttribute('aria-expanded', String(aberto));
    });
  }

  // ---------- Início ----------
  async function iniciar() {
    try {
      await App.store.iniciar();
    } catch (erro) {
      $('#carregando').innerHTML = `<p role="alert" class="text-red-800">Não foi possível iniciar o sistema: ${App.ui.esc(erro.message)}</p>`;
      return;
    }
    $('#carregando').hidden = true;
    ligarEventosGlobais();
    rotear();
  }

  App.rotear = rotear;
  document.addEventListener('DOMContentLoaded', iniciar);
})(window.App = window.App || {});
