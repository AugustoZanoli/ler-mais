import Phaser from 'phaser';
import { SCENE_WIDTH, GAME_HEIGHT, TEX, AUDIO } from '../config.js';

/**
 * BootScene
 * ---------
 * Gera texturas MOCKADAS em estilo pixelart usando Graphics.
 *
 * >>> Quando você tiver as artes reais, é aqui que troca. <<<
 * Substitua o generateMockTextures() por loads normais, ex:
 *
 *   preload() {
 *     this.load.image(TEX.SHELVES, 'assets/shelves.png');
 *     this.load.image(TEX.DESK, 'assets/desk.png');
 *     // Livro (já ligado aos assets reais em public/assets/book/):
 *     this.load.image(TEX.BOOK_OPEN, 'assets/book/opened_book.png');
 *     this.load.image(TEX.BOOK_FRONT, 'assets/book/closed_book_front.png');
 *     this.load.image(TEX.BOOK_BACK, 'assets/book/closed_book_back.png');
 *   }
 *
 * Os tamanhos gerados aqui casam com o posicionamento usado na GameScene,
 * então mantenha proporções parecidas ao substituir.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Assets reais do livro (colocados em public/assets/book/).
    // O Vite serve a pasta public/ na raiz da URL, então o caminho é /assets/...
    this.load.image(TEX.BOOK_OPEN, 'assets/book/opened_book.png'); // miolo aberto
    this.load.image(TEX.BOOK_FRONT, 'assets/book/closed_book_front.png'); // capa (frente)
    this.load.image(TEX.BOOK_BACK, 'assets/book/closed_book_back.png'); // contracapa (verso)
    this.load.image(TEX.MENU_BG, 'assets/menu/fundo_menu.png'); // fundo do menu

    // Música de fundo (faixa 8D chill). Coloque o arquivo em
    // public/assets/audio/ com um destes nomes. Fornecemos mp3 + ogg pra
    // compatibilidade entre navegadores; basta ter um dos dois.
    this.load.audio(AUDIO.BGM, ['assets/audio/bgm.ogg', 'assets/audio/bgm.mp3']);

    // Diagnóstico: loga qualquer asset que falhar no carregamento.
    this.load.on('loaderror', (file) => {
      console.warn(`[load] falhou: key="${file.key}" url="${file.src}"`);
    });
  }

  create() {
    this.generateMockTextures();
    this.scene.start('MenuScene');
  }

  // Só prateleiras e mesa continuam mockadas (ainda sem arte real).
  generateMockTextures() {
    this.makeShelves();
    this.makeDesk();
  }

  // Helper: cria uma textura a partir de um Graphics.
  textureFromGraphics(key, width, height, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  // Fundo: prateleiras com livrinhos coloridos (mock).
  makeShelves() {
    const w = SCENE_WIDTH;
    const h = GAME_HEIGHT;
    this.textureFromGraphics(TEX.SHELVES, w, h, (g) => {
      // Parede
      g.fillStyle(0x3b2a1f, 1);
      g.fillRect(0, 0, w, h);

      // Prateleiras horizontais
      const shelfColor = 0x5a4030;
      const rows = 3;
      const rowH = Math.floor(h / (rows + 1));
      for (let r = 1; r <= rows; r++) {
        const y = r * rowH;
        g.fillStyle(shelfColor, 1);
        g.fillRect(0, y, w, 10);

        // Livrinhos em pé na prateleira
        const palette = [0x8c3b3b, 0x3b7a8c, 0xb08a3b, 0x4c8c3b, 0x6b3b8c, 0xc46a2f];
        let x = 8;
        while (x < w - 16) {
          const bw = 8 + Math.floor(Math.random() * 10);
          const bh = 26 + Math.floor(Math.random() * 22);
          const color = palette[Math.floor(Math.random() * palette.length)];
          g.fillStyle(color, 1);
          g.fillRect(x, y - bh, bw, bh);
          // Detalhe da lombada
          g.fillStyle(0xffffff, 0.15);
          g.fillRect(x + 1, y - bh + 3, bw - 2, 2);
          x += bw + 3;
        }
      }
    });
  }

  // Mesa de madeira (faixa inferior).
  makeDesk() {
    const w = SCENE_WIDTH;
    const h = 160;
    this.textureFromGraphics(TEX.DESK, w, h, (g) => {
      g.fillStyle(0x6b4a2f, 1);
      g.fillRect(0, 0, w, h);
      // Tampo mais claro
      g.fillStyle(0x7d5836, 1);
      g.fillRect(0, 0, w, 18);
      // Ripas da madeira
      g.fillStyle(0x000000, 0.12);
      for (let i = 1; i < 6; i++) {
        g.fillRect(0, 18 + i * ((h - 18) / 6), w, 2);
      }
    });
  }
}
