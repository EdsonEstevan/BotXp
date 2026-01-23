const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getBalance, addBalance, subtractBalance } = require('../services/economy');
const {
    loadData,
    saveData,
    ensureUser,
    TYPE_CATALOG,
    EQUIPMENT_CATALOG,
    MAX_GALOS,
    gachaRooster,
    gachaRoosterPack,
    gachaItem,
    gachaItemPack,
    summarizeRooster,
    computeStats,
    addXp,
    xpNeeded,
    getRooster,
    canHaveMore,
    addRoosterToUser,
    grantItem,
    consumeItem,
    killRooster,
    nextNpcChance,
    pickAttack,
} = require('../services/galo');

const MAX_ITEMS = 3;
const GACHA_COST_ROOSTER = 10;
const GACHA_COST_ITEM = 50;
const GACHA_COST_PACK = 50;
const GACHA_COST_ITEM10 = 500;
const DUEL_CHOICE_TIMEOUT = 45_000;
const DUEL_MAX_TIME = 5 * 60_000;
const DUEL_MAX_TURNS = 40;
const activeDuels = new Map();
const GORE_LINES = [
    '{W} arranca as penas de {L} e pisa no pescoço até parar de mexer.',
    '{W} atravessa {L} com o bico, levantando o corpo no ar antes de jogar no chão.',
    '{W} esmaga a cabeça de {L} contra o barro, deixando só um silêncio úmido.',
    '{W} rasga o peito de {L} em tiras, espalhando pena e sangue para todo lado.',
    '{W} crava as esporas no olho de {L} e torce até apagar qualquer sinal de vida.',
];

function formatStats(rooster) {
    const stats = computeStats(rooster);
    return `HP ${stats.hp} | ATK ${stats.atk} | DEF ${stats.def} | SPD ${stats.spd} | Chance NPC ${stats.npc}%`;
}

function ensureRooster(userId, roosterId) {
    const data = loadData();
    const { user, rooster } = getRooster(data, userId, roosterId);
    return { data, user, rooster };
}

function getAttacks(rooster) {
    const type = TYPE_CATALOG.find(t => t.id === rooster.typeId);
    const attacks = type && Array.isArray(type.attacks) ? type.attacks : [];
    return attacks.length ? attacks : [{ name: 'Ataque', mult: 1 }];
}

function buildHpLine(player) {
    return `${player.rooster.name} — HP ${Math.max(0, Math.round(player.hp))}/${player.stats.hp} | SPD ${player.stats.spd}`;
}

function buildLog(log) {
    const tail = log.slice(-8);
    const shown = tail.join('\n');
    return shown || 'Aguardando ações.';
}

function buildDuelEmbed(state, desc) {
    const embed = new EmbedBuilder()
        .setColor(state.finished ? '#ff4444' : '#ffaa00')
        .setTitle(`Duelo de Galo — Turno ${state.turn}`)
        .setDescription(desc || 'Escolham o ataque de cada galo.');

    embed.addFields(
        { name: `${state.players.A.userTag} (${state.players.A.rooster.name})`, value: buildHpLine(state.players.A), inline: false },
        { name: `${state.players.B.userTag} (${state.players.B.rooster.name})`, value: buildHpLine(state.players.B), inline: false },
        { name: 'Pot', value: `${state.pot} moedas`, inline: true },
        { name: 'Log', value: buildLog(state.log), inline: false },
    );

    return embed;
}

function pickGoreLine(winnerName, loserName) {
    const line = GORE_LINES[Math.floor(Math.random() * GORE_LINES.length)];
    return line.replace('{W}', winnerName).replace('{L}', loserName);
}

function buildAttackRows(state) {
    const rows = [];
    ['A', 'B'].forEach(side => {
        const player = state.players[side];
        const attacks = getAttacks(player.rooster).slice(0, 5);
        const row = new ActionRowBuilder();
        attacks.forEach((atk, idx) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`duel:${state.id}:${side}:${idx}`)
                    .setLabel(atk.name)
                    .setStyle(side === 'A' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(state.finished || state.choices[side] !== null)
            );
        });
        rows.push(row);
    });
    return rows;
}

function hasActiveDuelWithUser(userId) {
    for (const duel of activeDuels.values()) {
        if (duel.finished) continue;
        if (duel.players.A.userId === userId || duel.players.B.userId === userId) return true;
    }
    return false;
}

