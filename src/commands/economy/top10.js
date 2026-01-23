const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTopUsers } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top10')
        .setDescription('Veja o top 10 de usuários mais ricos'),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const topUsers = getTopUsers(10);
        
        if (topUsers.length === 0) {
            return interaction.editReply({
                content: '📭 Nenhum usuário encontrado no sistema de economia.',
                ephemeral: true
            });
        }
        
        let description = '';
        
        for (let i = 0; i < topUsers.length; i++) {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}️⃣`;
            const user = topUsers[i];
            
            try {
                const userData = await client.users.fetch(user.userId);
                description += `${medal} **${userData.username}** - **${user.balance}** moedas\n`;
            } catch {
                description += `${medal} User#${user.userId} - **${user.balance}** moedas\n`;
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Top 10 Mais Ricos')
            .setDescription(description)
            .setFooter({ text: 'Ranking de economia' });
        
        await interaction.editReply({
            embeds: [embed],
            ephemeral: false
        });
    },
};
