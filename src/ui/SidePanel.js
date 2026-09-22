import { SCENE_WIDTH, PANEL_WIDTH, GAME_HEIGHT, PANEL_STATE, TEX } from '../config.js';
import { dailyCoverUrl } from '../data/api.js';

/**
 * SidePanel
 * ---------
 * Painel lateral da direita. Estados (PANEL_STATE):
 *  - GUESS:    palpites estilo Termo (área scrollável) + input fixo + botão Dicas
 *  - COVER:    capa borrada (revelada ao acertar)
 *  - SYNOPSIS: sinopse com lacunas (completa ao acertar)
 *
 * O painel NÃO conhece o título: a validação é feita no servidor (onGuess),
 * que devolve só as cores por letra (feedback estilo Termo).
 *
 * Layout fixo do estado GUESS (de cima pra baixo):
 *   header + botão Dicas  |  lista scrollável de tentativas  |  input  |  msg
 */
export default class SidePanel {
  // Cores do feedback estilo Termo.
  static COLORS = {
    green: 0x6aaa64, // letra certa, palavra e posição certas
    yellow: 0xc9b458, // letra certa, palavra certa, posição errada
    purple: 0x7a3fb0, // letra existe em outra palavra
    gray: 0x3a2c22 // letra não existe
  };

  // Geometria fixa do painel (coordenadas absolutas na tela base 960x540).
  // Base reservada (de baixo pra cima): input (~80px) + mensagem (~24px).
  static LAYOUT = {
    headerY: 18,
    listTop: 58, // topo da área de tentativas
    listBottom: GAME_HEIGHT - 150, // fim da lista (acima do input)
    inputY: GAME_HEIGHT - 140, // input fixo (deixa ~140px de folga até a base)
    msgY: GAME_HEIGHT - 26 // mensagem acertou/errou, ABAIXO do input
  };

  constructor(scene, puzzle, onGuess) {
    this.scene = scene;
    this.puzzle = puzzle;
    this.onGuess = onGuess;
    this.state = PANEL_STATE.GUESS;
    this.solved = false;
    this.hintsOpen = false;

    // Deslocamento vertical acumulado das tentativas + scroll atual.
    this.attemptsHeight = 0;
    this.scrollY = 0;

    this.x = SCENE_WIDTH;
    this.container = scene.add.container(0, 0);

    this.buildBackground();
    this.buildContent();
    this.setState(PANEL_STATE.GUESS);
  }

  buildBackground() {
    const g = this.scene.add.graphics();
    g.fillStyle(0x24170f, 1);
    g.fillRect(this.x, 0, PANEL_WIDTH, GAME_HEIGHT);
    g.fillStyle(0xc9a227, 1);
    g.fillRect(this.x, 0, 4, GAME_HEIGHT);
    this.container.add(g);
  }

  buildContent() {
    const L = SidePanel.LAYOUT;

    this.header = this.scene.add.text(this.x + 20, L.headerY, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#f2e6c8',
      fontStyle: 'bold'
    });
    this.container.add(this.header);

