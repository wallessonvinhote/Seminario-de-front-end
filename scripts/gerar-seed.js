const fs = require('fs');
const path = require('path');

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2026);
const between = (a, b) => a + rnd() * (b - a);
const round1 = (n) => Math.round(n * 10) / 10;

function cpfComDigitos(base9) {
  const calc = (digits) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += digits[i] * (digits.length + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d = base9.split('').map(Number);
  d.push(calc(d));
  d.push(calc(d));
  const s = d.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

const cursos = [
  { id: 1, nome: 'Engenharia de Software', cargaHoraria: 3600, coordenador: 'Profa. Helena Duarte' },
  { id: 2, nome: 'Administração', cargaHoraria: 3000, coordenador: 'Prof. Ricardo Almeida' },
  { id: 3, nome: 'Pedagogia', cargaHoraria: 3200, coordenador: 'Profa. Marta Siqueira' }
];

const disciplinas = [
  [1, 'Algoritmos e Lógica de Programação', 80, 1],
  [1, 'Estrutura de Dados', 80, 2],
  [1, 'Banco de Dados', 80, 3],
  [1, 'Engenharia de Requisitos', 60, 4],
  [1, 'Desenvolvimento Front-End', 80, 5],
  [2, 'Contabilidade Geral', 80, 1],
  [2, 'Gestão de Pessoas', 60, 2],
  [2, 'Marketing', 60, 3],
  [2, 'Administração Financeira', 80, 4],
  [2, 'Empreendedorismo', 60, 5],
  [3, 'Psicologia da Educação', 60, 1],
  [3, 'Didática', 60, 2],
  [3, 'Alfabetização e Letramento', 80, 3],
  [3, 'Políticas Educacionais', 60, 4],
  [3, 'Tecnologias na Educação', 60, 5]
].map((d, i) => ({ id: i + 1, cursoId: d[0], nome: d[1], cargaHoraria: d[2], semestre: d[3] }));

// [nome, cursoId, perfil de desempenho]
const alunosBase = [
  ['Ana Beatriz Souza', 1, 'otimo'],
  ['Bruno Henrique Lima', 1, 'medio'],
  ['Carla Fernanda Dias', 1, 'baixo'],
  ['Diego Martins Rocha', 1, 'faltoso'],
  ['Eduarda Nogueira Pinto', 1, 'bom'],
  ['Felipe Augusto Costa', 1, 'parcial'],
  ['Gabriela Torres Melo', 2, 'otimo'],
  ['Heitor Ramos Barbosa', 2, 'baixo'],
  ['Isabela Cardoso Reis', 2, 'medio'],
  ['João Pedro Campos', 2, 'faltoso'],
  ['Larissa Monteiro Alves', 2, 'bom'],
  ['Mateus Oliveira Freitas', 3, 'medio'],
  ['Natália Vieira Prado', 3, 'otimo'],
  ['Otávio Lopes Cunha', 3, 'baixo'],
  ['Patrícia Gomes Teixeira', 3, 'bom']
];

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const alunos = alunosBase.map((a, i) => {
  const partes = semAcento(a[0]).split(' ');
  return {
    id: i + 1,
    matricula: `2026${String(i + 1).padStart(4, '0')}`,
    nome: a[0],
    cpf: cpfComDigitos(String(100000000 + i * 7919237).slice(0, 9)),
    email: `${partes[0]}.${partes[partes.length - 1]}@aluno.horizonte.edu.br`,
    cursoId: a[1],
    perfil: a[2]
  };
});

const matriculas = [];
const notas = [];
const frequencias = [];
let mid = 1, nid = 1, fid = 1;

const dataBase = (dia) => `2026-${dia}`;

for (const aluno of alunos) {
  const discsCurso = disciplinas.filter((d) => d.cursoId === aluno.cursoId).slice(0, 3);
  for (const d of discsCurso) {
    const m = { id: mid++, alunoId: aluno.id, disciplinaId: d.id, dataMatricula: '2026-08-03', semestre: '2026.2', situacao: 'Cursando' };
    matriculas.push(m);

    const perfil = aluno.perfil;
    let faixa, faltasPorBloco;
    if (perfil === 'otimo') { faixa = [8.5, 10]; faltasPorBloco = [0, 1]; }
    else if (perfil === 'bom') { faixa = [7.2, 8.8]; faltasPorBloco = [0, 2]; }
    else if (perfil === 'medio') { faixa = [5.4, 7.0]; faltasPorBloco = [1, 3]; }
    else if (perfil === 'baixo') { faixa = [2.5, 5.2]; faltasPorBloco = [2, 5]; }
    else if (perfil === 'faltoso') { faixa = [6.5, 8.5]; faltasPorBloco = [5, 8]; }
    else { faixa = [6, 8]; faltasPorBloco = [1, 2]; }

    const tipos = perfil === 'parcial' ? ['AV1'] : ['AV1', 'AV2', 'Trabalho'];
    const dias = ['09-15', '10-20', '11-05'];
    tipos.forEach((tipo, k) => {
      notas.push({ id: nid++, matriculaId: m.id, valor: round1(between(faixa[0], faixa[1])), tipo, data: dataBase(dias[k]) });
    });

    ['09-30', '11-10'].forEach((dia) => {
      const faltas = Math.round(between(faltasPorBloco[0], faltasPorBloco[1]));
      frequencias.push({ id: fid++, matriculaId: m.id, aulasMinistradas: 20, faltas, data: dataBase(dia) });
    });
  }
}

const usuarios = [
  { id: 1, nome: 'Helena Duarte', email: 'coordenacao@horizonte.edu.br', senha: 'coord123', perfil: 'coordenador', alunoId: null },
  { id: 2, nome: 'Paulo Ramos', email: 'secretaria@horizonte.edu.br', senha: 'secret123', perfil: 'secretaria', alunoId: null }
];
alunos.forEach((a, i) => {
  usuarios.push({ id: 3 + i, nome: a.nome, email: a.email, senha: 'aluno123', perfil: 'aluno', alunoId: a.id });
});

const seed = {
  versao: 1,
  geradoEm: new Date().toISOString(),
  cursos,
  disciplinas,
  alunos: alunos.map(({ perfil, ...resto }) => resto),
  matriculas,
  notas,
  frequencias,
  usuarios
};

const raiz = path.join(__dirname, '..');
fs.mkdirSync(path.join(raiz, 'data'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'data', 'seed.json'), JSON.stringify(seed, null, 2));
fs.writeFileSync(
  path.join(raiz, 'js', 'seed-fallback.js'),
  `// GERADO por scripts/gerar-seed.js — não editar à mão.\nwindow.SEED_FALLBACK = ${JSON.stringify(seed)};\n`
);
console.log(`Seed gerado: ${cursos.length} cursos, ${disciplinas.length} disciplinas, ${alunos.length} alunos, ${matriculas.length} matrículas, ${notas.length} notas, ${frequencias.length} registros de frequência.`);
