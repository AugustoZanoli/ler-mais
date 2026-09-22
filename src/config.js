// Configurações globais de layout do jogo.
// Trabalhamos numa resolução base "lógica" e o Phaser escala pra tela toda,
// mantendo o visual pixelart nítido.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// O painel lateral ocupa a direita da tela.
export const PANEL_WIDTH = 320;

// A área de cena (mesa/livro/prateleiras) ocupa o resto à esquerda.
export const SCENE_WIDTH = GAME_WIDTH - PANEL_WIDTH;

// Estados possíveis do painel lateral da direita.
export const PANEL_STATE = {
  GUESS: 'guess', // livro aberto: campos pra adivinhar o nome
  COVER: 'cover', // livro fechado: capa borrada
  SUMMARY: 'summary' // sumário com palavras faltando
};

// Chaves das texturas (assets). Mockados por enquanto.
export const TEX = {
  SHELVES: 'shelves',
  DESK: 'desk',
  BOOK_OPEN: 'book_open',
  BOOK_CLOSED: 'book_closed',
  BOOK_COVER: 'book_cover'
};