async function updateMessage(state, desc) {
    if (!state.message) return;
    const embed = buildDuelEmbed(state, desc);
    const components = state.finished ? [] : buildAttackRows(state);
    await state.message.edit({ embeds: [embed], components });
}

function resetChoiceTimer(state) {
    if (state.choiceTimer) clearTimeout(state.choiceTimer);
    if (state.finished) return;
    state.choiceTimer = setTimeout(() => {
        if (state.finished) return;
        finishDuel(state, { winner: null, reason: 'Tempo esgotado para escolher ataque. Apostas devolvidas.' })
            .catch(err => console.error('[Galo] Erro ao finalizar duelo por timeout', err));
    }, DUEL_CHOICE_TIMEOUT);
}

async function finishDuel(state, { winner, reason }) {
    if (state.finished) return;
    state.finished = true;
    if (state.collector) state.collector.stop('finished');
    if (state.choiceTimer) clearTimeout(state.choiceTimer);

    if (winner === null) {
        addBalance(state.players.A.userId, state.bet);
        addBalance(state.players.B.userId, state.bet);
        state.log.push(reason || 'Empate. Apostas devolvidas.');
    } else {
        const loser = winner === 'A' ? 'B' : 'A';
        const winnerPlayer = state.players[winner];
        const loserPlayer = state.players[loser];
        killRooster(loserPlayer.rooster);
        addBalance(winnerPlayer.userId, state.pot);
        addXp(winnerPlayer.rooster, 80 + loserPlayer.rooster.level * 10);
        const gore = pickGoreLine(winnerPlayer.rooster.name, loserPlayer.rooster.name);
        state.log.push(reason || `Vitória de ${winnerPlayer.userTag}! ${gore}`);
    }

    saveData(state.data);
    activeDuels.delete(state.id);
    await updateMessage(state);
}

async function resolveTurn(state) {
    if (state.finished) return;
    if (state.choiceTimer) clearTimeout(state.choiceTimer);

    state.log.push(`--- Turno ${state.turn} ---`);
    const attacks = {
        A: getAttacks(state.players.A.rooster),
        B: getAttacks(state.players.B.rooster),
    };

    const order = state.players.A.stats.spd === state.players.B.stats.spd
        ? (Math.random() < 0.5 ? ['A', 'B'] : ['B', 'A'])
        : (state.players.A.stats.spd > state.players.B.stats.spd ? ['A', 'B'] : ['B', 'A']);

    let winner = null;

    for (const side of order) {
        const def = side === 'A' ? 'B' : 'A';
        const attacker = state.players[side];
        const defender = state.players[def];
        const choiceIndex = state.choices[side] ?? 0;
        const attack = attacks[side][choiceIndex] || attacks[side][0];
        const dmg = Math.max(4, Math.round(attacker.stats.atk * attack.mult - defender.stats.def * 0.35 + Math.random() * 3));

        defender.hp -= dmg;
        state.log.push(`${attacker.rooster.name} usa ${attack.name} e causa ${dmg} de dano. ${defender.rooster.name} fica com ${Math.max(0, Math.round(defender.hp))} HP.`);

        if (defender.hp <= 0) {
            winner = side;
            break;
        }
    }

    state.choices = { A: null, B: null };
    state.turn += 1;

    if (!winner && state.turn > DUEL_MAX_TURNS) {
        const hpA = Math.max(0, Math.round(state.players.A.hp));
        const hpB = Math.max(0, Math.round(state.players.B.hp));
        if (hpA === hpB) {
            await finishDuel(state, { winner: null, reason: 'Empate por limite de turnos.' });
            return;
        }
        winner = hpA > hpB ? 'A' : 'B';
        state.log.push('Limite de turnos atingido. Vitória decidida por HP restante.');
    }

    if (winner) {
        await finishDuel(state, { winner });
    } else {
        await updateMessage(state, 'Escolham o próximo ataque.');
        resetChoiceTimer(state);
    }
}

function roosterChoices(user, focused) {
    const term = (focused || '').toLowerCase();
    const list = (user.roosters || []).slice().filter(r => r.alive);
    const filtered = term
        ? list.filter(r => (r.id || '').toLowerCase().includes(term) || (r.name || '').toLowerCase().includes(term))
        : list;
    return filtered.slice(0, 25).map(r => ({
        name: `${r.name} (${r.rarity}) [${r.id}]`,
        value: r.id,
    }));
}

