const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getBalance, subtractBalance, addBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Jogue cara ou coroa! Aposte suas moedas.')
        .addIntegerOption(option =>
            option.setName('aposta')
                .setDescription('Quantidade de moedas a apostar')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('aposta');
        const balance = getBalance(userId);
        
        if (balance < bet) {
            return interaction.reply({
                content: `❌ Você não tem ${bet} moedas! Seu saldo: **${balance}** moedas`,
                ephemeral: true
            });
        }
        
        // Descontar a aposta
        subtractBalance(userId, bet);
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`coinflip_heads_${userId}`)
                .setLabel('Cara 🪙')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`coinflip_tails_${userId}`)
                .setLabel('Coroa 🪙')
                .setStyle(ButtonStyle.Primary)
        );
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🪙 Cara ou Coroa?')
            .setDescription(`Sua aposta: **${bet}** moedas\n\nEscolha uma opção abaixo!`)
            .setFooter({ text: `Seu saldo será atualizado após o resultado` });
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: false
        });
    },
};
