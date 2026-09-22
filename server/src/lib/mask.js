// Mascaramento da sinopse: esconde algumas palavras "de conteúdo" trocando-as
// por underscores, no mesmo espírito do sumário com lacunas do MVP.
//
// Regras:
//  - Não escondemos palavras curtas / muito comuns (stopwords).
//  - Escondemos no máximo N palavras, espalhadas pelo texto.
//  - Também mascaramos o próprio título se ele aparecer na sinopse
//    (senão entregaria a resposta de graça).

const STOPWORDS_PT = new Set([
  'a','o','os','as','um','uma','uns','umas','de','do','da','dos','das','em','no','na',
  'nos','nas','por','para','com','sem','sob','sobre','e','ou','mas','que','se','ao','aos',
  'à','às','seu','sua','seus','suas','ele','ela','eles','elas','isso','este','esta','esse',
  'essa','como','mais','menos','muito','já','não','sim'
]);

const STOPWORDS_EN = new Set([
  'the','a','an','of','to','in','on','and','or','but','is','are','was','were','be','been',
  'his','her','their','its','he','she','they','it','this','that','these','those','with',
  'for','from','by','as','at','into','out','up','down','who','which','what','not'
]);

function isStopword(word) {
  const w = word.toLowerCase();
  return STOPWORDS_PT.has(w) || STOPWORDS_EN.has(w);
}

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mascara a sinopse.
 * @param {string} synopsis texto original
 * @param {string} title título do livro (mascarado sempre que aparecer)
 * @param {number} maxGaps quantidade máxima de palavras escondidas
 * @returns {{ masked: string, answers: string[] }}
 *   masked = texto com "_____"; answers = palavras removidas (ordem de aparição)
 */
export function maskSynopsis(synopsis, title, maxGaps = 6) {
  if (!synopsis) return { masked: '', answers: [] };

  const titleWords = new Set(
    (title || '')
      .split(/\s+/)
      .map(normalize)
      .filter((w) => w.length >= 3)
  );

  // Tokeniza mantendo pontuação/espacos como separadores.
  const tokens = synopsis.split(/(\s+)/);

  // Índices de tokens elegíveis a virar lacuna (palavras "boas").
  const eligible = [];
  tokens.forEach((tok, i) => {
    const wordOnly = tok.replace(/[^\p{L}\p{N}]/gu, '');
    if (wordOnly.length < 4) return;
    if (isStopword(wordOnly)) return;
    eligible.push(i);
  });

  const answers = [];
  const chosen = new Set();

  // Sempre esconde ocorrências do título primeiro.
  tokens.forEach((tok, i) => {
    const wordOnly = tok.replace(/[^\p{L}\p{N}]/gu, '');
    if (wordOnly && titleWords.has(normalize(wordOnly))) {
      chosen.add(i);
    }
  });

  // Depois preenche até maxGaps escolhendo palavras espalhadas.
  const step = Math.max(1, Math.floor(eligible.length / maxGaps));
  for (let k = 0; k < eligible.length && chosen.size < maxGaps; k += step) {
    chosen.add(eligible[k]);
  }

  const maskedTokens = tokens.map((tok, i) => {
    if (!chosen.has(i)) return tok;
    // Preserva pontuação ao redor, mascara só as letras/números.
    const answer = tok.replace(/[^\p{L}\p{N}]/gu, '');
    if (answer) answers.push(answer);
    return tok.replace(/[\p{L}\p{N}]/gu, '_');
  });

  return { masked: maskedTokens.join(''), answers };
}
