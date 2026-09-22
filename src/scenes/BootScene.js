import Phaser from 'phaser';
import { SCENE_WIDTH, GAME_HEIGHT, TEX } from '../config.js';

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
 *     this.load.image(TEX.BOOK_OPEN, 'assets/book_open.png');
 *     this.load.image(TEX.BOOK_CLOSED, 'assets/book_closed.png');
 *     this.load.image(TEX.BOOK_COVER, 'assets/book_cover.png');
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
    // Nada a carregar do disco por enquanto (assets mockados).
  }

  create() {
    this.generateMockTextures();
    this.scene.start('GameScene');
  }

  generateMockTextures() {
    this.makeShelves();
    this.makeDesk();
    this.makeOpenBook();
    this.makeClosedBook();
    this.makeBlurredCover();
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

  // Livro ABERTO visto de cima: duas páginas claras com linhas de texto.
  makeOpenBook() {
    const w = 300;
    const h = 200;
    this.textureFromGraphics(TEX.BOOK_OPEN, w, h, (g) => {
      // Capa por baixo
      g.fillStyle(0x7a2e2e, 1);
      g.fillRoundedRect(0, 0, w, h, 6);
      // Páginas
      g.fillStyle(0xf2e6c8, 1);
      g.fillRect(10, 10, w - 20, h - 20);
      // Vinco central
      g.fillStyle(0xc9b285, 1);
      g.fillRect(w / 2 - 2, 10, 4, h - 20);
      // Linhas de texto (mock) nas duas páginas
      g.fillStyle(0x9a875f, 1);
      const drawLines = (px) => {
        for (let i = 0; i < 8; i++) {
          g.fillRect(px, 28 + i * 18, w / 2 - 40, 4);
        }
      };
      drawLines(24);
      drawLines(w / 2 + 16);
    });
  }

  // Livro FECHADO: capa fechada sobre a mesa.
  makeClosedBook() {
    const w = 200;
    const h = 150;
    this.textureFromGraphics(TEX.BOOK_CLOSED, w, h, (g) => {
      g.fillStyle(0x5a1f1f, 1);
      g.fillRoundedRect(0, 0, w, h, 6);
      g.fillStyle(0x7a2e2e, 1);
      g.fillRoundedRect(6, 6, w - 12, h - 12, 4);
      // Páginas laterais (corte do livro)
      g.fillStyle(0xf2e6c8, 1);
      g.fillRect(w - 10, 12, 6, h - 24);
      // Detalhe dourado no centro
      g.fillStyle(0xc9a227, 1);
      g.fillRect(w / 2 - 24, h / 2 - 20, 48, 40);
    });
  }

  // Capa BORRADA (mostrada no painel quando o livro fecha).
  // Mock: capa com um "título" ilegível e blocos borrados.
  makeBlurredCover() {
    const w = 240;
    const h = 320;
    this.textureFromGraphics(TEX.BOOK_COVER, w, h, (g) => {
      g.fillStyle(0x4a2c6b, 1);
      g.fillRoundedRect(0, 0, w, h, 8);
      g.fillStyle(0x5e3a86, 1);
      g.fillRoundedRect(8, 8, w - 16, h - 16, 6);
      // Blocos "borrados" simulando título/autor ilegíveis
      g.fillStyle(0xd9c7f0, 0.6);
      g.fillRect(30, 40, w - 60, 22);
      g.fillRect(45, 70, w - 90, 16);
      g.fillStyle(0xd9c7f0, 0.4);
      g.fillRect(50, h - 70, w - 100, 14);
      // Ilustração central borrada
      g.fillStyle(0xffcf6b, 0.35);
      g.fillCircle(w / 2, h / 2, 46);
      g.fillStyle(0x8affc1, 0.25);
      g.fillCircle(w / 2 - 20, h / 2 + 15, 30);
    });
  }
}
