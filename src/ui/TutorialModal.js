import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const STORAGE_KEY = 'lermais:tutorialSeen';

/**
 * TutorialModal
 * -------------
 * Modal em tela cheia explicando a mecânica do jogo. Abre sozinho na
 * primeira visita à GameScene (controlado via localStorage, ver
 * TutorialModal.hasBeenSeen) e pode ser reaberto a qualquer momento pelo
 * botão ⓘ da GameScene.
 */
export default class TutorialModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(2000).setVisible(false);

    this.buildBackdrop();
    this.buildPanel();
    this.buildCloseButton();
    this.buildContent();
  }

  buildBackdrop() {
    // Cobre a tela inteira e bloqueia cliques no que está atrás (livro/painel).
    const bg = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setInteractive();
    this.container.add(bg);
  }

  buildPanel() {
    const panel = this.scene.add
      .rectangle(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32, 0x2f2015)
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xc9a227);
    this.container.add(panel);
  }

  buildCloseButton() {
    this.closeBtn = this.scene.add
      .text(GAME_WIDTH - 32, 28, '✕', {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#f2e6c8'
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.close());
    this.container.add(this.closeBtn);
  }

  buildContent() {
    const title = this.scene.add
      .text(GAME_WIDTH / 2, 48, 'Como jogar', {
        fontFamily: 'Courier New, monospace',
        fontSize: '26px',
        color: '#f2e6c8',
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0);

    const body = this.scene.add.text(48, 100, this.buildText(), {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#d9c7a0',
      wordWrap: { width: GAME_WIDTH - 96 },
      lineSpacing: 8
    });

    this.container.add([title, body]);
  }

  buildText() {
    return [
      'Objetivo: descubra o livro do dia.',
      '',
      'O livro na mesa tem 3 faces:',
      '  - Clique no lado ESQUERDO do livro para ver a capa (borrada até você acertar).',
      '  - Clique no lado DIREITO do livro para ver a sinopse, com palavras faltando.',
      '  - Clique de novo para reabrir o miolo, onde fica o campo de palpite.',
      '',
      'No painel à direita, digite o título do livro e confirme com ENTER ou o',
      'botão ADIVINHAR. As caixinhas atrás do campo mostram quantas palavras e',
      'quantas letras o título tem.',
      '',
      'Cada tentativa mostra o feedback por letra, igual ao Termo:',
      '  verde   = letra certa, na palavra certa, na posição certa',
      '  amarelo = letra certa, na palavra certa, posição errada',
      '  roxo    = letra existe, mas em outra palavra do título',
      '  cinza   = letra não existe no título'
    ].join('\n');
  }

  open() {
    this.container.setVisible(true);
  }

  close() {
    this.container.setVisible(false);
    this.markSeen();
  }

  markSeen() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage indisponível (ex.: modo privado) — sem problema, o
      // tutorial só vai reaparecer sozinho na próxima visita.
    }
  }

  static hasBeenSeen() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
