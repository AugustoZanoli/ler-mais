// Cliente do Open Library.
// Docs: https://openlibrary.org/dev/docs/api/books
//
// A partir de um "work key" (ex: "OL82563W") montamos os dados do jogo:
//   { workKey, title, author, coverIds, coverUrl, synopsis, subjects }
//
// Por que Open Library (e não Google Books): as capas do Open Library são
// confiáveis (URL direta por cover id), enquanto o Google Books devolve muito
// "image not available". Guardamos a LISTA de cover ids pra poder tentar o
// próximo caso um falhe.

const BASE = 'https://openlibrary.org';

const HEADERS = {
  'User-Agent': 'LerMais/0.1 (jogo educativo; contato via repositorio)',
  Accept: 'application/json'
};

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Open Library respondeu ${res.status} para ${url}`);
  }
  return res.json();
}

// description pode ser string OU { type, value }.
function extractDescription(description) {
  if (!description) return null;
  if (typeof description === 'string') return description.trim();
  if (typeof description === 'object' && typeof description.value === 'string') {
    return description.value.trim();
  }
  return null;
}

// Lista de cover ids válidos (ignora -1 e não-números).
function validCoverIds(covers) {
  if (!Array.isArray(covers)) return [];
  return covers.filter((id) => Number.isInteger(id) && id > 0);
}

export function coverUrlFromId(coverId, size = 'L') {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

async function resolveAuthorName(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return null;
  const first = authors[0];
  const key = first?.author?.key || first?.key;
  if (!key) return null;
  try {
    const data = await getJson(`${BASE}${key}.json`);
    return data?.name ?? null;
  } catch {
    return null;
  }
}

// Categorias aceitas: fantasia e aventura (match tolerante nos subjects).
export const ALLOWED_SUBJECT_TERMS = ['fantasy', 'adventure'];

function subjectsMatchCategory(subjects) {
  if (!Array.isArray(subjects)) return false;
  const lower = subjects.map((s) => String(s).toLowerCase());
  return lower.some((s) => ALLOWED_SUBJECT_TERMS.some((term) => s.includes(term)));
}

/**
 * Busca work keys candidatos por categoria (fantasia/aventura) no /search.json.
 * A ordem retornada é a relevância do Open Library (não "famosos primeiro").
 * @param {object} [opts]
 * @param {number} [opts.limit=50] resultados por página
 * @param {number} [opts.page=1] paginação
 * @returns {Promise<Array<{workKey:string, title:string}>>}
 */
export async function searchFantasyAdventure({ limit = 50, page = 1 } = {}) {
  const q = encodeURIComponent('subject:fantasy OR subject:adventure');
  const fields = 'key,title';
  const url = `${BASE}/search.json?q=${q}&limit=${limit}&page=${page}&fields=${fields}`;
  const data = await getJson(url);

  return (data.docs || [])
    .filter((doc) => doc.key && doc.key.startsWith('/works/'))
    .map((doc) => ({
      workKey: doc.key.replace('/works/', ''),
      title: doc.title ?? ''
    }));
}

/**
 * Busca e monta os dados de uma obra pelo work key.
 * @param {string} workKey ex: "OL82563W"
 * @returns {Promise<{workKey:string,title:string,author:string|null,coverIds:number[],coverUrl:string|null,synopsis:string|null,subjects:string[]}>}
 */
export async function fetchWork(workKey) {
  const clean = workKey.trim();
  const work = await getJson(`${BASE}/works/${clean}.json`);

  const synopsis = extractDescription(work.description);
  const coverIds = validCoverIds(work.covers);
  const author = await resolveAuthorName(work.authors);
  const subjects = Array.isArray(work.subjects) ? work.subjects : [];

  return {
    workKey: clean,
    title: work.title ?? 'Título desconhecido',
    author,
    coverIds,
    // Capa principal (primeiro id válido); o fluxo pode validar/trocar depois.
    coverUrl: coverIds.length ? coverUrlFromId(coverIds[0]) : null,
    synopsis,
    subjects
  };
}

/**
 * Baixa uma capa e verifica se é uma imagem "de verdade" (não vazia).
 * O Open Library retorna uma imagem 1x1 minúscula quando não há capa, e nem
 * sempre manda content-length — por isso medimos o tamanho REAL dos bytes.
 * @param {number} coverId
 * @returns {Promise<boolean>}
 */
export async function coverLooksValid(coverId) {
  try {
    const res = await fetch(coverUrlFromId(coverId), { headers: HEADERS });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const buf = await res.arrayBuffer();
    // Capas reais têm alguns KB; o placeholder/1x1 do OL é minúsculo (<1KB).
    return buf.byteLength > 3000;
  } catch {
    return false;
  }
}

/**
 * Resolve a MELHOR capa de um livro testando os cover ids em ordem.
 * @param {number[]} coverIds
 * @returns {Promise<string|null>} URL da primeira capa válida, ou null
 */
export async function resolveBestCover(coverIds) {
  for (const id of (coverIds || []).slice(0, 5)) {
    // eslint-disable-next-line no-await-in-loop
    if (await coverLooksValid(id)) return coverUrlFromId(id);
  }
  return null;
}

// Um work só serve se: tem sinopse (vira as lacunas) E é fantasia/aventura.
export function isPlayable(book) {
  const hasSynopsis = Boolean(book.synopsis && book.synopsis.length >= 40);
  return hasSynopsis && subjectsMatchCategory(book.subjects);
}
