import { SCENE_WIDTH, PANEL_WIDTH, GAME_HEIGHT, PANEL_STATE, TEX } from '../config.js';
import { dailyCoverUrl } from '../data/api.js';

/**
 * SidePanel
 * ---------
 * Painel lateral da direita. Tem 3 estados (PANEL_STATE):
 *  - GUESS:    livro aberto -> dicas + campo pra adivinhar o título
 *  - COVER:    livro fechado -> capa borrada
 *  - SYNOPSIS: lado direito clicado -> sinopse (contracapa) com palavras faltando
 *
 * Os dados vêm da API (livro do dia). O painel NÃO conhece o título:
 * a validação do palpite é feita no servidor via onGuess (assíncrono).
 */
export default class SidePanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} puzzle payload do /api/daily { hasCover, hints, synopsisMasked, ... }
   * @param {(guess:string)=>Promise<{correct:boolean,title:string|null}>} onGuess
   */
  constructor(scene, puzzle, onGuess) {
    this.scene = scene;
    this.puzzle = puzzle;
    this.onGuess = onGuess;
    this.state = PANEL_STATE.GUESS;
    this.solved = false;

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
    this.header = this.scene.add.text(this.x + 20, 18, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#f2e6c8',
      fontStyle: 'bold'
    });
    this.container.add(this.header);

    this.body = this.scene.add.text(this.x + 20, 60, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#d9c7a0',
      wordWrap: { width: PANEL_WIDTH - 40 },
      lineSpacing: 5
    });
    this.container.add(this.body);

    this.buildCoverImage();
    this.buildGuessInput();

    this.feedback = this.scene.add.text(this.x + 20, GAME_HEIGHT - 70, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8affc1',
      wordWrap: { width: PANEL_WIDTH - 40 }
    });
    this.container.add(this.feedback);
  }

  // Usa a capa real da API (se houver) ou o mock; aplica blur nos dois casos.
  buildCoverImage() {
    const cx = this.x + PANEL_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Começa com a capa local (frente do livro) e escala pro painel.
    this.coverImage = this.scene.add.image(cx, cy, TEX.BOOK_FRONT).setVisible(false);
    this.container.add(this.coverImage);
    this.fitCover();

    if (this.puzzle.hasCover) {
      this.loadRemoteCover();
    }

    // Borra a capa (o "efeito" de capa borrada). preFX existe no WebGL.
    // Guardamos o handle pra poder remover o blur quando o jogador acertar.
    if (this.coverImage.preFX) {
      this.coverBlur = this.coverImage.preFX.addBlur(0, 2, 2, 1, 0xffffff, 6);
    }
  }

  // Carrega a capa via proxy do backend (mesmo domínio da API — sem CORS).
  // Usa eventos específicos do arquivo pra evitar o problema de o 'complete'
  // do loader não disparar quando a cena já foi criada.
  loadRemoteCover() {
    // Key única por data evita colidir com uma textura já em cache (o Phaser
    // ignora load.image com key repetida, o que fazia a capa "não aparecer").
    const key = `cover-${this.puzzle.date || 'today'}`;

    // Se já está no cache (recarregou a cena), usa direto.
    if (this.scene.textures.exists(key)) {
      this.coverImage.setTexture(key);
      this.fitCover();
      return;
    }

    // Evento específico deste arquivo: dispara só quando ESTE load termina.
    this.scene.load.once(`filecomplete-image-${key}`, () => {
      this.coverImage.setTexture(key);
      this.fitCover();
    });
    this.scene.load.once('loaderror', (file) => {
      if (file && file.key === key) {
        console.warn('[cover] falha ao carregar a capa; usando o mock.');
      }
    });

    // Imagem vem de outra origem (backend:3333). Sem crossOrigin, o Phaser
    // marca a textura como "tainted" e ela não renderiza (some sem erro).
    this.scene.load.crossOrigin = 'anonymous';
    this.scene.load.image(key, dailyCoverUrl(this.puzzle.date));
    this.scene.load.start(); // necessário quando a cena já está ativa
  }

  // Escala a capa (mock ou remota) para caber na largura do painel,
  // limitando também pela altura disponível. Mantém a proporção.
  fitCover() {
    const maxW = PANEL_WIDTH - 60;
    const maxH = GAME_HEIGHT - 120;
    const scale = Math.min(maxW / this.coverImage.width, maxH / this.coverImage.height);
    this.coverImage.setScale(scale);
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
    this.guessDom.setOrigin(0, 0);

    const inputEl = this.guessDom.getChildByID('guess-input');
    const btnEl = this.guessDom.getChildByID('guess-btn');

    const submit = async () => {
      if (this.solved) return;
      const value = (inputEl.value || '').trim();
      if (!value) return;

      btnEl.disabled = true;
      this.showFeedback('Verificando...', true);
      try {
        const { correct, title, synopsis } = await this.onGuess(value);
        if (correct) {
          this.solved = true;
          this.showFeedback(`Acertou! É "${title}".`, true);
          inputEl.disabled = true;
          this.reveal(synopsis); // desborra a capa e libera a sinopse completa
        } else {
          this.showFeedback('Não é esse. Tente de novo!', false);
          btnEl.disabled = false;
        }
      } catch (err) {
        this.showFeedback('Erro ao validar. Tente de novo.', false);
        btnEl.disabled = false;
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

  // Chamado quando o jogador acerta: remove o blur da capa e guarda a
  // sinopse completa. Reaplica o estado atual pra atualizar a tela na hora.
  reveal(fullSynopsis) {
    this.revealed = true;
    if (fullSynopsis) this.puzzle.synopsis = fullSynopsis;

    // Remove o efeito de blur da capa (fica nítida).
    if (this.coverBlur && this.coverImage.preFX) {
      this.coverImage.preFX.remove(this.coverBlur);
      this.coverBlur = null;
    }

    // Atualiza a visão atual (capa/sinopse) refletindo o estado resolvido.
    this.setState(this.state);
  }

  setState(state) {
    this.state = state;

    this.coverImage.setVisible(false);
    this.guessDom.setVisible(false);
    this.body.setVisible(true);

    if (state === PANEL_STATE.GUESS) {
      this.header.setText('Descubra o Livro');
      this.body.setText(this.buildHintsText());
      this.guessDom.setVisible(true);
    } else if (state === PANEL_STATE.COVER) {
      this.header.setText(this.revealed ? 'Capa' : 'Capa (borrada)');
      this.body.setVisible(false);
      this.coverImage.setVisible(true);
    } else if (state === PANEL_STATE.SYNOPSIS) {
      if (this.revealed) {
        // Depois de acertar: sinopse completa, sem lacunas.
        this.header.setText('Sinopse');
        this.body.setText(this.puzzle.synopsis || this.puzzle.synopsisMasked || '(sem sinopse)');
      } else {
        this.header.setText('Sinopse (com lacunas)');
        this.body.setText(this.puzzle.synopsisMasked || '(sem sinopse disponível)');
      }
    }
  }

  buildHintsText() {
    const lines = ['Dicas:', ''];
    (this.puzzle.hints || []).forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    lines.push('');
    lines.push(`Palavras no título: ${this.puzzle.wordCount ?? '?'}`);
    return lines.join('\n');
  }
}
