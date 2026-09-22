import Phaser from 'phaser';
import { SCENE_WIDTH, GAME_HEIGHT, PANEL_STATE, TEX } from '../config.js';
import { pickRandomBook } from '../data/books.js';
import SidePanel from '../ui/SidePanel.js';

/**
 * GameScene
 * ---------
 * Monta o cenário (prateleiras + mesa + livro) e conecta a interação com
 * o painel lateral.
 *
 * Interação com o livro:
 *  - clique no LADO ESQUERDO  -> fecha o livro; painel vira capa borrada (COVER)
 *  - clique no LADO DIREITO   -> abre o sumário com lacunas (SUMMARY)
 *  - clicar de novo no livro fechado/estado -> reabre o livro (GUESS)
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.book = pickRandomBook();
    this.bookOpen = true;

    this.buildScenery();
    this.buildBook();

    // Painel lateral com callback de validação do palpite.
    this.panel = new SidePanel(this, this.book, (guess) => this.checkGuess(guess));
  }

  buildScenery() {
    // Prateleiras cobrindo a área de cena.
    this.add.image(0, 0, TEX.SHELVES).setOrigin(0, 0);

    // Mesa na parte de baixo.
    const desk = this.add.image(0, GAME_HEIGHT, TEX.DESK).setOrigin(0, 1);
    this.deskTopY = GAME_HEIGHT - desk.height;
  }

  buildBook() {
    // Centro da área de cena, apoiado sobre a mesa.
    this.bookX = SCENE_WIDTH / 2;
    this.bookY = this.deskTopY + 40;

    this.bookOpenImg = this.add
      .image(this.bookX, this.bookY, TEX.BOOK_OPEN)
      .setOrigin(0.5, 0.5);

    this.bookClosedImg = this.add
      .image(this.bookX, this.bookY, TEX.BOOK_CLOSED)
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.setupBookZones();
  }

  // Cria duas zonas de clique cobrindo a metade esquerda e direita do livro.
  setupBookZones() {
    const bw = this.bookOpenImg.width;
    const bh = this.bookOpenImg.height;
    const left = this.bookX - bw / 2;
    const top = this.bookY - bh / 2;

    // Zona esquerda do livro.
    this.leftZone = this.add
      .zone(left, top, bw / 2, bh)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.leftZone.on('pointerdown', () => this.onClickLeft());

    // Zona direita do livro.
    this.rightZone = this.add
      .zone(left + bw / 2, top, bw / 2, bh)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.rightZone.on('pointerdown', () => this.onClickRight());

    // (debug opcional) descomente pra visualizar as zonas:
    // this.add.rectangle(left, top, bw / 2, bh, 0xff0000, 0.15).setOrigin(0, 0);
    // this.add.rectangle(left + bw / 2, top, bw / 2, bh, 0x00ff00, 0.15).setOrigin(0, 0);
  }

  // Clique no lado ESQUERDO do livro.
  onClickLeft() {
    if (this.bookOpen) {
      // Livro aberto -> fecha e mostra a capa borrada.
      this.closeBook();
      this.panel.setState(PANEL_STATE.COVER);
    } else {
      // Livro fechado -> reabre no estado de adivinhação.
      this.openBook();
      this.panel.setState(PANEL_STATE.GUESS);
    }
  }

  // Clique no lado DIREITO do livro.
  onClickRight() {
    if (this.bookOpen) {
      // Livro aberto -> mostra o sumário com lacunas.
      this.panel.setState(PANEL_STATE.SUMMARY);
    } else {
      // Livro fechado -> reabre no estado de adivinhação.
      this.openBook();
      this.panel.setState(PANEL_STATE.GUESS);
    }
  }

  openBook() {
    if (this.bookOpen) return;
    this.bookOpen = true;
    this.bookClosedImg.setVisible(false);
    this.bookOpenImg.setVisible(true);
  }

  closeBook() {
    if (!this.bookOpen) return;
    this.bookOpen = false;
    this.bookOpenImg.setVisible(false);
    this.bookClosedImg.setVisible(true);
  }

  // Validação do palpite: normaliza (minúsculas, sem acento) e compara.
  checkGuess(guess) {
    const normalize = (s) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return normalize(guess) === normalize(this.book.title);
  }
}
