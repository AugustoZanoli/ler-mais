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
  GUESS: 'guess', // livro aberto: campo pra adivinhar o nome + dicas
  COVER: 'cover', // livro fechado: capa borrada
  SYNOPSIS: 'synopsis' // sinopse (contracapa) com palavras faltando
};

// Chaves das texturas (assets).
export const TEX = {
  SHELVES: 'shelves',
  DESK: 'desk',
  BOOK_OPEN: 'book_open', // miolo aberto (páginas)
  BOOK_FRONT: 'book_front', // livro fechado visto de frente (capa)
  BOOK_BACK: 'book_back', // livro fechado visto de trás (contracapa)
  MENU_BG: 'menu_bg' // fundo da tela de menu
};

// Chaves de áudio.
export const AUDIO = {
  BGM: 'bgm' // música de fundo (faixa 8D chill)
};
