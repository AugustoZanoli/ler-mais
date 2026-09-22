# Áudio do jogo

Coloque aqui a música de fundo (faixa 8D chill).

Nomes esperados pelo jogo (basta ter um deles):

- `bgm.ogg` (recomendado — melhor compatibilidade/compressão)
- `bgm.mp3`

O jogo carrega `assets/audio/bgm.ogg` e cai pra `bgm.mp3` se o ogg faltar.
Se nenhum arquivo existir, o jogo roda normalmente, só sem música (o botão
de som fica sem efeito).

Dica: uma faixa em loop de ~1-3 min já resolve, porque toca em `loop: true`.
