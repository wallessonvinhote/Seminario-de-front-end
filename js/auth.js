(function (App) {
  'use strict';

  const C = App.config;
  let tentativas = 0;
  let bloqueadoAte = 0;

  /** Hash SHA-256 (Web Crypto). Fallback simples apenas se o navegador não oferecer crypto.subtle. */
  async function hash(texto) {
    const dados = new TextEncoder().encode('horizonte|' + texto);
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', dados);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381;
    for (const b of dados) h = ((h << 5) + h + b) | 0;
    return 'fallback-' + (h >>> 0).toString(16);
  }

  function lerSessao() {
    try { return JSON.parse(sessionStorage.getItem(C.CHAVE_SESSAO)); } catch (e) { return null; }
  }

  function usuarioAtual() {
    const s = lerSessao();
    if (!s) return null;
    const u = App.store.obter('usuarios', s.usuarioId);
    return u ? { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, alunoId: u.alunoId } : null;
  }

  function pode(permissao) {
    const u = usuarioAtual();
    return !!u && (C.PERMISSOES[u.perfil] || []).includes(permissao);
  }

  /** Retorna { ok, mensagem }. */
  async function entrar(email, senha) {
    const agora = Date.now();
    if (agora < bloqueadoAte) {
      const seg = Math.ceil((bloqueadoAte - agora) / 1000);
      return { ok: false, mensagem: `Muitas tentativas. Aguarde ${seg}s para tentar novamente.` };
    }
    const u = App.store.buscar('usuarios', (x) => x.email.toLowerCase() === String(email).trim().toLowerCase())[0];
    const h = await hash(senha);
    if (!u || u.senhaHash !== h) {
      tentativas++;
      App.store.registrar('LOGIN_FALHOU', 'sessão', `Tentativa inválida para "${String(email).trim().slice(0, 60)}"`);
      if (tentativas >= C.LOGIN_MAX_TENTATIVAS) {
        bloqueadoAte = Date.now() + C.LOGIN_BLOQUEIO_MS;
        tentativas = 0;
        return { ok: false, mensagem: `Muitas tentativas. Acesso bloqueado por ${C.LOGIN_BLOQUEIO_MS / 1000}s.` };
      }
      return { ok: false, mensagem: 'E-mail ou senha incorretos.' };
    }
    tentativas = 0;
    try { sessionStorage.setItem(C.CHAVE_SESSAO, JSON.stringify({ usuarioId: u.id })); } catch (e) { /* sessão só em memória */ }
    App.store.registrar('LOGIN', 'sessão', `${u.nome} (${C.PERFIS[u.perfil]})`);
    return { ok: true };
  }

  function sair() {
    const u = usuarioAtual();
    if (u) App.store.registrar('LOGOUT', 'sessão', u.nome);
    try { sessionStorage.removeItem(C.CHAVE_SESSAO); } catch (e) { /* ignora */ }
  }

  App.auth = { hash, usuarioAtual, pode, entrar, sair };
})(window.App = window.App || {});
