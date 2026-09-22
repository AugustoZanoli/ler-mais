import { GAME_WIDTH, GAME_HEIGHT, TEX, AUDIO } from '../config.js';

/**
 * MenuScene
 * ---------
 * Tela de abertura, mostrada antes do jogo. Ocupa a tela inteira (960x540),
 * sem a divisão de painel lateral do gameplay.
 *
 * Contém: fundo, título, botão "Jogar" (vai para a GameScene) e o botão de
 * som. A música de fundo começa aqui, no primeiro clique do usuário
 * (navegadores bloqueiam áudio até um gesto), e segue tocando no jogo.
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.buildBackground();
    this.buildTitle();
    this.buildPlayButton();
    this.setupMusic();
  }

  buildBackground() {
    // Fundo do menu preenchendo a tela (asset é 960x540).
    this.add.image(0, 0, TEX.MENU_BG).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Leve escurecida por cima pra dar contraste ao texto (ajuste/remova se
    // o seu fundo já tiver bom contraste).
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a1410, 0.25).setOrigin(0, 0);
  }

  buildTitle() {
    const cx = GAME_WIDTH / 2;

    // Título do jogo.
    this.add
      .text(cx, 120, 'Ler+', {
        fontFamily: 'Courier New, monospace',
        fontSize: '72px',
        color: '#f2e6c8',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setShadow(3, 3, '#00000088', 4);

    // Subtítulo.
    this.add
      .text(cx, 185, 'Descubra o livro do dia', {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#d9c7a0'
      })
      .setOrigin(0.5);
  }

  buildPlayButton() {
    const cx = GAME_WIDTH / 2;
    const cy = 320;
    const w = 240;
    const h = 64;

    // Container do botão (retângulo + texto), interativo como um todo.
    const bg = this.add
      .rectangle(cx, cy, w, h, 0xc9a227)
      .setStrokeStyle(3, 0xf2e6c8);
    const label = this.add
      .text(cx, cy, 'JOGAR', {
        fontFamily: 'Courier New, monospace',
        fontSize: '28px',
        color: '#24170f',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Zona interativa cobrindo o botão.
    const zone = this.add
      .zone(cx, cy, w, h)
      .setInteractive({ useHandCursor: true });

    // Efeito de hover (leve zoom + brilho).
    zone.on('pointerover', () => {
      bg.setFillStyle(0xe0b83a);
      this.tweens.add({ targets: [bg, label], scale: 1.05, duration: 120 });
    });
    zone.on('pointerout', () => {
      bg.setFillStyle(0xc9a227);
      this.tweens.add({ targets: [bg, label], scale: 1.0, duration: 120 });
    });
    zone.on('pointerdown', () => this.startGame());

    // Dica de teclado.
    this.add
      .text(cx, 400, 'ou pressione ENTER', {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#d9c7a0'
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
  }

  startGame() {
    // Transição suave pro jogo.
    this.cameras.main.fadeOut(250, 26, 23, 16);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  // Música de fundo em loop + botão de silenciar. Começa aqui (menu),
  // no primeiro gesto do usuário, e continua tocando no jogo.
  setupMusic() {
    this.isMuted = this.registry.get('muted') || false;

    if (this.cache.audio.exists(AUDIO.BGM)) {
      // Reaproveita o som global se já existir (ex.: voltou ao menu),
      // senão cria uma vez e guarda no registry pra persistir entre cenas.
      this.bgm = this.registry.get('bgm');
      if (!this.bgm) {
        this.bgm = this.sound.add(AUDIO.BGM, { loop: true, volume: 1.0 });
        this.registry.set('bgm', this.bgm);
      }

      const startMusic = () => {
        if (this.isMuted || this.bgm.isPlaying) return;
        if (this.sound.context && this.sound.context.state === 'suspended') {
          this.sound.context.resume();
        }
        this.bgm.play();
      };

      if (this.sound.locked) {
        this.sound.once(Phaser.Sound.Events.UNLOCKED, startMusic);
        this.input.once('pointerdown', startMusic);
      } else {
        startMusic();
      }
    }

    this.buildMuteButton();
  }

  buildMuteButton() {
    this.muteBtn = this.add
      .text(GAME_WIDTH - 18, 18, this.isMuted ? '🔇' : '🔊', {
        fontFamily: 'Courier New, monospace',
        fontSize: '24px',
        backgroundColor: '#00000066',
        padding: { x: 6, y: 4 }
      })
      .setOrigin(1, 0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    this.muteBtn.on('pointerdown', (pointer, x, y, event) => {
      // Evita que o clique no botão dispare outros handlers.
      if (event) event.stopPropagation();
      this.toggleMute();
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.registry.set('muted', this.isMuted);
    this.sound.mute = this.isMuted;
    this.muteBtn.setText(this.isMuted ? '🔇' : '🔊');
    if (!this.isMuted && this.bgm && !this.bgm.isPlaying) this.bgm.play();
  }
}
