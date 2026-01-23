const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const fetchMeme = require('../services/memeApi');

const memeSets = new Map(); // messageId -> Set of last 10 postLinks
const buttonTimeouts = new Map(); // messageId -> timeoutId
const subredditMap = new Map(); // messageId -> subreddit

function createMemeButtonRow(userId, subreddit, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`meme_refresh_${userId}_${subreddit || 'any'}`)
            .setLabel('Outro meme 🔁')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
}

module.exports = {
    createMemeButtonRow,
    setupMemeButtonHandler: client => {
        client.on('interactionCreate', async interaction => {
            if (!interaction.isButton()) return;
            const parts = interaction.customId.split('_');
            const [prefix, action, userId, subreddit] = parts;
            if (prefix !== 'meme' || action !== 'refresh') return;
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: 'Apenas quem usou o comando pode usar este botão.', ephemeral: true });
            }
            // Desabilita botão e mostra carregando
            const message = interaction.message;
            const memeSet = memeSets.get(message.id) || new Set();
            const sub = subreddit === 'any' ? undefined : subreddit;
            const rowLoading = createMemeButtonRow(userId, sub, true);
            await interaction.update({ content: 'Carregando...', embeds: [], components: [rowLoading] });
            // Busca novo meme
            const memeData = await fetchMeme({ subreddit: sub, memeSet });
            if (!memeData) {
                await interaction.editReply({ content: 'Não foi possível obter um meme. Tente novamente mais tarde.', embeds: [], components: [rowLoading] });
                return;
            }
            const { embed, content, isVideo } = memeData;
            const row = createMemeButtonRow(userId, sub, false);
            memeSets.set(message.id, memeSet);
            await interaction.editReply({ content, embeds: [embed], components: [row] });
            // Timeout para desabilitar botão após 2 minutos
            if (buttonTimeouts.has(message.id)) clearTimeout(buttonTimeouts.get(message.id));
            const timeoutId = setTimeout(async () => {
                const disabledRow = createMemeButtonRow(userId, sub, true);
                try {
                    await message.edit({ components: [disabledRow] });
                } catch {}
            }, 2 * 60 * 1000);
            buttonTimeouts.set(message.id, timeoutId);
            memeSets.set(message.id, memeSet);
        });
    }
};
