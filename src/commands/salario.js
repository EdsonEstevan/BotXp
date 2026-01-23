const { SlashCommandBuilder } = require('discord.js');
const { addBalance, getBalance } = require('../services/economy');
const { canUseSalario, recordSalarioUse, formatTimeLeft } = require('../services/cooldown');

const SALARIO_AMOUNT = 100;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salario')
        .setDescription('Receba seu salário diário de 100 moedas! (Uma vez a cada 24h)'),
    
    async execute(interaction, client) {
        const userId = interaction.user.id;
        
        const { allowed, timeLeft } = canUseSalario(userId);
        
        if (!allowed) {
            const timeFormatted = formatTimeLeft(timeLeft);
            return interaction.reply({
                content: `⏳ Você já recebeu seu salário hoje!\n\nVocê poderá receber novamente em: **${timeFormatted}**`,
                ephemeral: true
            });
        }
        
        // Usuário pode receber o salário
        addBalance(userId, SALARIO_AMOUNT);
        recordSalarioUse(userId);
        
        const newBalance = getBalance(userId);
        
        await interaction.reply({
            content: `💰 **Salário Recebido!**\n\nVocê recebeu **${SALARIO_AMOUNT}** moedas!\n\nSeu novo saldo: **${newBalance}** moedas\n\n⏰ Próximo salário: em 24 horas`,
            ephemeral: false
        });
    },
};
