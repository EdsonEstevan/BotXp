# Bot de Meme para Discord (discord.js v14)

Um bot de Discord que envia memes aleatórios usando a [Meme API](https://meme-api.com/).

## Requisitos
- Node.js 18+
- Um bot registrado no Discord (pegue o token e client_id no portal de desenvolvedores)

## Instalação

1. Clone o repositório e entre na pasta do projeto.
2. Instale as dependências:
   ```sh
   npm install discord.js dotenv node-fetch
   ```
3. Renomeie `.env` e preencha com seu `DISCORD_TOKEN` e `CLIENT_ID` (e `GUILD_ID` se quiser registrar comandos só em uma guild).

## Registro dos comandos

Para registrar os comandos (necessário na primeira vez ou ao alterar comandos):

```sh
node deploy-commands.js
```

## Rodando o bot

```sh
node src/index.js
```

## Uso

- Use `/meme` para receber um meme aleatório.
- Clique em "Outro meme 🔁" para trocar o meme (só quem usou o comando pode clicar, botão expira em 2 minutos).

## Estrutura
- `src/index.js`: inicialização do bot
- `src/commands/meme.js`: comando /meme
- `src/services/memeApi.js`: fetch e validação de memes
- `src/components/memeButton.js`: handler e criação do botão
- `.env`: variáveis de ambiente
- `deploy-commands.js`: registro dos comandos

---

Feito com ❤️ usando discord.js v14
