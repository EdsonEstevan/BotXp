const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getBalance, subtractBalance, addBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dadao')
        .setDescription('Role um dado e ganhe até 6x sua aposta!')
        .addIntegerOption(option =>
            option.setName('aposta')
                .setDescription('Quantidade de moedas a apostar')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('Número que você acha que vai sair (1-6)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)),
    
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('aposta');
        const userNumber = interaction.options.getInteger('numero');
        const balance = getBalance(userId);
        
        if (balance < bet) {
            return interaction.reply({
                content: `❌ Você não tem ${bet} moedas! Seu saldo: **${balance}** moedas`,
                ephemeral: true
            });
        }
        
        // Descontar a aposta
        subtractBalance(userId, bet);
        
        // Rolar o dado
        const diceRoll = Math.floor(Math.random() * 6) + 1;
        const won = diceRoll === userNumber;
        
        // Calcular ganho
        const winnings = won ? bet * 6 : 0;
        
        if (won) {
            addBalance(userId, winnings);
        }
        
        const newBalance = getBalance(userId);
        const resultEmoji = won ? '🎉' : '😢';
        const resultText = won 
            ? `Você acertou! 🎲 **${diceRoll}** saiu!\n\n🎉 Você ganhou **${winnings}** moedas!`
            : `Que pena! 🎲 Saiu **${diceRoll}**, você escolheu **${userNumber}**\n\n😢 Você perdeu **${bet}** moedas.`;
        
        const embed = new EmbedBuilder()
            .setColor(won ? '#00FF00' : '#FF0000')
            .setTitle(`${resultEmoji} Resultado do Dado`)
            .setDescription(resultText)
            .addFields(
                { name: 'Seu novo saldo', value: `**${newBalance}** moedas`, inline: true }
            );
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });
    },
};
