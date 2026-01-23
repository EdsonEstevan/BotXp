const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetchMeme = require('../../services/memeApi');
const { createMemeButtonRow } = require('../../components/memeButton');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Envia um meme BR do subreddit HUEstation!'),
    async execute(interaction, client) {
        await interaction.deferReply();
        const memeSet = new Set();
        // Só memes BR
        const memeData = await fetchMeme({ subreddit: 'HUEstation', memeSet });
        if (!memeData) {
            return interaction.editReply('Não foi possível obter um meme BR. Tente novamente mais tarde.');
        }
        const { embed, content, isVideo } = memeData;
        const row = createMemeButtonRow(interaction.user.id, 'HUEstation');
        await interaction.editReply({
            content: content,
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
    },
};
