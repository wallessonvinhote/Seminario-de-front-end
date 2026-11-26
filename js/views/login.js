(function (App) {
  'use strict';

  const DEMO = [
    { rotulo: 'Coordenação', email: 'coordenacao@horizonte.edu.br', senha: 'coord123' },
    { rotulo: 'Secretaria', email: 'secretaria@horizonte.edu.br', senha: 'secret123' },
    { rotulo: 'Aluno', email: 'ana.souza@aluno.horizonte.edu.br', senha: 'aluno123' }
  ];

  App.views.login = {
    render(raiz, aoEntrar) {
      raiz.innerHTML = `
        <div class="flex min-h-screen items-center justify-center bg-brand-900 p-4">
          <main id="conteudo-login" class="w-full max-w-md">
            <div class="mb-6 text-center text-white">
              <p class="text-sm font-semibold uppercase tracking-widest text-brand-100">Faculdade Horizonte do Saber</p>
              <h1 class="mt-1 text-2xl font-bold">Sistema Acadêmico</h1>
              <p class="mt-1 text-sm text-brand-100">Gestão de alunos e desempenho</p>
            </div>
            <div class="rounded-2xl bg-white p-6 shadow-2xl">
              <h2 class="mb-4 text-lg font-bold">Entrar</h2>
              <form id="form-login" novalidate>
                ${App.ui.campo({ name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'username', maxlength: 80 }, '')}
                ${App.ui.campo({ name: 'senha', label: 'Senha', type: 'password', required: true, autocomplete: 'current-password', maxlength: 60 }, '')}
                <p id="erro-login" class="field-error" role="alert"></p>
                <button type="submit" class="btn-primary mt-2 w-full">Entrar</button>
              </form>
              <div class="mt-6 border-t border-slate-200 pt-4">
                <p class="text-sm font-semibold text-slate-800">Acesso de demonstração</p>
                <p class="mb-3 text-xs text-slate-600">Dados fictícios para a apresentação. Escolha um perfil para preencher o login:</p>
                <div class="flex flex-wrap gap-2">
                  ${DEMO.map((d, i) => `<button type="button" class="btn-secondary" data-demo="${i}">${d.rotulo}</button>`).join('')}
                </div>
              </div>
            </div>
          </main>
        </div>`;

      const form = raiz.querySelector('#form-login');
      const erroGeral = raiz.querySelector('#erro-login');

      const live = App.ui.validacaoEmTempoReal(form, (d) => {
        const e = {};
        if (!d.email.trim()) e.email = 'Informe o e-mail.';
        else if (!App.validators.emailValido(d.email)) e.email = 'E-mail inválido.';
        if (!d.senha) e.senha = 'Informe a senha.';
        return e;
      });

      raiz.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-demo]');
        if (!b) return;
        const d = DEMO[Number(b.dataset.demo)];
        form.email.value = d.email;
        form.senha.value = d.senha;
        erroGeral.textContent = '';
        form.querySelector('[type=submit]').focus();
      });

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        erroGeral.textContent = '';
        if (!live.validar()) return;
        const botao = form.querySelector('[type=submit]');
        await App.ui.comCarregamento(botao, 'Entrando…', async () => {
          const d = live.dados();
          const r = await App.auth.entrar(d.email, d.senha);
          if (r.ok) { aoEntrar(); return; }
          erroGeral.textContent = r.mensagem;
          form.senha.value = '';
          form.senha.focus();
        });
      });

      raiz.querySelector('[name=email]').focus();
    }
  };
})(window.App = window.App || {});