    // Corpo de texto usado pelos estados COVER/SYNOPSIS.
    this.body = this.scene.add.text(this.x + 20, L.listTop, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#d9c7a0',
      wordWrap: { width: PANEL_WIDTH - 40 },
      lineSpacing: 5
    });
    this.container.add(this.body);

    this.buildCoverImage();
    this.buildAttemptsList();
    this.buildHintsButton();
    this.buildGuessInput();

    // Mensagem de acertou/errou — fixa, ABAIXO do input.
    this.feedback = this.scene.add.text(this.x + 20, L.msgY, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#8affc1',
      wordWrap: { width: PANEL_WIDTH - 40 }
    });
    this.container.add(this.feedback);

    this.buildHintsOverlay();
  }

  // ---- Área scrollável de tentativas ----
  buildAttemptsList() {
    const L = SidePanel.LAYOUT;
    // Container que segura as linhas; movido no eixo Y para "rolar".
    this.attemptsBox = this.scene.add.container(0, 0);
    this.container.add(this.attemptsBox);

    // Máscara: recorta o que sai da área da lista (scroll de verdade).
    const maskG = this.scene.make.graphics();
    maskG.fillRect(this.x + 12, L.listTop, PANEL_WIDTH - 24, L.listBottom - L.listTop);
    this.attemptsBox.setMask(maskG.createGeometryMask());
    this.listMaskG = maskG;

    // Scroll com a roda do mouse quando o ponteiro está sobre o painel.
    this.scene.input.on('wheel', (pointer, over, dx, dy) => {
      if (this.state !== PANEL_STATE.GUESS) return;
      if (pointer.x < this.x) return; // só quando sobre o painel
      this.scrollBy(dy * 0.5);
    });
  }

  scrollBy(delta) {
    const L = SidePanel.LAYOUT;
    const viewH = L.listBottom - L.listTop;
    const maxScroll = Math.max(0, this.attemptsHeight - viewH);
    this.scrollY = Math.min(Math.max(this.scrollY + delta, 0), maxScroll);
    this.attemptsBox.y = -this.scrollY;
  }

  // Mantém o scroll no fim (última tentativa visível).
  scrollToBottom() {
    const L = SidePanel.LAYOUT;
    const viewH = L.listBottom - L.listTop;
    this.scrollY = Math.max(0, this.attemptsHeight - viewH);
    this.attemptsBox.y = -this.scrollY;
  }

  // ---- Botão de dicas ----
  buildHintsButton() {
    const L = SidePanel.LAYOUT;
    this.hintsBtn = this.scene.add
      .text(this.x + PANEL_WIDTH - 16, L.headerY + 2, '💡 Dicas', {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#24170f',
        backgroundColor: '#c9a227',
        padding: { x: 6, y: 3 }
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.hintsBtn.on('pointerdown', () => this.toggleHints());
    this.container.add(this.hintsBtn);
  }

  buildHintsOverlay() {
    // Painel de dicas que abre sobre a lista (começa escondido).
    this.hintsPanel = this.scene.add.container(0, 0).setVisible(false);

    const bg = this.scene.add
      .rectangle(this.x + 12, SidePanel.LAYOUT.listTop, PANEL_WIDTH - 24, 150, 0x2f2015)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xc9a227);
    const text = this.scene.add.text(this.x + 22, SidePanel.LAYOUT.listTop + 10, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#f2e6c8',
      wordWrap: { width: PANEL_WIDTH - 48 },
      lineSpacing: 6
    });
    this.hintsText = text;
    this.hintsPanel.add(bg);
    this.hintsPanel.add(text);
    this.container.add(this.hintsPanel);
  }

  toggleHints() {
    this.hintsOpen = !this.hintsOpen;
    if (this.hintsOpen) this.hintsText.setText(this.buildHintsText());
    this.hintsPanel.setVisible(this.hintsOpen && this.state === PANEL_STATE.GUESS);
  }

  buildHintsText() {
    const lines = [];
    (this.puzzle.hints || []).forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    lines.push('');
    lines.push(`Palavras no título: ${this.puzzle.wordCount ?? '?'}`);
    return lines.join('\n');
  }

  // ---- Capa ----
  buildCoverImage() {
    const cx = this.x + PANEL_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.coverImage = this.scene.add.image(cx, cy, TEX.BOOK_FRONT).setVisible(false);
    this.container.add(this.coverImage);
    this.fitCover();

    if (this.puzzle.hasCover) this.loadRemoteCover();

    if (this.coverImage.preFX) {
      this.coverBlur = this.coverImage.preFX.addBlur(0, 2, 2, 1, 0xffffff, 6);
    }
  }

  loadRemoteCover() {
    const key = `cover-${this.puzzle.date || 'today'}`;
    if (this.scene.textures.exists(key)) {
      this.coverImage.setTexture(key);
      this.fitCover();
      return;
    }
    this.scene.load.once(`filecomplete-image-${key}`, () => {
      this.coverImage.setTexture(key);
      this.fitCover();
    });
    this.scene.load.once('loaderror', (file) => {
      if (file && file.key === key) {
        console.warn('[cover] falha ao carregar a capa; usando o mock.');
      }
    });
    this.scene.load.crossOrigin = 'anonymous';
    this.scene.load.image(key, dailyCoverUrl(this.puzzle.date));
    this.scene.load.start();
  }

  fitCover() {
    const maxW = PANEL_WIDTH - 60;
    const maxH = GAME_HEIGHT - 120;
    const scale = Math.min(maxW / this.coverImage.width, maxH / this.coverImage.height);
    this.coverImage.setScale(scale);
  }

  // ---- Input desenhado no PRÓPRIO Phaser (não é DOM) ----
  // Motivo: o overlay DOM do Phaser não acompanha o Scale.FIT, então um <input>
  // HTML "escapa" da tela. Desenhando o campo no canvas ele escala junto com
  // tudo. Capturamos o texto pelo teclado do próprio Phaser.
  buildGuessInput() {
    const L = SidePanel.LAYOUT;
    const w = PANEL_WIDTH - 40;
    const fieldH = 34;
    const btnH = 30;
    const left = this.x + 20;

    this.typed = ''; // texto digitado
    this.inputGroup = this.scene.add.container(0, 0);
    this.container.add(this.inputGroup);

    // Caixa do campo de texto.
    this.inputBox = this.scene.add
      .rectangle(left, L.inputY, w, fieldH, 0xf2e6c8)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xc9a227)
      .setInteractive({ useHandCursor: true });

    // Texto digitado (ou placeholder).
    this.inputText = this.scene.add.text(left + 8, L.inputY + fieldH / 2, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#3b2a1f'
    }).setOrigin(0, 0.5);

    // Botão "Adivinhar".
    const btnY = L.inputY + fieldH + 6;
    this.submitBtn = this.scene.add
      .rectangle(left, btnY, w, btnH, 0xc9a227)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.submitLabel = this.scene.add
      .text(left + w / 2, btnY + btnH / 2, 'ADIVINHAR', {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#24170f',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.inputGroup.add([this.inputBox, this.inputText, this.submitBtn, this.submitLabel]);

    // Clicar na caixa dá foco ao input (ativa o cursor).
    this.inputBox.on('pointerdown', () => this.focusInput());
    this.submitBtn.on('pointerdown', () => this.submitGuess());

    // Captura de teclado nativa do Phaser.
    this.inputFocused = false;
    this.scene.input.keyboard.on('keydown', (ev) => this.onKey(ev));

    this.renderInputText();
    // Já começa "focado" pra facilitar (cursor piscando).
    this.focusInput();
  }

  focusInput() {
    this.inputFocused = true;
    this.renderInputText();
  }

  onKey(ev) {
    if (this.solved || this.state !== PANEL_STATE.GUESS || !this.inputFocused) return;

    if (ev.key === 'Enter') {
      this.submitGuess();
      return;
    }
    if (ev.key === 'Backspace') {
      this.typed = this.typed.slice(0, -1);
      this.renderInputText();
      return;
    }
    // Aceita letras, números, espaço e alguns sinais comuns de título.
    if (ev.key.length === 1 && /[\p{L}\p{N} '\-:.,&!?]/u.test(ev.key)) {
      if (this.typed.length < 60) this.typed += ev.key;
      this.renderInputText();
    }
  }

  renderInputText() {
    const w = PANEL_WIDTH - 40;
    const cursor = this.inputFocused ? '|' : '';
    if (this.typed) {
      this.inputText.setColor('#3b2a1f').setText(this.typed + cursor);
    } else {
      this.inputText.setColor('#9b8b73').setText(this.inputFocused ? cursor : 'Qual é o livro?');
    }
    // Trunca visualmente se passar da largura da caixa.
    if (this.inputText.width > w - 16) {
      // Mostra o final do texto (o que está sendo digitado).
      const overflow = this.inputText.width - (w - 16);
      this.inputText.setX(this.x + 20 + 8 - overflow);
    } else {
      this.inputText.setX(this.x + 20 + 8);
    }
  }

  async submitGuess() {
    if (this.solved) return;
    const value = this.typed.trim();
    if (!value) return;

    this.setSubmitEnabled(false);
    this.showFeedback('Verificando...', true);
    try {
      const { correct, title, synopsis, feedback } = await this.onGuess(value);
      this.renderAttempt(feedback);
      this.scrollToBottom();

      if (correct) {
        this.solved = true;
        this.showFeedback(`Acertou! É "${title}".`, true);
        this.inputGroup.setVisible(false);
        this.reveal(synopsis);
      } else {
        this.showFeedback('Não é esse. Tente de novo!', false);
        this.setSubmitEnabled(true);
        this.typed = '';
        this.renderInputText();
      }
    } catch (err) {
      this.showFeedback('Erro ao validar. Tente de novo.', false);
      this.setSubmitEnabled(true);
    }
  }

  setSubmitEnabled(enabled) {
    this.submitBtn.setFillStyle(enabled ? 0xc9a227 : 0x8a7320);
    if (enabled) this.submitBtn.setInteractive({ useHandCursor: true });
    else this.submitBtn.disableInteractive();
  }

  showFeedback(msg, ok) {
    this.feedback.setText(msg);
    this.feedback.setColor(ok ? '#8affc1' : '#ff9b8a');
  }

  // Desenha uma tentativa como linha(s) de quadradinhos coloridos, empilhando
  // no attemptsBox (que é recortado pela máscara e rolável).
  renderAttempt(feedback) {
    if (!Array.isArray(feedback)) return;

    const L = SidePanel.LAYOUT;
    const cell = 20;
    const gap = 2;
    const wordGap = 8;
    const rowH = cell + 6;

    // Coordenadas relativas ao topo da lista; o scroll move o container.
    let localY = this.attemptsHeight;
    let x = this.x + 20;

    const newLine = () => {
      localY += rowH;
      x = this.x + 20;
    };

    for (const word of feedback) {
      // Se a palavra não couber na linha atual, quebra antes de desenhá-la.
      const wordWidth = word.length * (cell + gap) + wordGap;
      if (x + wordWidth > this.x + PANEL_WIDTH - 12 && x > this.x + 20) newLine();

      for (const { char, status } of word) {
        const color = SidePanel.COLORS[status] ?? SidePanel.COLORS.gray;
        const yAbs = L.listTop + localY;
        const rect = this.scene.add.rectangle(x, yAbs, cell, cell, color).setOrigin(0, 0);
        const letter = this.scene.add
          .text(x + cell / 2, yAbs + cell / 2, char.toUpperCase(), {
            fontFamily: 'Courier New, monospace',
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold'
          })
          .setOrigin(0.5);
        this.attemptsBox.add(rect);
        this.attemptsBox.add(letter);
        x += cell + gap;
      }
      x += wordGap;
    }

    // Avança a altura total (uma linha a mais + respiro entre tentativas).
    this.attemptsHeight = localY + rowH + 6;
  }

  reveal(fullSynopsis) {
    this.revealed = true;
    if (fullSynopsis) this.puzzle.synopsis = fullSynopsis;

    if (this.coverBlur && this.coverImage.preFX) {
      this.coverImage.preFX.remove(this.coverBlur);
      this.coverBlur = null;
    }
    this.setState(this.state);
  }

  setState(state) {
    this.state = state;

    // Reset de visibilidade.
    this.coverImage.setVisible(false);
    this.inputGroup.setVisible(false);
    this.body.setVisible(false);
    this.attemptsBox.setVisible(false);
    this.hintsBtn.setVisible(false);
    this.hintsPanel.setVisible(false);

    if (state === PANEL_STATE.GUESS) {
      this.header.setText('Descubra o Livro');
      this.attemptsBox.setVisible(true);
      this.hintsBtn.setVisible(true);
      if (!this.solved) this.inputGroup.setVisible(true);
      this.hintsPanel.setVisible(this.hintsOpen);
    } else if (state === PANEL_STATE.COVER) {
      this.header.setText(this.revealed ? 'Capa' : 'Capa (borrada)');
      this.coverImage.setVisible(true);
    } else if (state === PANEL_STATE.SYNOPSIS) {
      this.body.setVisible(true);
      if (this.revealed) {
        this.header.setText('Sinopse');
        this.body.setText(this.puzzle.synopsis || this.puzzle.synopsisMasked || '(sem sinopse)');
      } else {
        this.header.setText('Sinopse (com lacunas)');
        this.body.setText(this.puzzle.synopsisMasked || '(sem sinopse disponível)');
      }
    }
  }
}
