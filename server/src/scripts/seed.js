// Popula a tabela seed_works com candidatos de FANTASIA e AVENTURA,
// buscados no Open Library (/search.json). Rode com: npm run seed
//
// Sem filtro de "famosos primeiro": a ordem é a relevância que o Open Library
// retorna. O serviço de puzzle ainda valida que cada obra tem sinopse E
// categoria de fantasia/aventura (isPlayable) antes de virar o livro do dia.
//
// Ajuste PAGES para trazer mais candidatos (cada página = LIMIT resultados).

import { prisma } from '../lib/prisma.js';
import { searchFantasyAdventure } from '../lib/openLibrary.js';

const LIMIT = 50; // resultados por página
const PAGES = 4; // total de candidatos ~ LIMIT * PAGES

async function main() {
  const seen = new Set();
  let inserted = 0;

  for (let page = 1; page <= PAGES; page++) {
    const candidates = await searchFantasyAdventure({ limit: LIMIT, page });
    for (const c of candidates) {
      if (seen.has(c.workKey)) continue;
      seen.add(c.workKey);

      await prisma.seedWork.upsert({
        where: { workKey: c.workKey },
        update: {}, // preserva o campo used se já existir
        create: { workKey: c.workKey }
      });
      inserted += 1;
    }
    console.log(`Página ${page}: ${candidates.length} candidatos processados.`);
  }

  console.log(`Seed concluído. ${inserted} work IDs de fantasia/aventura garantidos.`);
}

main()
  .catch((err) => {
    console.error('Falha no seed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
