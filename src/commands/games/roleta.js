const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getBalance, subtractBalance, addBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleta')
        .setDescription('Jogue na roleta e tente a sorte!')
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
        
        const options = [
            { label: '🍎 Maçã', value: 'maca', multiplier: 2 },
            { label: '🍊 Laranja', value: 'laranja', multiplier: 2 },
            { label: '🍇 Uva', value: 'uva', multiplier: 2 },
            { label: '⭐ Estrela', value: 'estrela', multiplier: 5 },
            { label: '💎 Diamante', value: 'diamante', multiplier: 10 },
        ];
        
        const randomOption = options[Math.floor(Math.random() * options.length)];
        const winnings = bet * randomOption.multiplier;
        
        addBalance(userId, winnings);
        const newBalance = getBalance(userId);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎰 Resultado da Roleta!')
            .setDescription(`Saiu: ${randomOption.label}\n\n🎉 Você ganhou **${winnings}** moedas!\n(Multiplicador: **${randomOption.multiplier}x**)`)
            .addFields(
                { name: 'Seu novo saldo', value: `**${newBalance}** moedas`, inline: true }
            )
            .setFooter({ text: 'Boa sorte na próxima!' });
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });
    },
};
