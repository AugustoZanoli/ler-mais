// Serviço do "livro do dia".
//
// Regra central: para uma data, existe exatamente UM livro (DailyPuzzle).
//  - Se já existe puzzle pra hoje -> retorna ele (idempotente).
//  - Se não existe -> pega o próximo SeedWork não usado (ordem = popularidade),
//    busca no Open Library, resolve a melhor capa, persiste como Book, cria o
//    DailyPuzzle e marca o seed como usado. Tudo numa transação.
//
// Isso garante: 1 livro/dia, sem repetição, e histórico salvo no banco.

import { prisma } from '../lib/prisma.js';
import { fetchWork, isPlayable, resolveBestCover } from '../lib/openLibrary.js';
import { maskSynopsis } from '../lib/mask.js';
import { scoreGuess } from '../lib/termo.js';
import { todayUTC } from '../lib/date.js';

/**
 * Garante e retorna o puzzle de uma data (padrão: hoje).
 * @param {Date} [date] meia-noite UTC
 * @returns {Promise<object>} puzzle com book incluso
 */
export async function getOrCreateDailyPuzzle(date = todayUTC()) {
  const existing = await prisma.dailyPuzzle.findUnique({
    where: { puzzleDate: date },
    include: { book: true }
  });
  if (existing) return existing;

  const book = await promoteNextSeedToBook();
  if (!book) {
    throw new Error(
      'Sem seeds disponíveis para gerar o livro do dia. Rode o seed ou adicione novos work IDs.'
    );
  }

  return prisma.dailyPuzzle.create({
    data: { puzzleDate: date, bookId: book.id },
    include: { book: true }
  });
}

/**
 * Pega o próximo SeedWork não usado (ordem = popularidade), busca no Open
 * Library e persiste como Book. Pula seeds "injogáveis" marcando-os.
 * @returns {Promise<object|null>} o Book criado (ou já existente), ou null se acabaram
 */
async function promoteNextSeedToBook() {
  const MAX_TRIES = 60;

  for (let i = 0; i < MAX_TRIES; i++) {
    const seed = await prisma.seedWork.findFirst({
      where: { used: false },
      orderBy: { createdAt: 'asc' } // mais famoso primeiro
    });
    if (!seed) return null;

    // Se esse work já virou Book antes, reaproveita.
    const already = await prisma.book.findUnique({ where: { workKey: seed.workKey } });
    if (already) {
      await prisma.seedWork.update({ where: { id: seed.id }, data: { used: true } });
      return already;
    }

    let data;
    try {
      data = await fetchWork(seed.workKey);
    } catch (err) {
      // Falha de rede: NÃO marca como usado (pode ser transitório); propaga.
      throw err;
    }

    if (!isPlayable(data)) {
      await prisma.seedWork.update({ where: { id: seed.id }, data: { used: true } });
      continue;
    }

    // Resolve a melhor capa válida (testa os cover ids em ordem).
    const coverUrl = await resolveBestCover(data.coverIds);

    // Persiste o livro e marca o seed como usado atomicamente.
    const [book] = await prisma.$transaction([
      prisma.book.create({
        data: {
          workKey: data.workKey,
          title: data.title,
          author: data.author,
          coverUrl,
          synopsis: data.synopsis
        }
      }),
      prisma.seedWork.update({ where: { id: seed.id }, data: { used: true } })
    ]);

    return book;
  }

  return null;
}

/**
 * Monta o payload público do puzzle para o front.
 * NÃO envia o título nem as respostas das lacunas (senão vaza a resposta).
 * @param {object} puzzle DailyPuzzle com book
 */
export function toPublicPuzzle(puzzle) {
  const { book } = puzzle;
  const { masked } = maskSynopsis(book.synopsis, book.title);

  return {
    date: puzzle.puzzleDate.toISOString().slice(0, 10),
    // O front carrega a capa via proxy do backend (/api/daily/cover),
    // não a URL crua do Google (evita CORS/hotlinking). hasCover indica
    // se vale a pena tentar buscá-la.
    hasCover: Boolean(book.coverUrl),
    // Dicas seguras (não revelam o título diretamente):
    hints: buildHints(book),
    // A sinopse com palavras faltando (substitui o antigo "sumário"):
    synopsisMasked: masked,
    // Metadados úteis pro front sem vazar a resposta:
    titleLength: book.title.length,
    wordCount: book.title.trim().split(/\s+/).length
  };
}

function buildHints(book) {
  const hints = [];
  if (book.author) hints.push(`Autor(a): ${book.author}`);
  const initials = book.title
    .split(/\s+/)
    .map((w) => (w[0] ? w[0].toUpperCase() : ''))
    .join('. ');
  hints.push(`Iniciais do título: ${initials}.`);
  return hints;
}

/**
 * Valida um palpite contra o título do puzzle e retorna o feedback estilo Termo.
 * O título real NÃO vai no payload (só as cores por letra), exceto quando o
 * jogador acerta — aí liberamos título e sinopse completa.
 * @param {string} guess
 * @param {Date} [date]
 * @returns {Promise<{correct:boolean, feedback:object[]|null, wordLengths:number[], title:string|null, synopsis:string|null}>}
 */
export async function checkGuess(guess, date = todayUTC()) {
  const puzzle = await prisma.dailyPuzzle.findUnique({
    where: { puzzleDate: date },
    include: { book: true }
  });
  if (!puzzle) {
    return { correct: false, feedback: null, wordLengths: [], title: null, synopsis: null };
  }

  const { correct, words } = scoreGuess(guess, puzzle.book.title);

  // Comprimento de cada palavra do título (dica de estrutura, não vaza letras).
  const wordLengths = puzzle.book.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.length);

  return {
    correct,
    feedback: words, // [[{char,status}, ...], ...] — cores por letra/palavra
    wordLengths,
    title: correct ? puzzle.book.title : null,
    synopsis: correct ? puzzle.book.synopsis : null
  };
}
