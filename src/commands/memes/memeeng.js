const { SlashCommandBuilder } = require('discord.js');
const fetchMeme = require('../../services/memeApi');
const { createMemeButtonRow } = require('../../components/memeButton');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memeeng')
        .setDescription('Envia um meme internacional do subreddit memes!'),
    async execute(interaction, client) {
        await interaction.deferReply();
        const memeSet = new Set();
        // Só memes internacionais
        const memeData = await fetchMeme({ subreddit: 'memes', memeSet });
        if (!memeData) {
            return interaction.editReply('Não foi possível obter um meme internacional. Tente novamente mais tarde.');
        }
        const { embed, content, isVideo } = memeData;
        const row = createMemeButtonRow(interaction.user.id, 'memes');
        await interaction.editReply({
            content: content,
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
    },
};
