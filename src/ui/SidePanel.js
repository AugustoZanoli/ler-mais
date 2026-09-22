import Phaser from 'phaser';
import { SCENE_WIDTH, PANEL_WIDTH, GAME_HEIGHT, PANEL_STATE, TEX } from '../config.js';

/**
 * SidePanel
 * ---------
 * Painel lateral da direita. Tem 3 estados (PANEL_STATE):
 *  - GUESS:   livro aberto -> mostra dicas + campo pra adivinhar o título
 *  - COVER:   livro fechado -> mostra a capa borrada
 *  - SUMMARY: lado direito clicado -> mostra o sumário com lacunas
 *
 * Usa um Container do Phaser pra agrupar os elementos gráficos e um
 * elemento DOM (input HTML) pro palpite do usuário.
 */
export default class SidePanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} book livro atual (de books.js)
   * @param {(guess:string)=>boolean} onGuess callback de validação; retorna true se acertou
   */
  constructor(scene, book, onGuess) {
    this.scene = scene;
    this.book = book;
    this.onGuess = onGuess;
    this.state = PANEL_STATE.GUESS;

    this.x = SCENE_WIDTH; // canto esquerdo do painel
    this.container = scene.add.container(0, 0);

    this.buildBackground();
    this.buildContent();
    this.setState(PANEL_STATE.GUESS);
  }

  buildBackground() {
    const g = this.scene.add.graphics();
    // Fundo do painel (madeira escura / pergaminho)
    g.fillStyle(0x24170f, 1);
    g.fillRect(this.x, 0, PANEL_WIDTH, GAME_HEIGHT);
    // Borda esquerda separando da cena
    g.fillStyle(0xc9a227, 1);
    g.fillRect(this.x, 0, 4, GAME_HEIGHT);
    this.container.add(g);
  }

  buildContent() {
    // Título do painel
    this.header = this.scene.add.text(this.x + 20, 18, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#f2e6c8',
      fontStyle: 'bold'
    });
    this.container.add(this.header);

    // Corpo de texto (dicas / sumário)
    this.body = this.scene.add.text(this.x + 20, 60, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#d9c7a0',
      wordWrap: { width: PANEL_WIDTH - 40 },
      lineSpacing: 6
    });
    this.container.add(this.body);

    // Imagem da capa borrada (estado COVER). Começa escondida.
    this.coverImage = this.scene.add.image(
      this.x + PANEL_WIDTH / 2,
      GAME_HEIGHT / 2,
      TEX.BOOK_COVER
    );
    this.coverImage.setVisible(false);
    // Se no futuro a capa for uma arte nítida, dá pra borrar de verdade:
    if (this.coverImage.preFX) {
      this.coverImage.preFX.addBlur(0, 2, 2, 1, 0xffffff, 4);
    }
    this.container.add(this.coverImage);

    // --- Input HTML pro palpite (estado GUESS) ---
    this.buildGuessInput();

    // Texto de feedback (acertou/errou)
    this.feedback = this.scene.add.text(this.x + 20, GAME_HEIGHT - 70, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8affc1',
      wordWrap: { width: PANEL_WIDTH - 40 }
    });
    this.container.add(this.feedback);
  }

  buildGuessInput() {
    const inputWidth = PANEL_WIDTH - 40;
    const html = `
      <div style="width:${inputWidth}px; font-family:'Courier New',monospace;">
        <input id="guess-input" type="text" placeholder="Qual é o livro?"
          style="width:100%; box-sizing:border-box; padding:8px; font-size:14px;
                 background:#f2e6c8; border:2px solid #c9a227; color:#3b2a1f;
                 font-family:'Courier New',monospace; outline:none;" />
        <button id="guess-btn"
          style="width:100%; margin-top:8px; padding:8px; font-size:14px; cursor:pointer;
                 background:#c9a227; border:none; color:#24170f; font-weight:bold;
                 font-family:'Courier New',monospace;">Adivinhar</button>
      </div>`;

    this.guessDom = this.scene.add.dom(this.x + 20, GAME_HEIGHT - 150).createFromHTML(html);
    // O DOM element é posicionado pelo centro; ajusta origem pro canto.
    this.guessDom.setOrigin(0, 0);

    const inputEl = this.guessDom.getChildByID('guess-input');
    const btnEl = this.guessDom.getChildByID('guess-btn');

    const submit = () => {
      const value = (inputEl.value || '').trim();
      if (!value) return;
      const correct = this.onGuess(value);
      if (correct) {
        this.showFeedback('Acertou! É "' + this.book.title + '".', true);
        inputEl.disabled = true;
        btnEl.disabled = true;
      } else {
        this.showFeedback('Não é esse. Tente de novo!', false);
      }
    };

    btnEl.addEventListener('click', submit);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  showFeedback(msg, ok) {
    this.feedback.setText(msg);
    this.feedback.setColor(ok ? '#8affc1' : '#ff9b8a');
  }

  // Troca o estado visível do painel.
  setState(state) {
    this.state = state;

    // Reset de visibilidade
    this.coverImage.setVisible(false);
    this.guessDom.setVisible(false);
    this.body.setVisible(true);

    if (state === PANEL_STATE.GUESS) {
      this.header.setText('Descubra o Livro');
      this.body.setText(this.buildHintsText());
      this.guessDom.setVisible(true);
    } else if (state === PANEL_STATE.COVER) {
      this.header.setText('Capa (borrada)');
      this.body.setVisible(false);
      this.coverImage.setVisible(true);
    } else if (state === PANEL_STATE.SUMMARY) {
      this.header.setText('Sumário');
      this.body.setText(this.buildSummaryText());
    }
  }

  buildHintsText() {
    const lines = ['Dicas:', ''];
    this.book.hints.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    return lines.join('\n');
  }

  // Mostra o sumário com as palavras escondidas viram "_____".
  buildSummaryText() {
    const lines = ['Palavras faltando:', ''];
    this.book.summaryGaps.forEach((entry) => {
      const masked = entry.replace(/\{\{(.+?)\}\}/g, (_m, word) => {
        return '_'.repeat(Math.max(3, word.length));
      });
      lines.push(masked);
    });
    return lines.join('\n');
  }
}
