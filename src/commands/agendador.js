const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { addSchedule, removeSchedule, listSchedules } = require('../services/scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('agendador')
        .setDescription('Agendar envio automático de memes')
        .addSubcommand(sub =>
            sub.setName('agendar')
                .setDescription('Agendar novo envio de memes')
                .addIntegerOption(option =>
                    option.setName('hora')
                        .setDescription('Hora (0-23)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(23))
                .addIntegerOption(option =>
                    option.setName('minuto')
                        .setDescription('Minuto (0-59)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(59))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal para enviar')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de meme')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Memes BR', value: 'HUEstation' },
                            { name: 'Memes Internacionais', value: 'memes' }
                        )))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('Listar todos os agendamentos'))
        .addSubcommand(sub =>
            sub.setName('remover')
                .setDescription('Remover um agendamento')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID do agendamento')
                        .setRequired(true)
                        .setMinValue(1)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'agendar') {
            const hour = interaction.options.getInteger('hora');
            const minute = interaction.options.getInteger('minuto');
            const channel = interaction.options.getChannel('canal');
            const subreddit = interaction.options.getString('tipo') || 'HUEstation';
            
            try {
                const schedule = addSchedule(client, channel.id, hour, minute, subreddit);
                const timeStr = `${hour}:${String(minute).padStart(2, '0')}`;
                const typeStr = subreddit === 'HUEstation' ? 'BR' : 'internacional';
                
                await interaction.reply({
                    content: `✅ Agendamento criado!\n\n**ID:** ${schedule.id}\n**Horário:** ${timeStr} (todos os dias)\n**Canal:** ${channel}\n**Tipo:** ${typeStr}`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[AgendadorAgendar] Erro:', err);
                await interaction.reply({
                    content: '❌ Erro ao criar agendamento.',
                    ephemeral: true
                });
            }
        }
        
        if (subcommand === 'lista') {
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
        }
        
        if (subcommand === 'remover') {
            const scheduleId = interaction.options.getInteger('id');
            
            const success = removeSchedule(scheduleId);
            
            if (success) {
                await interaction.reply({
                    content: `✅ Agendamento #${scheduleId} removido!`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ Agendamento #${scheduleId} não encontrado.`,
                    ephemeral: true
                });
            }
        }
    },
};
