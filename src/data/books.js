// Banco de livros mockado. Depois é só trocar/expandir.
// - title: nome correto (usado pra validar o palpite)
// - author: autor (dica)
// - year: ano (dica)
// - blurbFields: quantidade de campos/dicas a preencher
// - summaryGaps: sumário com lacunas ({{ }} marca a palavra escondida)

export const BOOKS = [
  {
    id: 'dom-casmurro',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    year: 1899,
    hints: [
      'Narrado em primeira pessoa por um homem ciumento.',
      'O grande mistério: teria Capitu traído Bentinho?',
      'Personagem marcante: uma mulher de "olhos de ressaca".'
    ],
    summaryGaps: [
      'Capítulo I — Do título',
      'Capítulo VII — {{Dona Glória}}',
      'Capítulo XII — O {{cavaleiro}}',
      'Capítulo XXXII — Olhos de {{ressaca}}',
      'Capítulo CXLVIII — E bem, o resto {{é sabido}}'
    ]
  },
  {
    id: 'o-cortico',
    title: 'O Cortiço',
    author: 'Aluísio Azevedo',
    year: 1890,
    hints: [
      'Romance naturalista sobre uma habitação coletiva.',
      'O ambiente molda o comportamento das personagens.',
      'João Romão sonha em enriquecer a qualquer custo.'
    ],
    summaryGaps: [
      'Parte I — O nascimento do {{cortiço}}',
      'Parte II — {{Rita Baiana}} chega',
      'Parte III — O {{incêndio}}',
      'Parte IV — A ascensão de {{João Romão}}'
    ]
  }
];

// Sorteia um livro pra rodada atual.
export function pickRandomBook() {
  return BOOKS[Math.floor(Math.random() * BOOKS.length)];
}
