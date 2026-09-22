// Scoring estilo "Termo" para títulos de MÚLTIPLAS palavras.
//
// Regras de cor (por letra do palpite):
//  - 'green'  : letra certa, na palavra certa, na POSIÇÃO certa
//  - 'yellow' : letra certa, na palavra certa, POSIÇÃO errada
//  - 'purple' : letra existe no título, mas em OUTRA palavra
//  - 'gray'   : letra não existe no título
//
// O palpite é comparado palavra a palavra: a 1ª palavra do palpite contra a
// 1ª do título, a 2ª contra a 2ª, etc. (alinhamento por posição). Isso é o que
// dá sentido à distinção "palavra certa" vs "palavra errada".
//
// A contagem de duplicadas segue o Termo: cada letra do alvo só "conta" uma
// vez para verde/amarelo. Verde tem prioridade; sobras viram amarelo até
// esgotar as ocorrências daquela letra na palavra.

// Normaliza uma string: minúsculas, sem acento. Mantém letras/números.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Divide um título/palpite em palavras "de conteúdo" (só letras/números).
// Pontuação (apóstrofos, dois-pontos) é removida; espaços separam palavras.
function toWords(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Multiconjunto de letras de um conjunto de palavras (pra checar 'purple').
function letterCounts(words) {
  const m = new Map();
  for (const w of words) {
    for (const ch of w) m.set(ch, (m.get(ch) || 0) + 1);
  }
  return m;
}

/**
 * Avalia um palpite contra o título.
 * @param {string} guess
 * @param {string} title
 * @returns {{
 *   correct: boolean,
 *   words: Array<Array<{ char: string, status: 'green'|'yellow'|'purple'|'gray' }>>
 * }}
 *   words = uma lista por palavra do palpite; cada palavra é uma lista de
 *   letras com sua cor.
 */
export function scoreGuess(guess, title) {
  const guessWords = toWords(guess);
  const titleWords = toWords(title);
  const titleLetterCounts = letterCounts(titleWords);

  const result = guessWords.map((gWord, wi) => {
    const tWord = titleWords[wi] || ''; // palavra correspondente do título (pode faltar)

    // 1ª passada: marca verdes e conta letras restantes do alvo desta palavra.
    const remaining = new Map(); // letra -> ocorrências ainda disponíveis p/ amarelo
    for (const ch of tWord) remaining.set(ch, (remaining.get(ch) || 0) + 1);

    const statuses = new Array(gWord.length).fill(null);

    // Verde primeiro (consome a ocorrência do alvo).
    for (let i = 0; i < gWord.length; i++) {
      if (gWord[i] === tWord[i]) {
        statuses[i] = 'green';
        remaining.set(gWord[i], remaining.get(gWord[i]) - 1);
      }
    }

    // Amarelo/roxo/cinza para o resto.
    for (let i = 0; i < gWord.length; i++) {
      if (statuses[i]) continue; // já é verde
      const ch = gWord[i];
      if ((remaining.get(ch) || 0) > 0) {
        // Letra existe nesta palavra (posição errada) -> amarelo.
        statuses[i] = 'yellow';
        remaining.set(ch, remaining.get(ch) - 1);
      } else if ((titleLetterCounts.get(ch) || 0) > 0) {
        // Letra existe em alguma palavra do título (não nesta) -> roxo.
        statuses[i] = 'purple';
      } else {
        statuses[i] = 'gray';
      }
    }

    return gWord.split('').map((char, i) => ({ char, status: statuses[i] }));
  });

  // Acerto = mesmas palavras (ignorando pontuação/acento/caixa), na ordem.
  const correct =
    guessWords.length === titleWords.length &&
    guessWords.every((w, i) => w === titleWords[i]);

  return { correct, words: result };
}
