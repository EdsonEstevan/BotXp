const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchMeme, BR_SUBREDDITS } = require('../../services/memeApi');
const { createMemeButtonRow, registerMemeSubreddits } = require('../../components/memeButton');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Envia um meme BR do subreddit HUEstation!'),
    async execute(interaction, client) {
        await interaction.deferReply();
        const memeSet = new Set();
        const subs = BR_SUBREDDITS;
        const memeData = await fetchMeme({ subreddits: subs, memeSet });
        if (!memeData) {
            return interaction.editReply('Não foi possível obter um meme BR. Tente novamente mais tarde.');
        }
        const { embed, content, isVideo } = memeData;
        const row = createMemeButtonRow(interaction.user.id, 'brmix');
        const message = await interaction.editReply({
            content: content,
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
        registerMemeSubreddits(message.id, subs);
    },
};
