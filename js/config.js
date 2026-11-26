(function (App) {
  'use strict';

  App.config = Object.freeze({
    // Parâmetros institucionais (RN02, RN04, RN05)
    MEDIA_APROVACAO: 7.0,   // média mínima institucional
    MEDIA_REPROVACAO: 5.0,  // abaixo disso: Reprovado
    FREQ_MINIMA: 75,        // % mínimo de presença exigido
    FREQ_CRITICA: 60,       // abaixo disso: Reprovado por falta
    NOTA_MIN: 0,
    NOTA_MAX: 10,
    TIPOS_NOTA: ['AV1', 'AV2', 'Trabalho', 'Prova Final', 'Recuperação'],
    SEMESTRE_ATUAL: '2026.2',

    // Controle de acesso por perfil (RNF05)
    PERFIS: { coordenador: 'Coordenação', secretaria: 'Secretaria', aluno: 'Aluno' },
    PERMISSOES: {
      coordenador: [
        'ver:painel', 'ver:alunos', 'ver:cursos', 'ver:disciplinas', 'ver:matriculas', 'ver:lancamentos', 'ver:boletim', 'ver:auditoria',
        'editar:alunos', 'editar:cursos', 'editar:disciplinas', 'editar:matriculas', 'editar:lancamentos',
        'cpf:completo', 'dados:restaurar'
      ],
      secretaria: [
        'ver:alunos', 'ver:cursos', 'ver:disciplinas', 'ver:matriculas', 'ver:lancamentos', 'ver:boletim',
        'editar:alunos', 'editar:matriculas', 'editar:lancamentos'
      ],
      aluno: ['ver:boletim']
    },
    ROTA_INICIAL: { coordenador: 'painel', secretaria: 'alunos', aluno: 'boletim' },

    // Proteção contra tentativas repetidas de login
    LOGIN_MAX_TENTATIVAS: 5,
    LOGIN_BLOQUEIO_MS: 30000,

    // Chaves de armazenamento
    CHAVE_BD: 'horizonte.v1.bd',
    CHAVE_SESSAO: 'horizonte.v1.sessao'
  });

  // Itens do menu principal, na ordem de exibição
  App.MENU = [
    { rota: 'painel', rotulo: 'Painel gerencial' },
    { rota: 'alunos', rotulo: 'Alunos' },
    { rota: 'cursos', rotulo: 'Cursos' },
    { rota: 'disciplinas', rotulo: 'Disciplinas' },
    { rota: 'matriculas', rotulo: 'Matrículas' },
    { rota: 'lancamentos', rotulo: 'Notas e frequência' },
    { rota: 'boletim', rotulo: 'Boletim' },
    { rota: 'auditoria', rotulo: 'Auditoria' }
  ];

  App.views = App.views || {};
})(window.App = window.App || {});
