// Cliente da API do backend (Fastify).
// A URL base vem de VITE_API_URL (defina em .env do front) ou cai no default local.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

// URL da capa do dia, servida pelo proxy do backend (mesmo domínio da API).
// Recebe a data do puzzle como "cache-buster": quando o livro muda, a URL
// muda, então o navegador busca a capa nova em vez de servir a do cache.
export function dailyCoverUrl(date) {
  const bust = date ? `?d=${encodeURIComponent(date)}` : '';
  return `${API_URL}/api/daily/cover${bust}`;
}

/**
 * Busca o livro do dia.
 * @returns {Promise<{date:string, hasCover:boolean, hints:string[], synopsisMasked:string, titleLength:number, wordCount:number}>}
 */
export async function fetchDaily() {
  const res = await fetch(`${API_URL}/api/daily`);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || detail.error || `Erro ${res.status} ao buscar o livro do dia.`);
  }
  return res.json();
}

/**
 * Valida um palpite no servidor.
 * @param {string} guess
 * @returns {Promise<{correct:boolean, title:string|null, synopsis:string|null}>}
 */
export async function submitGuess(guess) {
  const res = await fetch(`${API_URL}/api/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guess })
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Erro ${res.status} ao validar o palpite.`);
  }
  return res.json();
}
