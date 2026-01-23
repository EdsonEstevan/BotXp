const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DEFAULT_TROOPS, DEFAULT_DEFENSES, PASSIVE_BUILDINGS, buyTroop, buyDefense, getUserTroopsInfo, getUserDefensesInfo, getAttackPower, getDefensePower, attack, buildPassive, collectPassive, upgradeTownHall, getBaseInfo, describePassive } = require('../services/clash');
const { getBalance } = require('../services/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clash')
        .setDescription('Sistema de ataque e defesa estilo Clash of Clans!')
        .addSubcommand(sub =>
            sub.setName('tropas')
                .setDescription('Comprar tropas para atacar')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de tropa')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Goblin (80 moedas)', value: 'goblin' },
                            { name: 'Arqueiro (180 moedas)', value: 'arqueiro' },
                            { name: 'Bárbaro (280 moedas)', value: 'barbaro' },
                            { name: 'Dragão (800 moedas)', value: 'dragao' }
                        ))
                .addIntegerOption(option =>
                    option.setName('quantidade')
                        .setDescription('Quantidade a comprar')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('defesas')
                .setDescription('Comprar defesas para proteger')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de defesa')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Muro (40 moedas)', value: 'muro' },
                            { name: 'Torre de Arqueiros (100 moedas)', value: 'torre' },
                            { name: 'Castelo (200 moedas)', value: 'castelo' },
                            { name: 'Fortaleza (500 moedas)', value: 'fortaleza' }
                        ))
                .addIntegerOption(option =>
                    option.setName('quantidade')
                        .setDescription('Quantidade a comprar')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Ver suas tropas e defesas')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para verificar (opcional)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('atacar')
                .setDescription('Atacar um usuário e roubar moedas!')
                .addUserOption(option =>
                    option.setName('alvo')
                        .setDescription('Usuário para atacar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('construir')
                .setDescription('Construir geradores de ouro passivo')
                .addStringOption(option => {
                    option.setName('tipo')
                        .setDescription('Tipo de construção')
                        .setRequired(true);
                    Object.entries(PASSIVE_BUILDINGS).forEach(([key, cfg]) => {
                        option.addChoices({ name: `${cfg.name} (${cfg.cost} moedas)`, value: key });
                    });
                    return option;
                }))
        .addSubcommand(sub =>
            sub.setName('coletar')
                .setDescription('Coletar ouro das construções'))
        .addSubcommand(sub =>
            sub.setName('upar-vila')
                .setDescription('Aumentar o nível da vila para mais slots de construção')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'tropas') {
            const tipo = interaction.options.getString('tipo');
            const quantidade = interaction.options.getInteger('quantidade') || 1;
            
            if (!tipo) {
                // Listar tropas disponíveis
                let message = '**⚔️ Tropas Disponíveis:**\n\n';
                Object.keys(DEFAULT_TROOPS).forEach(key => {
                    const troop = DEFAULT_TROOPS[key];
                    message += `**${troop.name}** - Custo: ${troop.cost} moedas | Poder: ${troop.steal}\n`;
                });
                message += `\nUse \`/clash tropas tipo:<tipo> quantidade:<qtd>\` para comprar!`;
                
                return interaction.reply({
                    content: message,
                    ephemeral: true
                });
            }
            
            const result = buyTroop(interaction.user.id, tipo, quantidade);
            
            if (!result.success) {
                return interaction.reply({
                    content: `❌ ${result.error}`,
                    ephemeral: true
                });
            }
            
            await interaction.reply({
                content: `✅ ${result.message}`,
                ephemeral: false
            });
        }
        
        if (subcommand === 'defesas') {
            const tipo = interaction.options.getString('tipo');
            const quantidade = interaction.options.getInteger('quantidade') || 1;
            
            if (!tipo) {
                // Listar defesas disponíveis
                let message = '**🛡️ Defesas Disponíveis:**\n\n';
                Object.keys(DEFAULT_DEFENSES).forEach(key => {
                    const defense = DEFAULT_DEFENSES[key];
                    message += `**${defense.name}** - Custo: ${defense.cost} moedas | Poder: ${defense.defense}\n`;
                });
                message += `\nUse \`/clash defesas tipo:<tipo> quantidade:<qtd>\` para comprar!`;
                
                return interaction.reply({
                    content: message,
                    ephemeral: true
                });
            }
            
            const result = buyDefense(interaction.user.id, tipo, quantidade);
            
            if (!result.success) {
                return interaction.reply({
                    content: `❌ ${result.error}`,
                    ephemeral: true
                });
            }
            
            await interaction.reply({
                content: `✅ ${result.message}`,
                ephemeral: false
            });
        }
        
        if (subcommand === 'status') {
            const { getActiveEffectsDescription } = require('../services/effects');
            const targetUser = interaction.options.getUser('usuario') || interaction.user;
            const troopsInfo = getUserTroopsInfo(targetUser.id);
            const defensesInfo = getUserDefensesInfo(targetUser.id);
            const balance = getBalance(targetUser.id);
            const effects = getActiveEffectsDescription(targetUser.id);
            const base = getBaseInfo(targetUser.id);
            const passive = describePassive(targetUser.id);
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B00')
                .setTitle(`⚔️ Base de Clash de ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '💰 Saldo', value: `${balance} moedas`, inline: true },
                    { name: '⚔️ Ataque Total', value: `${troopsInfo.attack}`, inline: true },
                    { name: '🛡️ Defesa Total', value: `${defensesInfo.defense}`, inline: true },
                    { name: '❤️ Vida das Tropas', value: `${troopsInfo.health}`, inline: true },
                    { name: '💪 Resistência', value: `${defensesInfo.durability}`, inline: true },
                    { name: '🏠 Vila', value: `Nível ${base.townHall} | Slots: ${base.slots} | Construções: ${base.buildings.length}/${base.slots}`, inline: false },
                    { name: '⛏️ Renda Passiva', value: passive.summary || 'Nenhuma', inline: false },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: '🎖️ Suas Tropas', value: troopsInfo.info, inline: false },
                    { name: '🏰 Suas Defesas', value: defensesInfo.info, inline: false },
                    { name: '🔮 Efeitos Ativos', value: effects, inline: false }
                )
                .setFooter({ text: 'Fortaleça sua base e conquiste seus inimigos! Use /efeitos para mais detalhes' });
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: false
            });
        }
        
        if (subcommand === 'atacar') {
            const target = interaction.options.getUser('alvo');
            
            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ Você não pode atacar a si mesmo!',
                    ephemeral: true
                });
            }
            
            if (target.bot) {
                return interaction.reply({
                    content: '❌ Você não pode atacar um bot!',
                    ephemeral: true
                });
            }
            
            await interaction.deferReply();
            
            const result = attack(interaction.user.id, target.id);
            
            if (!result.success) {
                return interaction.editReply({
                    content: `❌ ${result.error}`
                });
            }
            
            if (result.won) {
                let battleLogText = result.battleLog.slice(0, 5).join('\n');
                if (result.battleLog.length > 5) battleLogText += '\n...';
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎖️ VITÓRIA ÉPICA!')
                    .setDescription(`**${interaction.user.username}** conquistou a base de **${target.username}**!`)
                    .addFields(
                        { name: '⭐ Estrelas', value: `${'⭐'.repeat(result.stars)} (${result.stars}/3)`, inline: true },
                        { name: '💰 Saqueado', value: `**${result.stolen}** moedas`, inline: true },
                        { name: '⚔️ Rodadas', value: `${result.rounds}`, inline: true },
                        { name: '📜 Resumo da Batalha', value: battleLogText, inline: false }
                    )
                    .setFooter({ text: `⏱️ Próximo ataque em 30 minutos | Use /clash status para ver detalhes` })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                let battleLogText = result.battleLog.slice(0, 5).join('\n');
                if (result.battleLog.length > 5) battleLogText += '\n...';
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('💀 DERROTA AMARGA!')
                    .setDescription(`As defesas de **${target.username}** repelir am o ataque de **${interaction.user.username}**!`)
                    .addFields(
                        { name: '⭐ Estrelas', value: '☆☆☆ (0/3)', inline: true },
                        { name: '💰 Saqueado', value: '0 moedas', inline: true },
                        { name: '⚔️ Rodadas', value: `${result.rounds}`, inline: true },
                        { name: '📜 Resumo da Batalha', value: battleLogText, inline: false },
                        { name: '💡 Dica', value: 'Compre mais tropas ou melhore sua estratégia!', inline: false }
                    )
                    .setFooter({ text: `⏱️ Próximo ataque em 30 minutos` })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
        }

        if (subcommand === 'construir') {
            const tipo = interaction.options.getString('tipo');
            const result = buildPassive(interaction.user.id, tipo);
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
            const cfg = PASSIVE_BUILDINGS[tipo];
            return interaction.reply({ content: `✅ ${cfg.name} construída! Gera ${cfg.gold} moedas a cada ${cfg.intervalMinutes} minutos.`, ephemeral: false });
        }

        if (subcommand === 'coletar') {
            const result = collectPassive(interaction.user.id);
            if (result.total === 0) {
                return interaction.reply({ content: '⏳ Nada pronto para coletar ainda.', ephemeral: true });
            }
            const detailText = result.details.join('\n');
            return interaction.reply({ content: `💰 Você coletou ${result.total} moedas!\n${detailText}`, ephemeral: false });
        }

        if (subcommand === 'upar-vila') {
            const result = upgradeTownHall(interaction.user.id);
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
            return interaction.reply({ content: `🏠 Vila upada para o nível ${result.level}! Slots de construção: ${result.slots}.`, ephemeral: false });
        }
    },
};
