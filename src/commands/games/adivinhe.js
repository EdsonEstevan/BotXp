const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getBalance, subtractBalance, addBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adivinhe')
        .setDescription('Adivinhe um número entre 1-10 e ganhe moedas!')
        .addIntegerOption(option =>
            option.setName('aposta')
                .setDescription('Quantidade de moedas a apostar')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('aposta');
        const balance = getBalance(userId);
        
        if (balance < bet) {
            return interaction.reply({
                content: `❌ Você não tem ${bet} moedas! Seu saldo: **${balance}** moedas`,
                ephemeral: true
            });
        }
        
        // Descontar a aposta
        subtractBalance(userId, bet);
        
        const secretNumber = Math.floor(Math.random() * 10) + 1;
        
        const buttons = [];
        for (let i = 1; i <= 10; i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`adivinhe_${i}_${userId}_${secretNumber}_${bet}`)
                    .setLabel(i.toString())
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        // Dividir em 2 linhas de 5 botões
        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 5));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(5, 10));
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🔮 Adivinhe o Número!')
            .setDescription(`Escolha um número entre 1 e 10\n\nSua aposta: **${bet}** moedas\n\n✅ Acertando: ganhe **${bet * 3}** moedas!\n❌ Errando: perde **${bet}** moedas.`)
            .setFooter({ text: 'Clique em um número' });
        
        await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            ephemeral: false
        });
    },
};
