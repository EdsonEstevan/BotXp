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
- Outros: `/mokenpo` (mortal kombat k-pop), `/nota` (notas/recados), `/agendador` para configurar memes recorrentes.

## Dados e agendamentos
- Persistência em arquivos JSON na raiz (ex.: economy, gacha, galo, schedules, pokequiz_state). Não há banco de dados externo.
- Agendamentos diários de memes e PokeQuiz usam [node-schedule](https://github.com/node-schedule/node-schedule) ([src/services/scheduler.js](src/services/scheduler.js) e [src/services/pokequizScheduler.js](src/services/pokequizScheduler.js)).
- O quiz "Qual é esse Pokémon?" gera silhuetas com Jimp em [src/services/pokequiz.js](src/services/pokequiz.js) e paga moedas aos três primeiros acertos.

## Scripts npm
- `npm start`: inicia o bot.
- `npm run deploy`: registra/atualiza todos os slash commands.

Feito com discord.js v14. Divirta-se!