function itemChoices(user, focused) {
    const term = (focused || '').toLowerCase();
    const entries = Object.entries(user.items || {}).filter(([, qty]) => qty > 0);
    const mapped = entries.map(([id, qty]) => {
        const item = EQUIPMENT_CATALOG.find(e => e.id === id);
        const label = item ? `${item.name} (${item.rarity})` : id;
        return { id, label, qty };
    });

    const filtered = term
        ? mapped.filter(m => m.id.toLowerCase().includes(term) || m.label.toLowerCase().includes(term))
        : mapped;

    return filtered.slice(0, 25).map(m => ({
        name: `${m.label} — ${m.qty}x`,
        value: m.id,
    }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('galo')
        .setDescription('Sistema de rinha de galo')
        .addSubcommand(sub =>
            sub.setName('gacha')
                .setDescription('Rolar gacha para obter um galo aleatório')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome opcional para o galo obtido')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('gacha6')
                .setDescription('Sortear 6 galos de uma vez (custa 50, garante 1 raro+)'))
        .addSubcommand(sub =>
            sub.setName('renomear')
                .setDescription('Renomeia um galo já comprado')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('Escolha o galo')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Novo nome')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('gacha_item')
                .setDescription('Rolar gacha para obter um item de galo'))
        .addSubcommand(sub =>
            sub.setName('gacha_item10')
                .setDescription('Sortear 10 itens de galo (custa 500, garante 1 raro+)'))
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Lista seus galos'))
        .addSubcommand(sub =>
            sub.setName('inventario')
                .setDescription('Lista seus itens de galo'))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Detalhes de um galo')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID do galo')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('equipar')
                .setDescription('Equipa um item no galo (usa item do inventário)')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID do galo')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(opt =>
                    opt.setName('item')
                        .setDescription('Item para equipar')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('duelo')
                .setDescription('Duelo por turno contra outro jogador')
                .addUserOption(opt =>
                    opt.setName('alvo')
                        .setDescription('Jogador alvo')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('meu')
                        .setDescription('ID do seu galo')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(opt =>
                    opt.setName('dele')
                        .setDescription('ID do galo do alvo')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(opt =>
                    opt.setName('aposta')
                        .setDescription('Moedas apostadas (cada lado)')
                        .setRequired(true)
                        .setMinValue(5)))
        .addSubcommand(sub =>
            sub.setName('npc')
                .setDescription('Combate automático contra NPC apostando moedas')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID do seu galo')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(opt =>
                    opt.setName('aposta')
                        .setDescription('Moedas apostadas')
                        .setRequired(true)
                        .setMinValue(20))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'gacha') {
            const name = interaction.options.getString('nome');
            const data = loadData();
            if (!canHaveMore(data, interaction.user.id)) {
                return interaction.reply({ content: `Você já tem ${MAX_GALOS} galos vivos. Libere espaço primeiro.`, ephemeral: true });
            }

            const newBalance = subtractBalance(interaction.user.id, GACHA_COST_ROOSTER);
            if (newBalance === null) {
                return interaction.reply({ content: `Saldo insuficiente. O gacha de galo custa ${GACHA_COST_ROOSTER} moedas.`, ephemeral: true });
            }

            const rooster = gachaRooster(name);
            const type = TYPE_CATALOG.find(t => t.id === rooster.typeId);
            addRoosterToUser(data, interaction.user.id, rooster);
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('Galo obtido no gacha!')
                .setDescription(`${rooster.name} entrou no seu galinheiro.`)
                .addFields(
                    { name: 'Tipo', value: type ? `${type.name} (${type.role})` : rooster.typeId, inline: true },
                    { name: 'Raridade', value: rooster.rarity, inline: true },
                    { name: 'Stats iniciais', value: formatStats(rooster) }
                )
                .setFooter({ text: `ID: ${rooster.id}` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'gacha6') {
            const data = loadData();
            const user = ensureUser(data, interaction.user.id);
            const alive = (user.roosters || []).filter(r => r.alive).length;
            if (alive + 6 > MAX_GALOS) {
                return interaction.reply({ content: `Você precisa de ${alive + 6 - MAX_GALOS} vaga(s) livre(s) para este pacote.`, ephemeral: true });
            }

            const newBalance = subtractBalance(interaction.user.id, GACHA_COST_PACK);
            if (newBalance === null) {
                return interaction.reply({ content: `Saldo insuficiente. O pacote de 6 galos custa ${GACHA_COST_PACK} moedas.`, ephemeral: true });
            }

            const roosters = gachaRoosterPack(6, 'raro');
            roosters.forEach(r => addRoosterToUser(data, interaction.user.id, r));
            saveData(data);

            const list = roosters.map(r => `${r.name} (${r.rarity}) — ID ${r.id}`).join('\n');
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('Pacote de 6 galos')
                .setDescription('Você recebeu 6 galos. Pelo menos um é raro ou melhor.')
                .addFields({ name: 'Galos', value: list });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'renomear') {
            const id = interaction.options.getString('id');
            const newNameRaw = interaction.options.getString('nome') || '';
            const newName = newNameRaw.trim();

            if (!newName || newName.length > 32) {
                return interaction.reply({ content: 'Informe um nome válido (1-32 caracteres).', ephemeral: true });
            }

            const { data, rooster } = ensureRooster(interaction.user.id, id);
            if (!rooster) return interaction.reply({ content: 'Galo não encontrado.', ephemeral: true });

            rooster.name = newName;
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor('#66ccff')
                .setTitle('Galo renomeado')
                .setDescription(`Novo nome: ${newName}`)
                .setFooter({ text: `ID: ${rooster.id}` });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'gacha_item') {
            const newBalance = subtractBalance(interaction.user.id, GACHA_COST_ITEM);
            if (newBalance === null) {
                return interaction.reply({ content: `Saldo insuficiente. O gacha de item custa ${GACHA_COST_ITEM} moedas.`, ephemeral: true });
            }

            const data = loadData();
            const user = ensureUser(data, interaction.user.id);
            const item = gachaItem();
            grantItem(user, item.id);
            saveData(data);

            const bonuses = Object.entries(item.bonuses || {})
                .map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`)
                .join(', ');

            const embed = new EmbedBuilder()
                .setColor('#66ccff')
                .setTitle('Item obtido no gacha!')
                .setDescription(`${item.name} (${item.rarity}) adicionado ao seu inventário.`)
                .addFields({ name: 'Bônus', value: bonuses || '—' }, { name: 'Total', value: `${user.items[item.id]}x`, inline: true });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'gacha_item10') {
            const newBalance = subtractBalance(interaction.user.id, GACHA_COST_ITEM10);
            if (newBalance === null) {
                return interaction.reply({ content: `Saldo insuficiente. O pacote de 10 itens custa ${GACHA_COST_ITEM10} moedas.`, ephemeral: true });
            }

            const data = loadData();
            const user = ensureUser(data, interaction.user.id);
            const items = gachaItemPack(10, 'raro');
            items.forEach(item => grantItem(user, item.id));
            saveData(data);

            const lines = items.map(item => `${item.name} (${item.rarity})`).join('\n');
            const embed = new EmbedBuilder()
                .setColor('#66ccff')
                .setTitle('Pacote de 10 itens')
                .setDescription('Você recebeu 10 itens. Pelo menos um é raro ou melhor.')
                .addFields({ name: 'Itens', value: lines });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'listar') {
            const data = loadData();
            const user = ensureUser(data, interaction.user.id);
            const list = user.roosters.length ? user.roosters.map(r => summarizeRooster(r)).join('\n') : 'Nenhum galo. Use /galo gacha.';
            const embed = new EmbedBuilder()
                .setColor('#00bfff')
                .setTitle('Seus galos')
                .setDescription(list);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'inventario') {
            const data = loadData();
            const user = ensureUser(data, interaction.user.id);
            const entries = Object.entries(user.items || {});
            const list = entries.length
                ? entries.map(([id, qty]) => {
                    const item = EQUIPMENT_CATALOG.find(e => e.id === id);
                    const name = item ? `${item.name} (${item.rarity})` : id;
                    return `${qty}x - ${name}`;
                }).join('\n')
                : 'Inventário vazio. Use /galo gacha_item para conseguir itens.';
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Itens de galo')
                .setDescription(list);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'info') {
            const id = interaction.options.getString('id');
            const { data, rooster } = ensureRooster(interaction.user.id, id);
            if (!rooster) return interaction.reply({ content: 'Galo não encontrado.', ephemeral: true });
            const stats = computeStats(rooster);
            const need = xpNeeded(rooster.level);
            const type = TYPE_CATALOG.find(t => t.id === rooster.typeId);
            const items = (rooster.items || []).map(i => {
                const eq = EQUIPMENT_CATALOG.find(e => e.id === i);
                return eq ? eq.name : i;
            }).join(', ') || 'Nenhum';

            const embed = new EmbedBuilder()
                .setColor(rooster.alive ? '#00ff88' : '#666666')
                .setTitle(`${rooster.name} (${rooster.id})`)
                .addFields(
                    { name: 'Tipo', value: type ? `${type.name} (${type.role})` : rooster.typeId, inline: true },
                    { name: 'Raridade', value: rooster.rarity, inline: true },
                    { name: 'Nivel', value: `${rooster.level} (${rooster.xp}/${need} xp)`, inline: true },
                    { name: 'Status', value: rooster.alive ? 'Vivo' : 'Morto', inline: true },
                    { name: 'Stats', value: formatStats(rooster) },
                    { name: 'Itens', value: items }
                );
            saveData(data);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'equipar') {
            const id = interaction.options.getString('id');
            const itemId = interaction.options.getString('item');
            const item = EQUIPMENT_CATALOG.find(i => i.id === itemId);
            if (!item) return interaction.reply({ content: 'Item invalido.', ephemeral: true });

            const { data, user, rooster } = ensureRooster(interaction.user.id, id);
            if (!rooster) return interaction.reply({ content: 'Galo não encontrado.', ephemeral: true });
            if (!rooster.alive) return interaction.reply({ content: 'Não é possível equipar um galo morto.', ephemeral: true });

            const items = rooster.items || [];
            if (items.length >= MAX_ITEMS) {
                return interaction.reply({ content: `Limite de ${MAX_ITEMS} itens por galo atingido.`, ephemeral: true });
            }

            const hasItem = consumeItem(user, itemId);
            if (!hasItem) {
                return interaction.reply({ content: 'Você não possui este item no inventário. Use /galo gacha_item.', ephemeral: true });
            }

            items.push(item.id);
            rooster.items = items;
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('Item equipado')
                .setDescription(`${rooster.name} recebeu ${item.name}.`)
                .addFields(
                    { name: 'Itens atuais', value: items.join(', ') },
                    { name: 'Stats agora', value: formatStats(rooster) }
                )
                .setFooter({ text: `ID: ${rooster.id}` });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'duelo') {
            const target = interaction.options.getUser('alvo');
            const myId = interaction.options.getString('meu');
            const theirId = interaction.options.getString('dele');
            const bet = interaction.options.getInteger('aposta');

            if (!target || target.bot) {
                return interaction.reply({ content: 'Escolha um jogador válido.', ephemeral: true });
            }
            if (target.id === interaction.user.id) {
                return interaction.reply({ content: 'Você não pode duelar consigo mesmo.', ephemeral: true });
            }

            if (hasActiveDuelWithUser(interaction.user.id) || hasActiveDuelWithUser(target.id)) {
                return interaction.reply({ content: 'Um dos jogadores já está em um duelo em andamento.', ephemeral: true });
            }

            const attackerBalance = getBalance(interaction.user.id);
            const targetBalance = getBalance(target.id);
            if (attackerBalance < bet || targetBalance < bet) {
                return interaction.reply({ content: 'Um dos jogadores não tem saldo suficiente para a aposta.', ephemeral: true });
            }

            const data = loadData();
            const { rooster: myRooster } = getRooster(data, interaction.user.id, myId);
            const { rooster: theirRooster } = getRooster(data, target.id, theirId);
            if (!myRooster || !theirRooster) {
                return interaction.reply({ content: 'Galo não encontrado para um dos jogadores.', ephemeral: true });
            }
            if (!myRooster.alive || !theirRooster.alive) {
                return interaction.reply({ content: 'Ambos os galos precisam estar vivos.', ephemeral: true });
            }

            const pot = bet * 2;
            subtractBalance(interaction.user.id, bet);
            subtractBalance(target.id, bet);

            const statsA = computeStats(myRooster);
            const statsB = computeStats(theirRooster);
            const duelId = `d${Date.now().toString(36)}${Math.floor(Math.random() * 9999)}`;

            const state = {
                id: duelId,
                data,
                bet,
                pot,
                finished: false,
                turn: 1,
                log: [],
                choices: { A: null, B: null },
                players: {
                    A: { userId: interaction.user.id, userTag: interaction.user.username, rooster: myRooster, stats: statsA, hp: statsA.hp },
                    B: { userId: target.id, userTag: target.username, rooster: theirRooster, stats: statsB, hp: statsB.hp },
                },
                collector: null,
                message: null,
                choiceTimer: null,
            };

            activeDuels.set(duelId, state);

            const message = await interaction.reply({
                embeds: [buildDuelEmbed(state, 'Escolham o primeiro ataque.')],
                components: buildAttackRows(state),
                fetchReply: true,
            });

            state.message = message;
            resetChoiceTimer(state);

            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: DUEL_MAX_TIME });
            state.collector = collector;

            collector.on('collect', async btn => {
                const parts = btn.customId.split(':');
                if (parts[0] !== 'duel' || parts[1] !== state.id) return;
                const side = parts[2];
                const idx = Number(parts[3]) || 0;

                if (state.finished) {
                    return btn.reply({ content: 'Duelo já finalizado.', ephemeral: true });
                }

                if (side !== 'A' && side !== 'B') {
                    return btn.reply({ content: 'Jogada inválida.', ephemeral: true });
                }

                if (btn.user.id !== state.players[side].userId) {
                    return btn.reply({ content: 'Este ataque não é seu para escolher.', ephemeral: true });
                }

                state.choices[side] = idx;
                await btn.deferUpdate();

                const waiting = state.choices[side === 'A' ? 'B' : 'A'] === null;
                if (waiting) {
                    await updateMessage(state, `Aguardando ${side === 'A' ? state.players.B.userTag : state.players.A.userTag} escolher o ataque.`);
                } else {
                    await resolveTurn(state);
                }
            });

            collector.on('end', async (_collected, reason) => {
                if (state.finished) return;
                await finishDuel(state, { winner: null, reason: reason === 'time' ? 'Duelo cancelado por tempo. Apostas devolvidas.' : 'Duelo encerrado.' });
            });

            return;
        }

        if (sub === 'npc') {
            const id = interaction.options.getString('id');
            const bet = interaction.options.getInteger('aposta');
            const balance = getBalance(interaction.user.id);
            if (balance < bet) return interaction.reply({ content: 'Saldo insuficiente.', ephemeral: true });

            const { data, rooster } = ensureRooster(interaction.user.id, id);
            if (!rooster) return interaction.reply({ content: 'Galo não encontrado.', ephemeral: true });
            if (!rooster.alive) return interaction.reply({ content: 'Galo morto não luta.', ephemeral: true });

            subtractBalance(interaction.user.id, bet);
            const stats = computeStats(rooster);
            const chance = stats.npc;
            const roll = Math.random() * 100;
            let content;
            let reward = 0;

            if (roll < chance) {
                reward = Math.floor(bet * 2);
                addBalance(interaction.user.id, reward);
                addXp(rooster, 25);
                content = `✅ Vitória! Você ganhou ${reward} moedas. Chance: ${chance.toFixed(1)}% (rolou ${roll.toFixed(1)}).`;
            } else {
                killRooster(rooster);
                content = `❌ Derrota! Seu galo morreu e você perdeu ${bet} moedas. Chance: ${chance.toFixed(1)}% (rolou ${roll.toFixed(1)}).`;
            }

            if (rooster.alive) {
                nextNpcChance(rooster);
            }
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor(rooster.alive ? '#00cc66' : '#555555')
                .setTitle('Combate NPC')
                .setDescription(content)
                .addFields(
                    { name: 'Galo', value: `${rooster.name} (${rooster.id})`, inline: false },
                    { name: 'Stats', value: formatStats(rooster), inline: false }
                );

            return interaction.reply({ embeds: [embed] });
        }

        return interaction.reply({ content: 'Subcomando inválido.', ephemeral: true });
    },
};

module.exports.autocomplete = async (interaction) => {
    const focused = interaction.options.getFocused(true);
    const optionName = focused.name;

    // Apenas opções que pedem galo ou item
    if (!['id', 'meu', 'dele', 'item'].includes(optionName)) {
        return interaction.respond([]);
    }

    const data = loadData();

    if (optionName === 'item') {
        const user = ensureUser(data, interaction.user.id);
        return interaction.respond(itemChoices(user, focused.value));
    }

    // Para "dele", se o alvo estiver selecionado, tenta listar os galos dele; caso contrário, usa do autor
    let targetUserId = interaction.user.id;
    if (optionName === 'dele') {
        const alvo = interaction.options.getUser('alvo');
        if (alvo) targetUserId = alvo.id;
    }

    const user = ensureUser(data, targetUserId);
    const choices = roosterChoices(user, focused.value);
    return interaction.respond(choices);
};
