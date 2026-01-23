const { SlashCommandBuilder } = require('discord.js');
const { getBalance, addBalance, subtractBalance, transfer, getUserData, getTopUsers } = require('../services/economy');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economia')
        .setDescription('Comandos de economia e dinheiro')
        .addSubcommand(sub =>
            sub.setName('saldo')
                .setDescription('Veja seu saldo ou de outro usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para verificar (opcional)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('transferir')
                .setDescription('Transferir moedas para outro usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário que receberá as moedas')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantidade')
                        .setDescription('Quantidade de moedas')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('perfil')
                .setDescription('Veja seu perfil ou de outro usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário (opcional)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('top10')
                .setDescription('Veja o ranking dos 10 mais ricos')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        
        if (subcommand === 'saldo') {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;
            const balance = getBalance(targetUser.id);
            
            await interaction.reply({
                content: `💰 **${targetUser.username}** tem **${balance}** moedas!`,
                ephemeral: false
            });
        }
        
        if (subcommand === 'transferir') {
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
        }
        
        if (subcommand === 'perfil') {
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
        }
        
        if (subcommand === 'top10') {
            await interaction.deferReply();
            
            const topUsers = getTopUsers(10);
            
            if (topUsers.length === 0) {
                return interaction.editReply({
                    content: '📭 Nenhum usuário encontrado.',
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
        }
    },
};
