const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getBalance, subtractBalance, addBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ppt')
        .setDescription('Jogue Pedra, Papel ou Tesoura contra o bot!')
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
                .setCustomId(`ppt_pedra_${userId}_${bet}`)
                .setLabel('Pedra 🪨')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`ppt_papel_${userId}_${bet}`)
                .setLabel('Papel 📄')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`ppt_tesoura_${userId}_${bet}`)
                .setLabel('Tesoura ✂️')
                .setStyle(ButtonStyle.Primary)
        );
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎮 Pedra, Papel ou Tesoura?')
            .setDescription(`Sua aposta: **${bet}** moedas\n\nEscolha sua jogada!`)
            .setFooter({ text: 'O bot vai escolher aleatoriamente' });
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: false
        });
    },
};
