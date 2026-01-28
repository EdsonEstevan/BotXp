const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memes')
        .setDescription('Comandos de memes')
        .addSubcommand(sub =>
            sub.setName('br')
                .setDescription('Meme BR do subreddit HUEstation'))
        .addSubcommand(sub =>
            sub.setName('eng')
                .setDescription('Meme internacional do subreddit memes')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            const commandFile = require(`./memes/${subcommand === 'br' ? 'meme' : 'memeeng'}`);
            await commandFile.execute(interaction, client);
        } catch (err) {
            console.error(`Erro ao executar meme ${subcommand}:`, err);
            const payload = { content: '❌ Erro ao buscar meme.', flags: 64 };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    },
};
