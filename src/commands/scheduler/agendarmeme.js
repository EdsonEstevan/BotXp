const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { addSchedule } = require('../../services/scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('agendarmeme')
        .setDescription('Agenda o envio automático de memes todos os dias em um horário específico')
        .addIntegerOption(option =>
            option.setName('hora')
                .setDescription('Hora do dia (0-23)')
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
                .setDescription('Canal onde o meme será enviado')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('Tipo de meme (BR ou internacional)')
                .setRequired(false)
                .addChoices(
                    { name: 'Memes BR (HUEstation)', value: 'HUEstation' },
                    { name: 'Memes Internacionais', value: 'memes' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
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
            console.error('[AgendarMeme] Erro:', err);
            await interaction.reply({
                content: '❌ Erro ao criar agendamento. Verifique as permissões do bot no canal.',
                ephemeral: true
            });
        }
    },
};
