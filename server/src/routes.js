// Rotas HTTP do jogo.
import {
  getOrCreateDailyPuzzle,
  toPublicPuzzle,
  checkGuess
} from './services/dailyPuzzle.js';
import { prisma } from './lib/prisma.js';
import { todayUTC } from './lib/date.js';

// Normaliza a URL da capa (Open Library já serve https; garantimos mesmo assim).
function normalizeCoverUrl(url) {
  if (!url) return url;
  return url.replace(/^http:/, 'https:');
}

export default async function routes(fastify) {
  // Healthcheck simples.
  fastify.get('/health', async () => ({ ok: true }));

  // Livro do dia (público, sem vazar a resposta).
  fastify.get('/api/daily', async (request, reply) => {
    try {
      const puzzle = await getOrCreateDailyPuzzle();
      return toPublicPuzzle(puzzle);
    } catch (err) {
      request.log.error(err);
      return reply.status(503).send({
        error: 'Não foi possível montar o livro do dia.',
        detail: err.message
      });
    }
  });

  // Proxy da capa do livro do dia.
  // O front carrega a imagem daqui (mesmo domínio da API), evitando os
  // problemas de CORS/hotlinking de carregar direto de books.google.com.
  fastify.get('/api/daily/cover', async (request, reply) => {
    try {
      const puzzle = await getOrCreateDailyPuzzle();
      const src = normalizeCoverUrl(puzzle.book.coverUrl);
      if (!src) return reply.status(404).send({ error: 'Sem capa disponível.' });

      const upstream = await fetch(src);
      if (!upstream.ok) {
        return reply.status(502).send({ error: 'Falha ao buscar a capa na origem.' });
      }
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const buf = Buffer.from(await upstream.arrayBuffer());

      reply
        .header('Content-Type', contentType)
        // Cache curto: a URL já muda por dia (cache-buster no front), mas
        // mantemos baixo pra não travar durante o desenvolvimento.
        .header('Cache-Control', 'public, max-age=300'); // 5 min
      return reply.send(buf);
    } catch (err) {
      request.log.error(err);
      return reply.status(502).send({ error: 'Erro ao obter a capa.' });
    }
  });

  // Validação de palpite. Body: { guess: string }
  fastify.post('/api/guess', async (request, reply) => {
    const guess = (request.body?.guess ?? '').toString();
    if (!guess.trim()) {
      return reply.status(400).send({ error: 'Envie um palpite em "guess".' });
    }
    const result = await checkGuess(guess, todayUTC());
    return result; // { correct, title|null }
  });

  // Histórico de livros já usados (controle). Não expõe puzzles futuros.
  fastify.get('/api/history', async () => {
    const puzzles = await prisma.dailyPuzzle.findMany({
      where: { puzzleDate: { lt: todayUTC() } },
      include: { book: true },
      orderBy: { puzzleDate: 'desc' }
    });
    return puzzles.map((p) => ({
      date: p.puzzleDate.toISOString().slice(0, 10),
      title: p.book.title,
      author: p.book.author,
      coverUrl: p.book.coverUrl
    }));
  });
}
