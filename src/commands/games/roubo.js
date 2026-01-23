const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, subtractBalance, addBalance } = require('../../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roubo')
        .setDescription('🔓 Tente roubar moedas de um amigo!')
        .addUserOption(option =>
            option.setName('alvo')
                .setDescription('Qual amigo você quer roubar?')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Quantas moedas tentar roubar? (máx: 1000)')
                .setMinValue(50)
                .setMaxValue(1000)
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const attacker = interaction.user;
        const target = interaction.options.getUser('alvo');
        let attemptedAmount = interaction.options.getInteger('quantidade') || 100;

        // Validações
        if (target.id === attacker.id) {
            return await interaction.editReply({
                content: '❌ Você não pode roubar de si mesmo!',
                ephemeral: true
            });
        }

        if (target.bot) {
            return await interaction.editReply({
                content: '❌ Bots não têm moedas! Roube de um jogador real!',
                ephemeral: true
            });
        }

        // Limitar quantidade
        attemptedAmount = Math.max(50, Math.min(1000, attemptedAmount));

        const attackerBalance = getBalance(attacker.id);
        const targetBalance = getBalance(target.id);

        // Risco: Se tiver pouco dinheiro, risco maior
        const riskFactor = Math.max(0.3, Math.min(1, targetBalance / 1000));

        // Chance de sucesso: 40% + alguns modificadores
        const baseChance = 40;
        const balanceModifier = (attackerBalance / 500) * 10; // Até +10% se tiver muito dinheiro
        const targetWealth = Math.max(-20, Math.min(20, (targetBalance - attackerBalance) / 500)); // -20% a +20% dependendo da riqueza
        
        const successChance = Math.max(5, Math.min(90, baseChance + balanceModifier + targetWealth));
        const roll = Math.random() * 100;

        const isSuccess = roll < successChance;

        if (isSuccess) {
            // Sucesso! Rouba a grana
            const actualSteal = Math.floor(attemptedAmount * (targetBalance > 0 ? Math.min(1, targetBalance / attemptedAmount) : 0));
            
            if (actualSteal > 0) {
                subtractBalance(target.id, actualSteal);
                addBalance(attacker.id, actualSteal);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 ROUBO BEM-SUCEDIDO! 🎉')
                    .setThumbnail(attacker.displayAvatarURL())
                    .addFields(
                        { name: '💰 Roubado', value: `**${actualSteal}** moedas`, inline: true },
                        { name: '🎯 Taxa de Sucesso', value: `${successChance.toFixed(1)}%`, inline: true },
                        { name: '🎲 Resultado', value: `${roll.toFixed(1)} < ${successChance.toFixed(1)}`, inline: true },
                        { name: '\u200B', value: '\u200B', inline: false },
                        { name: '😄 Você agora tem', value: `${getBalance(attacker.id)} moedas`, inline: true },
                        { name: '😭 ${target.username} perdeu', value: `${getBalance(target.id)} moedas`, inline: true }
                    )
                    .setFooter({ text: 'Cuidado! Seus amigos podem se vingar!' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎭 ROUBO FALHADO!')
                    .setDescription(`Você tentou roubar **${attemptedAmount}** moedas de **${target.username}**, mas...`)
                    .addFields(
                        { name: '😬 Problema', value: 'Seu alvo não tem moedas suficientes!', inline: false },
                        { name: '🎯 Taxa de Sucesso', value: `${successChance.toFixed(1)}%`, inline: true },
                        { name: '🎲 Resultado', value: `${roll.toFixed(1)} < ${successChance.toFixed(1)}`, inline: true }
                    )
                    .setFooter({ text: 'Não ganhou nada dessa vez!' });

                await interaction.editReply({ embeds: [embed] });
            }
        } else {
            // Falha! Paga multa
            const penalty = Math.floor(attemptedAmount * 0.5); // Perde 50% do tentado
            
            if (attackerBalance >= penalty) {
                subtractBalance(attacker.id, penalty);
                addBalance(target.id, penalty);

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('💥 VOCÊ FOI PEGO! 💥')
                    .setThumbnail(target.displayAvatarURL())
                    .addFields(
                        { name: '🚔 Multa Paga', value: `**${penalty}** moedas para ${target.username}`, inline: true },
                        { name: '🎯 Taxa de Sucesso', value: `${successChance.toFixed(1)}%`, inline: true },
                        { name: '🎲 Resultado', value: `${roll.toFixed(1)} > ${successChance.toFixed(1)}`, inline: true },
                        { name: '\u200B', value: '\u200B', inline: false },
                        { name: '😞 Seu novo saldo', value: `${getBalance(attacker.id)} moedas`, inline: true },
                        { name: '😄 ${target.username} ganhou', value: `${getBalance(target.id)} moedas`, inline: true }
                    )
                    .setFooter({ text: 'Crime não compensa! Tente novamente em breve...' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                // Não tem moedas pra pagar multa
                const embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('🚨 VOCÊ FOI PEGO! Mas...')
                    .setDescription(`Você não tem moedas para pagar a multa de ${penalty}!`)
                    .addFields(
                        { name: '💸 Seu saldo', value: `**${attackerBalance}** moedas`, inline: true },
                        { name: '🎯 Multa necessária', value: `**${penalty}** moedas`, inline: true }
                    )
                    .setFooter({ text: 'Fique em dívida? Tente ganhar moedas!' });

                await interaction.editReply({ embeds: [embed] });
            }
        }
    }
};
