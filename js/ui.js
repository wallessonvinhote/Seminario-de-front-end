(function (App) {
  'use strict';

  const C = App.config;

  // ---------- Segurança: escape de HTML (previne XSS ao usar innerHTML) ----------
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

  // ---------- Formatadores pt-BR ----------
  const fmt = {
    num(n, casas = 1) { return n === null || n === undefined ? '—' : Number(n).toFixed(casas).replace('.', ','); },
    pct(n) { return n === null || n === undefined ? '—' : `${Number(n).toFixed(1).replace('.', ',')}%`; },
    data(iso) { if (!iso) return '—'; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; },
    dataHora(iso) { const d = new Date(iso); return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }); }
  };

  // ---------- Toasts (região aria-live) ----------
  function toast(mensagem, tipo = 'success', ms = 5000) {
    const regiao = document.getElementById('toasts');
    if (!regiao) return;
    const estilos = {
      success: 'border-emerald-700 bg-emerald-50 text-emerald-950',
      warning: 'border-amber-700 bg-amber-50 text-amber-950',
      error: 'border-red-700 bg-red-50 text-red-950'
    };
    const icones = { success: '✔', warning: '⚠', error: '✖' };
    const el = document.createElement('div');
    el.className = `pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-sm shadow-lg ${estilos[tipo] || estilos.success}`;
    el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span aria-hidden="true" class="font-bold">${icones[tipo] || ''}</span><p class="flex-1">${esc(mensagem)}</p>
      <button type="button" class="font-bold leading-none" aria-label="Fechar aviso">×</button>`;
    el.querySelector('button').addEventListener('click', () => el.remove());
    regiao.appendChild(el);
    while (regiao.children.length > 3) regiao.firstElementChild.remove(); // evita empilhar avisos sobre o conteúdo
    if (ms) setTimeout(() => el.remove(), ms);
  }

  // ---------- Modal acessível (foco preso, Esc fecha, devolve o foco) ----------
  function abrirModal({ titulo, html, largura = 'max-w-xl', aoMontar }) {
    const anterior = document.activeElement;
    const fundo = document.createElement('div');
    fundo.className = 'fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:items-center';
    const id = 'modal-titulo-' + Date.now();
    fundo.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="${id}" class="relative w-full ${largura} rounded-xl bg-white p-6 shadow-2xl">
        <div class="mb-4 flex items-start justify-between gap-4">
          <h2 id="${id}" class="text-lg font-bold text-slate-900">${esc(titulo)}</h2>
          <button type="button" data-fechar class="btn-ghost -mr-2 -mt-1 text-lg" aria-label="Fechar janela">✕</button>
        </div>
        <div data-corpo>${html}</div>
      </div>`;
    document.body.appendChild(fundo);
    document.body.classList.add('overflow-hidden');
    const dialogo = fundo.firstElementChild;

    const focaveis = () => Array.from(dialogo.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));

    function fechar() {
      document.removeEventListener('keydown', teclas, true);
      fundo.remove();
      document.body.classList.remove('overflow-hidden');
      if (anterior && document.contains(anterior)) anterior.focus();
    }
    function teclas(e) {
      if (e.key === 'Escape') { e.stopPropagation(); fechar(); return; }
      if (e.key !== 'Tab') return;
      const f = focaveis();
      if (!f.length) return;
      const primeiro = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
    document.addEventListener('keydown', teclas, true);
    fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fechar(); });
    dialogo.querySelector('[data-fechar]').addEventListener('click', fechar);

    if (aoMontar) aoMontar(dialogo.querySelector('[data-corpo]'), fechar);
    const alvo = dialogo.querySelector('[data-corpo] input:not([readonly]):not([type=hidden]), [data-corpo] select, [data-corpo] button') || dialogo.querySelector('[data-fechar]');
    alvo.focus();
    return fechar;
  }

  /** Confirmação (Promise<boolean>). Usada antes de exclusões — prevenção de erros. */
  function confirmar({ titulo, mensagem, rotulo = 'Confirmar', perigo = false }) {
    return new Promise((resolve) => {
      let resolvido = false;
      const concluir = (v) => { if (!resolvido) { resolvido = true; resolve(v); } };
      abrirModal({
        titulo,
        largura: 'max-w-md',
        html: `<p class="text-sm text-slate-700">${esc(mensagem)}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="btn-secondary" data-nao>Cancelar</button>
            <button type="button" class="${perigo ? 'btn-danger' : 'btn-primary'}" data-sim>${esc(rotulo)}</button>
          </div>`,
        aoMontar: (corpo, fechar) => {
          corpo.querySelector('[data-sim]').addEventListener('click', () => { concluir(true); fechar(); });
          corpo.querySelector('[data-nao]').addEventListener('click', () => { concluir(false); fechar(); });
          // Se fechar por Esc/✕/fundo, resolve como "não"
          const obs = new MutationObserver(() => { if (!document.body.contains(corpo)) { concluir(false); obs.disconnect(); } });
          obs.observe(document.body, { childList: true, subtree: true });
        }
      });
    });
  }

  // ---------- Campos de formulário ----------
  /**
   * def: { name, label, type, value, required, hint, options:[{value,label}], readonly, disabled,
   *        min, max, step, maxlength, inputmode, autocomplete, placeholder }
   */
  function campo(def, erro) {
    const id = def.id || ('f-' + def.name);
    const descr = [def.hint ? `${id}-hint` : '', `${id}-erro`].filter(Boolean).join(' ');
    const comum = `id="${id}" name="${esc(def.name)}" class="input" ${def.required ? 'required aria-required="true"' : ''}
      ${def.readonly ? 'readonly' : ''} ${def.disabled ? 'disabled' : ''} aria-describedby="${descr}" ${erro ? 'aria-invalid="true"' : ''}`;
    let controle;
    if (def.type === 'select') {
      const opcoes = (def.options || []).map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(def.value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
      controle = `<select ${comum}>${def.placeholder === false ? '' : `<option value="">${esc(def.placeholder || 'Selecione…')}</option>`}${opcoes}</select>`;
    } else {
      const attrs = ['min', 'max', 'step', 'maxlength', 'inputmode', 'autocomplete', 'placeholder'].filter((a) => def[a] !== undefined).map((a) => `${a}="${esc(def[a])}"`).join(' ');
      controle = `<input type="${def.type || 'text'}" ${comum} ${attrs} value="${esc(def.value ?? '')}">`;
    }
    return `<div class="${def.classe || ''}">
      <label for="${id}" class="label">${esc(def.label)}${def.required ? ' <span aria-hidden="true" class="text-red-700">*</span><span class="sr-only">(obrigatório)</span>' : ''}</label>
      ${controle}
      ${def.hint ? `<p id="${id}-hint" class="field-hint">${esc(def.hint)}</p>` : ''}
      <p id="${id}-erro" class="field-error" aria-live="polite">${esc(erro || '')}</p>
    </div>`;
  }

  /**
   * Validação em tempo real. Mostra o erro de um campo depois que o usuário
   * interagiu com ele (input/blur) e de todos ao tentar enviar.
   * Retorna { validar(), dados() }.
   */
  function validacaoEmTempoReal(form, validador, contexto = () => ({})) {
    const tocados = new Set();
    const dados = () => {
      const obj = {};
      new FormData(form).forEach((v, k) => { obj[k] = typeof v === 'string' ? v : ''; });
      form.querySelectorAll('input:disabled, select:disabled').forEach((el) => { obj[el.name] = el.value; });
      return obj;
    };
    function pintar(erros, todos) {
      form.querySelectorAll('[name]').forEach((el) => {
        const msg = erros[el.name];
        const mostrar = msg && (todos || tocados.has(el.name));
        el.setAttribute('aria-invalid', mostrar ? 'true' : 'false');
        const alvo = el.id ? document.getElementById(`${el.id}-erro`) : null;
        if (alvo) alvo.textContent = mostrar ? msg : '';
      });
    }
    function avaliar() { const e = validador(dados(), contexto()); pintar(e, false); return e; }
    const marcar = (ev) => { if (ev.target.name) { tocados.add(ev.target.name); avaliar(); } };
    form.addEventListener('input', marcar);
    form.addEventListener('focusout', marcar);
    form.addEventListener('change', marcar);
    return {
      dados,
      reavaliar: avaliar,
      validar() {
        const erros = validador(dados(), contexto());
        pintar(erros, true);
        const primeiro = form.querySelector('[aria-invalid="true"]');
        if (primeiro) primeiro.focus();
        return Object.keys(erros).length === 0;
      }
    };
  }

  // ---------- Peças visuais ----------
  const BADGES = {
    Aprovado: ['badge-ok', '✔'],
    'Em Atenção': ['badge-warn', '⚠'],
    Reprovado: ['badge-bad', '✖'],
    Cursando: ['badge-neutral', '…']
  };
  function badge(situacao) {
    const [cls, icone] = BADGES[situacao] || BADGES.Cursando;
    return `<span class="${cls}"><span aria-hidden="true">${icone}</span>${esc(situacao)}</span>`;
  }

  /** Gráfico de barras horizontais acessível (sem biblioteca). itens: [{rotulo, valor, texto, cor}] */
  function barras(itens, max) {
    if (!itens.length) return '<p class="text-sm text-slate-600">Sem dados para exibir.</p>';
    return `<ul class="space-y-3">${itens.map((i) => {
      const largura = max > 0 ? Math.max(2, Math.round((i.valor / max) * 100)) : 0;
      return `<li>
        <div class="mb-1 flex justify-between gap-3 text-sm"><span class="font-medium text-slate-800">${esc(i.rotulo)}</span><span class="font-semibold tabular-nums text-slate-900">${esc(i.texto)}</span></div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200" role="img" aria-label="${esc(i.rotulo)}: ${esc(i.texto)}"><div class="h-full rounded-full ${i.cor || 'bg-brand-600'}" style="width:${largura}%"></div></div>
      </li>`;
    }).join('')}</ul>`;
  }

  const vazio = (msg, acao = '') => `<div class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600"><p>${esc(msg)}</p>${acao}</div>`;

  function kpi(rotulo, valor, detalhe = '') {
    return `<div class="card"><p class="text-sm font-medium text-slate-600">${esc(rotulo)}</p><p class="mt-1 text-3xl font-bold text-brand-900">${esc(valor)}</p>${detalhe ? `<p class="mt-1 text-xs text-slate-600">${esc(detalhe)}</p>` : ''}</div>`;
  }

  /** Mostra estado de carregamento/ocupado num botão enquanto uma ação assíncrona roda. */
  async function comCarregamento(botao, textoOcupado, fn) {
    const original = botao.innerHTML;
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    botao.textContent = textoOcupado;
    try { return await fn(); } finally {
      botao.disabled = false;
      botao.removeAttribute('aria-busy');
      botao.innerHTML = original;
    }
  }

  const opcoesCursos = () => App.store.listar('cursos').map((c) => ({ value: c.id, label: c.nome }));

  App.ui = { esc, fmt, toast, abrirModal, confirmar, campo, validacaoEmTempoReal, badge, barras, vazio, kpi, comCarregamento, opcoesCursos };
})(window.App = window.App || {});
