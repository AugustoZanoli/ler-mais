import { SCENE_WIDTH, GAME_HEIGHT, PANEL_STATE, TEX, AUDIO } from '../config.js';
import { fetchDaily, submitGuess } from '../data/api.js';
import SidePanel from '../ui/SidePanel.js';

/**
 * GameScene
 * ---------
 * Monta o cenário (prateleiras + mesa + livro) e conecta a interação com
 * o painel lateral. O livro do dia vem da API (/api/daily).
 *
 * O livro na cena tem 3 visões (this.bookView):
 *  - 'open'  -> miolo aberto (páginas)      | painel: GUESS (dicas + palpite)
 *  - 'front' -> capa fechada de frente       | painel: COVER (capa borrada)
 *  - 'back'  -> contracapa (livro de costas) | painel: SYNOPSIS (sinopse c/ lacunas)
 *
 * Interação:
 *  - clique no LADO ESQUERDO -> vira a FRENTE fechada + painel COVER
 *  - clique no LADO DIREITO  -> vira a CONTRACAPA + painel SYNOPSIS
 *  - clique estando fechado (em qualquer lado que reabra) -> reabre no miolo (GUESS)
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.bookView = 'open';

    this.buildScenery();
    this.buildBook();
    this.setupMusic();

    // Mensagem de carregamento enquanto busca o livro do dia.
    this.loadingText = this.add
      .text(SCENE_WIDTH / 2, 30, 'Carregando o livro do dia...', {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#f2e6c8'
      })
      .setOrigin(0.5, 0);

    this.loadDaily();
  }

  async loadDaily() {
    try {
      const puzzle = await fetchDaily();
      this.loadingText.destroy();
      // Painel lateral com validação remota do palpite.
      this.panel = new SidePanel(this, puzzle, (guess) => submitGuess(guess));
    } catch (err) {
      this.loadingText.setText('Falha ao carregar o livro do dia.\n' + err.message);
      this.loadingText.setColor('#ff9b8a');
    }
  }

  // Música de fundo em loop + botão de silenciar/religar.
  setupMusic() {
    // A música é criada no MenuScene e guardada no registry, tocando de forma
    // contínua entre as cenas. Aqui só reaproveitamos e garantimos que segue
    // tocando (respeitando o mute que o jogador escolheu no menu).
    this.isMuted = this.registry.get('muted') || false;
    this.sound.mute = this.isMuted;

    this.bgm = this.registry.get('bgm');
    if (this.bgm && !this.isMuted && !this.bgm.isPlaying) {
      this.bgm.play();
    }

    this.buildMuteButton();
  }

  buildMuteButton() {
    // Botãozinho no canto superior direito da ÁREA DE CENA (antes do painel).
    const x = SCENE_WIDTH - 22;
    const y = 22;

    this.muteBtn = this.add
      .text(x, y, '🔊', {
        fontFamily: 'Courier New, monospace',
        fontSize: '22px',
        color: '#f2e6c8',
        backgroundColor: '#00000066',
        padding: { x: 6, y: 4 }
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    this.muteBtn.on('pointerdown', () => this.toggleMute());
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    // Persiste no registry pra manter consistência com o menu.
    this.registry.set('muted', this.isMuted);
    // Silencia tudo do jogo (afeta o bgm e qualquer som futuro).
    this.sound.mute = this.isMuted;
    this.muteBtn.setText(this.isMuted ? '🔇' : '🔊');

    // Se religou e a faixa não estava tocando (autoplay bloqueado antes), toca.
    if (!this.isMuted && this.bgm && !this.bgm.isPlaying) {
      this.bgm.play();
    }
  }

  buildScenery() {
    this.add.image(0, 0, TEX.SHELVES).setOrigin(0, 0);
    const desk = this.add.image(0, GAME_HEIGHT, TEX.DESK).setOrigin(0, 1);
    this.deskTopY = GAME_HEIGHT - desk.height;
  }

  buildBook() {
    this.bookX = SCENE_WIDTH / 2;

    // Os assets são grandes (1200x1200); escalamos para uma altura-alvo
    // que caiba confortavelmente na área de cena, apoiado sobre a mesa.
    this.bookTargetHeight = 260;

    this.bookY = this.deskTopY + 20;

    // Três visões do livro empilhadas na mesma posição; alternamos a visível.
    this.bookImgs = {
      open: this.add.image(this.bookX, this.bookY, TEX.BOOK_OPEN).setOrigin(0.5, 0.4),
      front: this.add.image(this.bookX, this.bookY, TEX.BOOK_FRONT).setOrigin(0.5, 0.5),
      back: this.add.image(this.bookX, this.bookY, TEX.BOOK_BACK).setOrigin(0.5, 0.5)
    };
    Object.values(this.bookImgs).forEach((img) => this.fitBook(img));

    this.showBookView('open');
    this.setupBookZones();
  }

  // Escala uma imagem de livro para a altura-alvo, mantendo a proporção.
  fitBook(img) {
    const scale = this.bookTargetHeight / img.height;
    img.setScale(scale);
  }

  // Deixa visível apenas a visão pedida.
  showBookView(view) {
    this.bookView = view;
    Object.entries(this.bookImgs).forEach(([name, img]) => {
      img.setVisible(name === view);
    });
  }

  setupBookZones() {
    // Usa o tamanho JÁ ESCALADO (displayWidth/Height), não o da textura.
    const bw = this.bookImgs.open.displayWidth;
    const bh = this.bookImgs.open.displayHeight;
    const left = this.bookX - bw / 2;
    const top = this.bookY - bh / 2;

    this.leftZone = this.add
      .zone(left, top, bw / 2, bh)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.leftZone.on('pointerdown', () => this.onClickLeft());

    this.rightZone = this.add
      .zone(left + bw / 2, top, bw / 2, bh)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.rightZone.on('pointerdown', () => this.onClickRight());
  }

  // Clique no lado ESQUERDO do livro.
  onClickLeft() {
    if (!this.panel) return; // ainda carregando
    if (this.bookView === 'open') {
      // Miolo aberto -> vira a frente fechada; painel mostra a capa borrada.
      this.showBookView('front');
      this.panel.setState(PANEL_STATE.COVER);
    } else {
      // Já fechado -> reabre o miolo.
      this.showBookView('open');
      this.panel.setState(PANEL_STATE.GUESS);
    }
  }

  // Clique no lado DIREITO do livro.
  onClickRight() {
    if (!this.panel) return; // ainda carregando
    if (this.bookView === 'open') {
      // Miolo aberto -> vira a contracapa; painel mostra a sinopse com lacunas.
      this.showBookView('back');
      this.panel.setState(PANEL_STATE.SYNOPSIS);
    } else {
      // Já fechado -> reabre o miolo.
      this.showBookView('open');
      this.panel.setState(PANEL_STATE.GUESS);
    }
  }
}
