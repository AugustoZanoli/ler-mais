// Helpers de data para o "livro do dia".
// Normalizamos o dia para meia-noite UTC, para que a chave do puzzle
// seja estável e o mesmo dia mapeie sempre para o mesmo livro.

/**
 * Retorna a data (só ano-mês-dia, meia-noite UTC) de hoje.
 * @param {Date} [now]
 * @returns {Date}
 */
export function todayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Formata como YYYY-MM-DD. */
export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}
