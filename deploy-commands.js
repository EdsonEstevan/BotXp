require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const names = new Set();
const commandsPath = path.join(__dirname, 'src', 'commands');

function loadCommandsRecursive(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommandsRecursive(fullPath);
        } else if (entry.name.endsWith('.js')) {
            try {
                const command = require(fullPath);
                if (command?.data?.toJSON) {
                    const name = command.data.name;
                    if (names.has(name)) {
                        console.warn('[deploy] Ignorando duplicado', name, 'em', fullPath);
                        continue;
                    }
                    names.add(name);
                    commands.push(command.data.toJSON());
                } else {
                    console.warn('[deploy] Ignorando arquivo sem data/toJSON:', fullPath);
                }
            } catch (err) {
                console.error('[deploy] Erro ao carregar comando', fullPath, err?.message || err);
            }
        }
    }
}

loadCommandsRecursive(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registrando (atualizando) comandos slash...');
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log('Comandos registrados na guild.');
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log('Comandos registrados globalmente.');
        }
    } catch (error) {
        console.error(error);
    }
})();
