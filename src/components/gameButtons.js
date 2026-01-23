const { Events, EmbedBuilder } = require('discord.js');
const { getBalance, addBalance, subtractBalance } = require('../services/economy');

module.exports = client => {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isButton()) return;
        
        // Coinflip
        if (interaction.customId.startsWith('coinflip_')) {
            const [game, choice, userId] = interaction.customId.split('_');
            
            if (interaction.user.id !== userId) {
                return interaction.reply({
                    content: '❌ Apenas o autor do jogo pode jogar!',
                    ephemeral: true
                });
            }
            
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = choice === result;
            
            // Conseguir a aposta do embed
            const embed = interaction.message.embeds[0];
            const betMatch = embed.description.match(/\*\*(\d+)\*\*/);
            const bet = betMatch ? parseInt(betMatch[1]) : 0;
            const winnings = bet * 2;
            
            if (won) {
                addBalance(userId, winnings);
            }
            
            const newBalance = getBalance(userId);
            const resultEmoji = won ? '🎉' : '😢';
            const resultText = won 
                ? `Você venceu! Saiu ${choice === 'heads' ? 'Cara' : 'Coroa'}!\n\n🎉 Você ganhou **${winnings}** moedas!`
                : `Que pena! Saiu ${result === 'heads' ? 'Cara' : 'Coroa'}. Você escolheu ${choice === 'heads' ? 'Cara' : 'Coroa'}.\n\n😢 Você perdeu **${bet}** moedas.`;
            
            const resultEmbed = new EmbedBuilder()
                .setColor(won ? '#00FF00' : '#FF0000')
                .setTitle(`${resultEmoji} Resultado do Cara ou Coroa`)
                .setDescription(resultText)
                .addFields(
                    { name: 'Seu novo saldo', value: `**${newBalance}** moedas`, inline: true }
                );
            
            await interaction.update({
                embeds: [resultEmbed],
                components: []
            });
        }
        
        // Adivinhe
        if (interaction.customId.startsWith('adivinhe_')) {
            const parts = interaction.customId.split('_');
            const [game, guessStr, userIdStr, secretStr, betStr] = parts;
            const guess = parseInt(guessStr);
            const userId = userIdStr;
            const secretNumber = parseInt(secretStr);
            const bet = parseInt(betStr);
            
            if (interaction.user.id !== userId) {
                return interaction.reply({
                    content: '❌ Apenas o autor do jogo pode jogar!',
                    ephemeral: true
                });
            }
            
            const won = guess === secretNumber;
            const winnings = won ? bet * 3 : 0;
            
            if (won) {
                addBalance(userId, winnings);
            }
            
            const newBalance = getBalance(userId);
            const resultEmoji = won ? '🎉' : '😢';
            const resultText = won 
                ? `Acertou! O número secreto era **${secretNumber}**!\n\n🎉 Você ganhou **${winnings}** moedas!`
                : `Errou! O número secreto era **${secretNumber}**, você escolheu **${guess}**.\n\n😢 Você perdeu **${bet}** moedas.`;
            
            const resultEmbed = new EmbedBuilder()
                .setColor(won ? '#00FF00' : '#FF0000')
                .setTitle(`${resultEmoji} Resultado`)
                .setDescription(resultText)
                .addFields(
                    { name: 'Seu novo saldo', value: `**${newBalance}** moedas`, inline: true }
                );
            
            await interaction.update({
                embeds: [resultEmbed],
                components: []
            });
        }
        
        // Pedra, Papel, Tesoura
        if (interaction.customId.startsWith('ppt_')) {
            const parts = interaction.customId.split('_');
            const [game, playerChoice, userId, betStr] = parts;
            const bet = parseInt(betStr);
            
            if (interaction.user.id !== userId) {
                return interaction.reply({
                    content: '❌ Apenas o autor do jogo pode jogar!',
                    ephemeral: true
                });
            }
            
            const botChoices = ['pedra', 'papel', 'tesoura'];
            const botChoice = botChoices[Math.floor(Math.random() * 3)];
            
            let result; // 'win', 'lose', 'draw'
            if (playerChoice === botChoice) {
                result = 'draw';
            } else if (
                (playerChoice === 'pedra' && botChoice === 'tesoura') ||
                (playerChoice === 'papel' && botChoice === 'pedra') ||
                (playerChoice === 'tesoura' && botChoice === 'papel')
            ) {
                result = 'win';
            } else {
                result = 'lose';
            }
            
            let winnings = 0;
            if (result === 'win') {
                winnings = bet * 2;
                addBalance(userId, winnings);
            } else if (result === 'draw') {
                addBalance(userId, bet); // Devolve a aposta
                winnings = bet;
            }
            
            const newBalance = getBalance(userId);
            const choices = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
            
            let resultText, resultColor;
            if (result === 'win') {
                resultText = `Você ganhou! 🎉\n\n${choices[playerChoice]} ${playerChoice.toUpperCase()} bate ${choices[botChoice]} ${botChoice.toUpperCase()}\n\n🎉 Você ganhou **${winnings}** moedas!`;
                resultColor = '#00FF00';
            } else if (result === 'draw') {
                resultText = `Empate! 🤝\n\n${choices[playerChoice]} ${playerChoice.toUpperCase()} = ${choices[botChoice]} ${botChoice.toUpperCase()}\n\n↩️ Você recebeu **${winnings}** moedas de volta!`;
                resultColor = '#FFFF00';
            } else {
                resultText = `Você perdeu! 😢\n\n${choices[playerChoice]} ${playerChoice.toUpperCase()} perde para ${choices[botChoice]} ${botChoice.toUpperCase()}\n\n😢 Você perdeu **${bet}** moedas.`;
                resultColor = '#FF0000';
            }
            
            const resultEmbed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle('🎮 Resultado')
                .setDescription(resultText)
                .addFields(
                    { name: 'Seu novo saldo', value: `**${newBalance}** moedas`, inline: true }
                );
            
            await interaction.update({
                embeds: [resultEmbed],
                components: []
            });
        }
        
        // Trivia
        if (interaction.customId.startsWith('trivia_')) {
            const parts = interaction.customId.split('_');
            const [game, choiceStr, userIdStr, correctStr, rewardStr] = parts;
            const choice = parseInt(choiceStr);
            const userId = userIdStr;
            const correct = parseInt(correctStr);
            const reward = parseInt(rewardStr);
            
            if (interaction.user.id !== userId) {
                return interaction.reply({
                    content: '❌ Apenas o autor do jogo pode jogar!',
                    ephemeral: true
                });
            }
            
            const won = choice === correct;
            
            if (won) {
                addBalance(userId, reward);
            }
            
            const newBalance = getBalance(userId);
            const resultEmoji = won ? '✅' : '❌';
            const resultText = won 
                ? `Acertou! 🎉\n\n🎉 Você ganhou **${reward}** moedas!`
                : `Errou! 😢\n\n😢 Você não ganhou moedas dessa vez.`;
            
            const resultEmbed = new EmbedBuilder()
                .setColor(won ? '#00FF00' : '#FF0000')
                .setTitle(`${resultEmoji} Resultado`)
                .setDescription(resultText)
                .addFields(
                    { name: 'Seu novo saldo', value: `**${newBalance}** moedas`, inline: true }
                );
            
            await interaction.update({
                embeds: [resultEmbed],
                components: []
            });
        }

        // Gacha claim
        if (interaction.customId.startsWith('gacha_claim_')) {
            const { claimItem, formatItemCard, getUserInventory, getInventorySummary } = require('../services/gacha');
            const itemId = interaction.customId.replace('gacha_claim_', '');
            const userId = interaction.user.id;

            const result = claimItem(userId, itemId);

            if (!result.success) {
                return interaction.reply({
                    content: `❌ ${result.error}`,
                    ephemeral: true
                });
            }

            const item = result.item;
            const rarityColors = {
                common: '#808080',
                rare: '#2196F3',
                epic: '#9C27B0',
                legendary: '#FFD700'
            };

            const embed = new EmbedBuilder()
                .setColor(rarityColors[item.rarity])
                .setTitle(`✨ Item Reclamado!`)
                .setDescription(formatItemCard(item))
                .setFooter({ text: 'Item adicionado à sua conta!' })
                .setTimestamp();

            if (item.type === 'coins') {
                embed.addFields({ name: '💰 Moedas Adicionadas', value: `+**${item.value}** moedas`, inline: true });
            } else if (item.type === 'unit') {
                embed.addFields({ name: '⚔️ Tropas Adicionadas', value: `+**${item.quantity}x** ${item.unit}`, inline: true });
            } else if (item.type === 'defense') {
                embed.addFields({ name: '🛡️ Defesas Adicionadas', value: `+**${item.quantity}x** ${item.defense}`, inline: true });
            }

            const inventory = getUserInventory(userId);
            const summary = getInventorySummary(userId);
            embed.addFields({
                name: '📦 Inventário',
                value: `⚪ ${summary.common} | 🔵 ${summary.rare} | 🟣 ${summary.epic} | 🟡 ${summary.legendary}`,
                inline: false
            });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // Atualizar mensagem original removendo o botão
            const message = interaction.message;
            const remaining = inventory.filter((_, idx) => idx < 5);
            
            if (remaining.length === 0) {
                await message.edit({ components: [] }).catch(() => {});
            }
        }
    });
};

