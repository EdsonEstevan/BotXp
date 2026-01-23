const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeSchedule } = require('../../services/scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeragendamento')
        .setDescription('Remove um agendamento de meme pelo ID')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID do agendamento a remover')
                .setRequired(true)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
        const scheduleId = interaction.options.getInteger('id');
        
        const success = removeSchedule(scheduleId);
        
        if (success) {
            await interaction.reply({
                content: `✅ Agendamento #${scheduleId} removido com sucesso!`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ Agendamento #${scheduleId} não encontrado.`,
                ephemeral: true
            });
        }
    },
};
