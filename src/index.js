require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

// Load commands recursively from all subdirectories
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            loadCommands(fullPath); // Recursivamente carrega subpastas
        } else if (file.name.endsWith('.js')) {
            const command = require(fullPath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Comando carregado: ${command.data.name}`);
            }
        }
    }
};

const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

// Load interaction handlers
const { setupMemeButtonHandler } = require('./components/memeButton');
const setupGameButtonHandler = require('./components/gameButtons');
setupMemeButtonHandler(client);
setupGameButtonHandler(client);

// Inicializar scheduler de memes
const { initScheduler } = require('./services/scheduler');
const { initPokeQuizScheduler } = require('./services/pokequizScheduler');

client.once('clientReady', () => {
    console.log(`Bot online como ${client.user.tag}`);
    initScheduler(client);
    initPokeQuizScheduler(client);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Erro ao executar comando.', ephemeral: true });
        }
    } else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction, client);
        } catch (error) {
            console.error(error);
        }
    } else if (interaction.isStringSelectMenu() || interaction.isButton()) {
        const [prefix] = interaction.customId.split(':');
        const target = prefix === 'nota' ? 'nota' : prefix === 'mokenpo' ? 'mokenpo' : prefix === 'qualpoke' ? 'qualpokemon' : prefix === 'pc' ? 'pc' : null;
        if (!target) return;
        const command = client.commands.get(target);
        if (!command || !command.handleComponent) return;
        try {
            await command.handleComponent(interaction, client);
        } catch (error) {
            console.error(error);
        }
    } else if (interaction.isModalSubmit()) {
        const [prefix] = interaction.customId.split(':');
        const target = prefix === 'nota' ? 'nota' : prefix === 'mokenpo' ? 'mokenpo' : prefix === 'qualpoke' ? 'qualpokemon' : prefix === 'pc' ? 'pc' : null;
        if (!target) return;
        const command = client.commands.get(target);
        if (!command || !command.handleModalSubmit) return;
        try {
            await command.handleModalSubmit(interaction, client);
        } catch (error) {
            console.error(error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
