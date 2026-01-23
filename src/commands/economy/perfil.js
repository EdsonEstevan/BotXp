const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Veja seu perfil ou de outro usuário')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuário para verificar o perfil (opcional)')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const userData = getUserData(targetUser.id);
        
        const joinedDate = new Date(userData.joined).toLocaleDateString('pt-BR');
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`💰 Perfil de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Saldo', value: `**${userData.balance}** moedas`, inline: true },
                { name: 'Membro desde', value: joinedDate, inline: true }
            )
            .setFooter({ text: `ID: ${targetUser.id}` });
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });
    },
};
