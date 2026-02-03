# Bot XP — Bot multifuncional para Discord

Bot em português com economia, gacha, minigames, agendamento de memes, quiz de Pokémon e módulos de notas. Todos os comandos são slash commands carregados automaticamente a partir de [src/commands](src/commands).

## Requisitos
- Node.js 18 ou superior
- Aplicação de bot no Discord com as intents padrão habilitadas
- Token do bot (`DISCORD_TOKEN`) e `CLIENT_ID` da aplicação

## Configuração rápida
1) Clone o repositório e acesse a pasta.
2) Instale as dependências:
   ```sh
   npm install
   ```
3) Crie um arquivo `.env` com as variáveis:
   ```dotenv
   DISCORD_TOKEN=seu_token_aqui
   CLIENT_ID=seu_client_id
   # Opcional: limite o registro dos comandos a uma guild
   # GUILD_ID=123456789012345678
   ```

### Registrar slash commands
```sh
npm run deploy
```
- Com `GUILD_ID` definido, registra apenas na guild (mais rápido para testar).
- Sem `GUILD_ID`, registra globalmente (propaga em alguns minutos).

### Rodar o bot
```sh
npm start
```

## Principais comandos
- Memes: `/memes br`, `/memes eng`, `/agendarmeme`, `/listaagendamentos`, `/removeragendamento`.
- Economia: `/economia saldo|transferir|perfil|top10`, `/salario` (diário), `/efeitos` para ver buffs/debuffs.
- Gacha e batalhas: `/gacha` (itens), `/galo` (coleção e duelos de galos), `/clash` (base e defesas).
- Minigames: `/jogos coinflip|dadao|adivinhe|roleta|ppt|forca|roubo|termoo`.
- Pokémon: `/qualpokemon` (palpite manual) e desafios agendados pelo PokeQuiz (usa silhueta gerada em [src/services/pokequiz.js](src/services/pokequiz.js)).
- Outros: `/mokenpo` (mortal kombat k-pop), `/nota` (notas/recados), `/agendador` para configurar memes recorrentes, `/pc` (desktop simulado).

## Módulos em detalhes

### Economia e efeitos
- `/economia saldo|perfil|transferir|top10`: consulta e movimenta moedas entre usuários.
- `/salario`: pagamento diário (cooldown salvo em `cooldowns.json`).
- `/efeitos`: lista buffs/debuffs ativos (ataque/defesa/loot) em `user_effects.json` que impactam Clash e Galos.
- Persistência simples em `economy.json`; sem banco externo.

### Gacha de itens
- `/gacha pull` (50 moedas) e `/gacha pull10` (450 moedas): gire itens comuns/raros/épicos/lendários definidos em `gacha.json`.
- `/gacha inventario`: visualiza e resgata itens ainda não reclamados; botões reclamam até 5 itens por vez.
- Itens alimentam outros modos (ex.: buffs de galo) via `src/services/gacha.js`.

### Galos (coleção e duelos)
- `/galo`: cria/gerencia galos, compra/usa itens, desafia outros jogadores, ganha XP e níveis.
- Duelos por botão: cada jogador escolhe ataques; limite de tempo/turnos; pote de moedas para o vencedor.
- Galo pode morrer (linhas de "gore" temáticas); itens de cura/buff são consumidos.
- Estado salvo em `galo.json` (galos, itens, batalhas anteriores).

### Clash (base, tropas e ataques)
- `/clash tropas|defesas`: compra tropas ofensivas e defesas. Custos/valores em `troops.json` e `defenses.json`.
- `/clash status [usuario]`: saldo, ataque/defesa total, efeitos ativos, vila (nível/slots) e renda passiva.
- `/clash atacar <alvo>`: batalha até 3 estrelas; rouba moedas do alvo se vencer.
- `/clash construir`: prédios passivos (miner/foundry) limitados pelo nível da vila; `/clash coletar` retira ouro acumulado; `/clash upar-vila` aumenta slots.
- Base e renda passiva em `clash_base.json`; cooldowns de coleta em `cooldowns.json`.

### Memes e agendador
- `/memes br|eng`: memes do subreddit HUEstation ou r/memes via Meme API.
- `/agendarmeme`, `/listaagendamentos`, `/removeragendamento` ou `/agendador`: agenda envio diário de memes em canais com `node-schedule` (salvo em `schedules.json`).
- Botão "Outro meme" em [src/components/memeButton.js](src/components/memeButton.js); jobs em [src/services/scheduler.js](src/services/scheduler.js).

### Minigames de moedas
- `/jogos`: coinflip, dado, adivinhe (1-10), roleta de slots, pedra-papel-tesoura, forca, roubo e Termo diário (5 letras).
- Todos consomem/pagam moedas na economia; cada subcomando valida aposta/parametrização.

### Pokémon — dois formatos de quiz
- `/qualpokemon`: abre botão para palpite; gera silhueta com Jimp em [src/services/pokequiz.js](src/services/pokequiz.js). Premia top 3 (1000/500/250).
- PokeQuiz agendado: [src/services/pokequizScheduler.js](src/services/pokequizScheduler.js) dispara desafios diários em canais (`pokequiz_schedules.json`).
- Mokenpo diário: `/mokenpo` ou palpite direto; feedback privado (geração, tipos, peso, altura). Prêmios 1º/2º/3º: 1000/500/250; demais acertos 50. Estado em `mokenpo.json`.

### Bloco de notas hierárquico
- `/nota`: notas com pastas (`criar`, `pasta-criar`, `listar`, `pastas`, `ver`, `compartilhar`, `deletar`).
- UI com select menus e modal; autocomplete sugere caminhos.
- Dados por usuário em `notes_hierarchical.json`; API em [src/services/notesHierarchical.js](src/services/notesHierarchical.js).

### Outros utilitários
- `/efeitos`: lista buffs/debuffs ativos (usados por Clash/Galo).
- Cooldowns de várias ações em `cooldowns.json` (salário, coleta de passivos, quizzes).
- `/pc`: abre um desktop simulado com Explorer, mini Tetris, calculadora modal e pasta de arquivos fake. Tudo é enviado de forma ephemeral para o usuário que chamou.
## Dados e agendamentos
- Persistência em arquivos JSON na raiz (ex.: economy, gacha, galo, schedules, pokequiz_state). Não há banco de dados externo.
- Agendamentos diários de memes e PokeQuiz usam [node-schedule](https://github.com/node-schedule/node-schedule) ([src/services/scheduler.js](src/services/scheduler.js) e [src/services/pokequizScheduler.js](src/services/pokequizScheduler.js)).
- O quiz "Qual é esse Pokémon?" gera silhuetas com Jimp em [src/services/pokequiz.js](src/services/pokequiz.js) e paga moedas aos três primeiros acertos.

## Scripts npm
- `npm start`: inicia o bot.
- `npm run deploy`: registra/atualiza todos os slash commands.

Feito com discord.js v14. Divirta-se!
