const { SlashCommandBuilder } = require('discord.js');
const { transfer } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transferir')
        .setDescription('Transferir moedas para outro usuário')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuário que receberá as moedas')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Quantidade de moedas a transferir')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('quantidade');
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Você não pode transferir moedas para si mesmo!',
                ephemeral: true
            });
        }
        
        if (targetUser.bot) {
            return interaction.reply({
                content: '❌ Você não pode transferir moedas para um bot!',
                ephemeral: true
            });
        }
        
        const result = transfer(interaction.user.id, targetUser.id, amount);
        
        if (!result.success) {
            return interaction.reply({
                content: `❌ ${result.error}`,
                ephemeral: true
            });
        }
        
        await interaction.reply({
            content: `✅ Transferência concluída!\n\n💸 **${interaction.user.username}** transferiu **${amount}** moedas para **${targetUser.username}**\n\nSeus novos saldos:\n• ${interaction.user.username}: **${result.fromBalance}** moedas\n• ${targetUser.username}: **${result.toBalance}** moedas`,
            ephemeral: false
        });
    },
};
