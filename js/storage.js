(function (App) {
  'use strict';

  const COLECOES = ['cursos', 'disciplinas', 'alunos', 'matriculas', 'notas', 'frequencias', 'usuarios', 'auditoria'];
  let memoriaFallback = null; // usado se o localStorage estiver indisponível

  function lerBruto() {
    try { return localStorage.getItem(App.config.CHAVE_BD); } catch (e) { return memoriaFallback; }
  }
  function gravarBruto(texto) {
    try { localStorage.setItem(App.config.CHAVE_BD, texto); return true; } catch (e) { memoriaFallback = texto; return false; }
  }

  async function carregarSeed() {
    try {
      const resp = await fetch('data/seed.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const dados = await resp.json();
      return { dados, origem: 'fetch' };
    } catch (erro) {
      if (window.SEED_FALLBACK) return { dados: JSON.parse(JSON.stringify(window.SEED_FALLBACK)), origem: 'embutido' };
      throw new Error('Não foi possível carregar os dados iniciais.');
    }
  }

  const store = {
    bd: null,
    origemSeed: null,

    /** Carrega do localStorage; se vazio ou corrompido, semeia com os dados iniciais. */
    async iniciar() {
      const bruto = lerBruto();
      if (bruto) {
        try {
          const lido = JSON.parse(bruto);
          if (lido && COLECOES.every((c) => Array.isArray(lido[c]))) {
            this.bd = lido;
            this.origemSeed = lido.meta && lido.meta.origemSeed;
            return;
          }
        } catch (e) { /* dado corrompido: recria abaixo */ }
      }
      await this.restaurarDemonstracao();
    },

    async restaurarDemonstracao() {
      const { dados, origem } = await carregarSeed();
      const bd = { meta: { origemSeed: origem, criadoEm: new Date().toISOString(), seq: {} } };
      for (const c of COLECOES) bd[c] = [];
      for (const c of COLECOES) if (Array.isArray(dados[c])) bd[c] = dados[c];
      // Nunca persistir senha em texto puro: converte para hash
      for (const u of bd.usuarios) {
        u.senhaHash = await App.auth.hash(u.senha);
        delete u.senha;
      }
      for (const c of COLECOES) bd.meta.seq[c] = bd[c].reduce((max, x) => Math.max(max, x.id || 0), 0);
      this.bd = bd;
      this.origemSeed = origem;
      this.salvar();
    },

    salvar() {
      return gravarBruto(JSON.stringify(this.bd));
    },

    // ---------- CRUD genérico ----------
    listar(colecao) { return this.bd[colecao]; },
    obter(colecao, id) { return this.bd[colecao].find((x) => x.id === Number(id)) || null; },
    buscar(colecao, fn) { return this.bd[colecao].filter(fn); },

    inserir(colecao, objeto) {
      const id = (this.bd.meta.seq[colecao] || 0) + 1;
      this.bd.meta.seq[colecao] = id;
      const novo = Object.assign({ id }, objeto);
      this.bd[colecao].push(novo);
      this.salvar();
      return novo;
    },

    atualizar(colecao, id, alteracoes) {
      const item = this.obter(colecao, id);
      if (!item) return null;
      Object.assign(item, alteracoes);
      this.salvar();
      return item;
    },

    remover(colecao, id) {
      const i = this.bd[colecao].findIndex((x) => x.id === Number(id));
      if (i < 0) return false;
      this.bd[colecao].splice(i, 1);
      this.salvar();
      return true;
    },

    removerVarios(colecao, fn) {
      this.bd[colecao] = this.bd[colecao].filter((x) => !fn(x));
      this.salvar();
    },

    // ---------- Rastreabilidade (RNF05) ----------
    registrar(acao, entidade, detalhe) {
      const u = App.auth.usuarioAtual();
      this.bd.auditoria.push({
        id: (this.bd.meta.seq.auditoria = (this.bd.meta.seq.auditoria || 0) + 1),
        quando: new Date().toISOString(),
        usuario: u ? u.nome : 'anônimo',
        perfil: u ? u.perfil : '-',
        acao,
        entidade,
        detalhe: detalhe || ''
      });
      // Mantém o log em tamanho razoável
      if (this.bd.auditoria.length > 500) this.bd.auditoria.splice(0, this.bd.auditoria.length - 500);
      this.salvar();
    }
  };

  App.store = store;
})(window.App = window.App || {});
