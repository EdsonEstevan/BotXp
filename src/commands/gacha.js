const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, subtractBalance } = require('../services/economy');
const { pullGacha, getUserInventory, getInventorySummary, claimItem, formatItemCard } = require('../services/gacha');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gacha')
        .setDescription('🎰 Sistema de Gacha - puxe itens incríveis!')
        .addSubcommand(sub =>
            sub.setName('pull')
                .setDescription('Fazer um pull no gacha (50 moedas)')
        )
        .addSubcommand(sub =>
            sub.setName('pull10')
                .setDescription('Fazer 10 pulls no gacha (450 moedas - desconto!)')
        )
        .addSubcommand(sub =>
            sub.setName('inventario')
                .setDescription('Ver seu inventário de itens do gacha')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'pull') {
            await handlePull(interaction, userId, 1, 50);
        } else if (subcommand === 'pull10') {
            await handlePull(interaction, userId, 10, 450);
        } else if (subcommand === 'inventario') {
            await handleInventory(interaction, userId);
        }
    }
};

async function handlePull(interaction, userId, quantity, cost) {
    await interaction.deferReply();

    const balance = getBalance(userId);
    if (balance < cost) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💸 Moedas Insuficientes!')
            .setDescription(`Você precisa de **${cost}** moedas para fazer ${quantity} pull(s).\nVocê tem: **${balance}** moedas`)
            .setFooter({ text: 'Ganhe moedas jogando ou com /salario' });

        return await interaction.editReply({ embeds: [embed] });
    }

    // Descontar moedas
    subtractBalance(userId, cost);

    // Fazer pulls
    const results = pullGacha(userId, quantity);

    // Criar embeds para cada item
    const embeds = [];
    
    // Embed inicial
    const initialEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🎰 ${quantity === 1 ? 'PULL GACHA!' : '10x PULL GACHA!'}`)
        .setDescription(`✨ Você abriu ${quantity} ${quantity === 1 ? 'convite' : 'convites'}!`)
        .setThumbnail('https://img.icons8.com/color/96/000000/slot-machine.png')
        .setFooter({ text: `Custo: ${cost} moedas | Saldo: ${balance - cost} moedas` });

    embeds.push(initialEmbed);

    // Organizar resultados por raridade
    const byRarity = {
        legendary: results.filter(r => r.rarity === 'legendary'),
        epic: results.filter(r => r.rarity === 'epic'),
        rare: results.filter(r => r.rarity === 'rare'),
        common: results.filter(r => r.rarity === 'common'),
    };

    // Criar embed com resultados
    const resultsEmbed = new EmbedBuilder()
        .setColor('#9C27B0');

    if (byRarity.legendary.length > 0) {
        resultsEmbed.setColor('#FFD700');
        resultsEmbed.setTitle('🎉 LENDÁRIO!!! 🎉');
        resultsEmbed.addFields(
            { name: '🟡 Lendários', value: byRarity.legendary.map(r => `${r.emoji} **${r.name}**`).join('\n') }
        );
    } else if (byRarity.epic.length > 0) {
        resultsEmbed.setColor('#9C27B0');
        resultsEmbed.setTitle('✨ ÉPICO! ✨');
        resultsEmbed.addFields(
            { name: '🟣 Épicos', value: byRarity.epic.map(r => `${r.emoji} **${r.name}**`).join('\n') }
        );
    } else if (byRarity.rare.length > 0) {
        resultsEmbed.setColor('#2196F3');
        resultsEmbed.setTitle('🌟 Raro! 🌟');
        resultsEmbed.addFields(
            { name: '🔵 Raros', value: byRarity.rare.map(r => `${r.emoji} **${r.name}**`).join('\n') }
        );
    } else {
        resultsEmbed.setColor('#808080');
        resultsEmbed.setTitle('Comum');
        resultsEmbed.addFields(
            { name: '⚪ Comuns', value: byRarity.common.map(r => `${r.emoji} **${r.name}**`).join('\n') }
        );
    }

    embeds.push(resultsEmbed);

    // Mostrar resumo
    const summary = getInventorySummary(userId);
    const summaryEmbed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('📊 Seu Inventário')
        .addFields(
            { name: '⚪ Comum', value: `${summary.common}`, inline: true },
            { name: '🔵 Raro', value: `${summary.rare}`, inline: true },
            { name: '🟣 Épico', value: `${summary.epic}`, inline: true },
            { name: '🟡 Lendário', value: `${summary.legendary}`, inline: true },
            { name: '📦 Total', value: `${summary.total}`, inline: true },
        );

    embeds.push(summaryEmbed);

    // Botões para reclamar
    const buttons = new ActionRowBuilder();
    results.slice(0, 4).forEach((item, index) => {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`gacha_claim_${item.id}`)
                .setLabel(`Reclamar ${index + 1}`)
                .setStyle(ButtonStyle.Primary)
        );
    });

    await interaction.editReply({ embeds, components: [buttons] });
}

async function handleInventory(interaction, userId) {
    await interaction.deferReply();

    const inventory = getUserInventory(userId);
    const summary = getInventorySummary(userId);

    if (inventory.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle('📦 Seu Inventário está Vazio!')
            .setDescription('Faça pulls com `/gacha pull` ou `/gacha pull10` para preencher seu inventário!')
            .setFooter({ text: 'Dica: Itens no inventário precisam ser reclamados para serem usados!' });

        return await interaction.editReply({ embeds: [embed] });
    }

    // Agrupar itens por raridade
    const byRarity = {
        legendary: inventory.filter(i => i.rarity === 'legendary'),
        epic: inventory.filter(i => i.rarity === 'epic'),
        rare: inventory.filter(i => i.rarity === 'rare'),
        common: inventory.filter(i => i.rarity === 'common'),
    };

    const embed = new EmbedBuilder()
        .setColor('#9C27B0')
        .setTitle(`📦 Inventário de ${interaction.user.username}`)
        .addFields(
            { name: '📊 Resumo', value: `⚪ ${summary.common} | 🔵 ${summary.rare} | 🟣 ${summary.epic} | 🟡 ${summary.legendary} (Total: ${summary.total})`, inline: false }
        );

    if (byRarity.legendary.length > 0) {
        embed.addFields({
            name: '🟡 Lendários',
            value: byRarity.legendary.map(i => `${i.emoji} **${i.name}** - ${i.description}`).join('\n')
        });
    }

    if (byRarity.epic.length > 0) {
        embed.addFields({
            name: '🟣 Épicos',
            value: byRarity.epic.slice(0, 5).map(i => `${i.emoji} **${i.name}** - ${i.description}`).join('\n') +
                (byRarity.epic.length > 5 ? `\n... e ${byRarity.epic.length - 5} mais` : '')
        });
    }

    if (byRarity.rare.length > 0) {
        embed.addFields({
            name: '🔵 Raros',
            value: byRarity.rare.slice(0, 5).map(i => `${i.emoji} **${i.name}** - ${i.description}`).join('\n') +
                (byRarity.rare.length > 5 ? `\n... e ${byRarity.rare.length - 5} mais` : '')
        });
    }

    if (byRarity.common.length > 0) {
        embed.addFields({
            name: '⚪ Comuns',
            value: byRarity.common.slice(0, 5).map(i => `${i.emoji} **${i.name}** - ${i.description}`).join('\n') +
                (byRarity.common.length > 5 ? `\n... e ${byRarity.common.length - 5} mais` : '')
        });
    }

    embed.setFooter({ text: 'Clique nos botões para reclamar itens do seu inventário' });

    // Botões para reclamar
    const buttons = new ActionRowBuilder();
    inventory.slice(0, 5).forEach((item, index) => {
        const rarityEmoji = { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[item.rarity];
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`gacha_claim_${item.id}`)
                .setLabel(`${rarityEmoji} ${item.name.substring(0, 10)}`)
                .setStyle(ButtonStyle.Success)
        );
    });

    await interaction.editReply({ embeds: [embed], components: [buttons] });
}
