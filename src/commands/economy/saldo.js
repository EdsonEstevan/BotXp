const { SlashCommandBuilder } = require('discord.js');
const { getBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Veja seu saldo de moedas')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuário para verificar o saldo (opcional)')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const balance = getBalance(targetUser.id);
        
        const emoji = '💰';
        await interaction.reply({
            content: `${emoji} **${targetUser.username}** tem **${balance}** moedas!`,
            ephemeral: false
        });
    },
};
