const { SlashCommandBuilder } = require('discord.js');
const { addBalance, getBalance } = require('../services/economy');
const {
    canUseSalario,
    recordSalarioUse,
    canUseWeekly,
    recordWeeklyUse,
    canUseMonthly,
    recordMonthlyUse,
    formatTimeLeft,
} = require('../services/cooldown');

const SALARIO_DIARIO = 300;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salario')
        .setDescription('Receba moedas diárias, semanais e mensais')
        .addSubcommand(sub =>
            sub.setName('diario')
                .setDescription('Receba seu salário diário'))
        .addSubcommand(sub =>
            sub.setName('semanal')
                .setDescription('Receba sua grana semanal'))
        .addSubcommand(sub =>
            sub.setName('mensal')
                .setDescription('Receba sua grana mensal')),
    
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'diario') {
            const { allowed, timeLeft } = canUseSalario(userId);
            if (!allowed) {
                const timeFormatted = formatTimeLeft(timeLeft);
                return interaction.reply({ content: `⏳ Você já pegou o diário! Faltam **${timeFormatted}**.`, ephemeral: true });
            }
            addBalance(userId, SALARIO_DIARIO);
            recordSalarioUse(userId);
            const newBalance = getBalance(userId);
            return interaction.reply({ content: `💰 Salário diário recebido: **${SALARIO_DIARIO}** moedas. Saldo: **${newBalance}**.`, ephemeral: false });
        }

        if (sub === 'semanal') {
            const { allowed, timeLeft } = canUseWeekly(userId);
            if (!allowed) {
                const timeFormatted = formatTimeLeft(timeLeft);
                return interaction.reply({ content: `⏳ Você já pegou o semanal! Faltam **${timeFormatted}**.`, ephemeral: true });
            }
            const amount = Math.floor(300 + Math.random() * (1500 - 300 + 1));
            addBalance(userId, amount);
            recordWeeklyUse(userId);
            const newBalance = getBalance(userId);
            return interaction.reply({ content: `🗓️ Grana semanal: **${amount}** moedas! Saldo: **${newBalance}**.`, ephemeral: false });
        }

        if (sub === 'mensal') {
            const { allowed, timeLeft } = canUseMonthly(userId);
            if (!allowed) {
                const timeFormatted = formatTimeLeft(timeLeft);
                return interaction.reply({ content: `⏳ Você já pegou o mensal! Faltam **${timeFormatted}**.`, ephemeral: true });
            }
            const amount = Math.floor(500 + Math.random() * (2000 - 500 + 1));
            addBalance(userId, amount);
            recordMonthlyUse(userId);
            const newBalance = getBalance(userId);
            return interaction.reply({ content: `📅 Grana mensal: **${amount}** moedas! Saldo: **${newBalance}**.`, ephemeral: false });
        }

        return interaction.reply({ content: 'Subcomando inválido.', ephemeral: true });
    },
};
