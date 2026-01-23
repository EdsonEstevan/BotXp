const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { listSchedules } = require('../../services/scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listaagendamentos')
        .setDescription('Lista todos os agendamentos de memes ativos')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
        const schedules = listSchedules();
        
        if (schedules.length === 0) {
            return interaction.reply({
                content: '📭 Não há agendamentos ativos.',
                ephemeral: true
            });
        }
        
        let message = '📅 **Agendamentos Ativos:**\n\n';
        
        for (const schedule of schedules) {
            const timeStr = `${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`;
            const typeStr = schedule.subreddit === 'HUEstation' ? 'BR' : 'internacional';
            message += `**ID ${schedule.id}:** ${timeStr} → <#${schedule.channelId}> (${typeStr})\n`;
        }
        
        await interaction.reply({
            content: message,
            ephemeral: true
        });
    },
};
