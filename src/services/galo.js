const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'galo.json');
const MAX_GALOS = 6;

const RARITY_MULT = {
    comum: 1,
    raro: 1.08,
    epico: 1.16,
    lendario: 1.25,
};

const GACHA_RARITY = [
    { rarity: 'comum', weight: 60 },
    { rarity: 'raro', weight: 25 },
    { rarity: 'epico', weight: 12 },
    { rarity: 'lendario', weight: 3 },
];

const TYPE_CATALOG = [
    { id: 'atirador', role: 'atirador', name: 'Atirador de Quintal', rarity: 'comum', base: { hp: 72, atk: 13, def: 6, spd: 12 }, npcBase: 60, attacks: [ { name: 'Disparo de Bico', mult: 1.05 }, { name: 'Pedregulho', mult: 0.95 } ] },
    { id: 'faqueiro', role: 'faqueiro', name: 'Faqueiro de Feira', rarity: 'comum', base: { hp: 80, atk: 12, def: 7, spd: 10 }, npcBase: 60, attacks: [ { name: 'Faca Curta', mult: 1.05 }, { name: 'Corte Rasteiro', mult: 1.0 } ] },
    { id: 'corredor', role: 'corredor', name: 'Corredor de Vila', rarity: 'comum', base: { hp: 68, atk: 11, def: 5, spd: 14 }, npcBase: 60, attacks: [ { name: 'Sprint', mult: 1.0 }, { name: 'Cotovelo', mult: 0.95 } ] },
    { id: 'tank', role: 'tank', name: 'Galo Blindado', rarity: 'comum', base: { hp: 105, atk: 10, def: 11, spd: 7 }, npcBase: 60, attacks: [ { name: 'Escudada', mult: 1.0 }, { name: 'Empurrão', mult: 0.9 } ] },
    { id: 'atirador_fino', role: 'atirador', name: 'Atirador Fino', rarity: 'raro', base: { hp: 78, atk: 15, def: 7, spd: 13 }, npcBase: 62, attacks: [ { name: 'Disparo Duplo', mult: 1.15 }, { name: 'Mira Precisa', mult: 1.05 } ] },
    { id: 'faqueiro_sombra', role: 'faqueiro', name: 'Faqueiro Sombrio', rarity: 'raro', base: { hp: 88, atk: 15, def: 8, spd: 11 }, npcBase: 62, attacks: [ { name: 'Lamina Oculta', mult: 1.15 }, { name: 'Golpe Cruzado', mult: 1.05 } ] },
    { id: 'corredor_tornado', role: 'corredor', name: 'Corredor Tornado', rarity: 'raro', base: { hp: 75, atk: 13, def: 6, spd: 15 }, npcBase: 62, attacks: [ { name: 'Chute Giratorio', mult: 1.1 }, { name: 'Arranque', mult: 1.0 } ] },
    { id: 'tank_fortaleza', role: 'tank', name: 'Tank Fortaleza', rarity: 'epico', base: { hp: 125, atk: 13, def: 14, spd: 7 }, npcBase: 63, attacks: [ { name: 'Muralha Viva', mult: 1.1 }, { name: 'Pisoteio', mult: 1.05 } ] },
    { id: 'atirador_sniper', role: 'atirador', name: 'Atirador Sniper', rarity: 'epico', base: { hp: 82, atk: 18, def: 8, spd: 14 }, npcBase: 63, attacks: [ { name: 'Tiro Cirurgico', mult: 1.3 }, { name: 'Plumagem Afiada', mult: 1.1 } ] },
    { id: 'corredor_tempestade', role: 'corredor', name: 'Corredor Tempestade', rarity: 'epico', base: { hp: 82, atk: 15, def: 8, spd: 16 }, npcBase: 63, attacks: [ { name: 'Furacao', mult: 1.2 }, { name: 'Salto Relampago', mult: 1.1 } ] },
    { id: 'tank_colosso', role: 'tank', name: 'Tank Colosso', rarity: 'lendario', base: { hp: 145, atk: 16, def: 16, spd: 8 }, npcBase: 65, attacks: [ { name: 'Terremoto', mult: 1.25 }, { name: 'Choque de Escudo', mult: 1.15 } ] },
    { id: 'atirador_orion', role: 'atirador', name: 'Atirador Orion', rarity: 'lendario', base: { hp: 88, atk: 20, def: 9, spd: 15 }, npcBase: 65, attacks: [ { name: 'Rajada Estelar', mult: 1.35 }, { name: 'Flecha de Luz', mult: 1.2 } ] },
];

const EQUIPMENT_CATALOG = [
    { id: 'faca', name: 'Faca Simples', rarity: 'comum', bonuses: { atk: 2, npc: 1 } },
    { id: 'facao', name: 'Facao Serrilhado', rarity: 'raro', bonuses: { atk: 4, def: 1, npc: 2 } },
    { id: 'soco_gaules', name: 'Soco Gaules', rarity: 'comum', bonuses: { atk: 2, spd: 2, npc: 1 } },
    { id: 'esporas', name: 'Esporas de Aco', rarity: 'raro', bonuses: { atk: 3, spd: 1, npc: 2 } },
    { id: 'armadura_leve', name: 'Armadura Leve', rarity: 'comum', bonuses: { hp: 12, def: 2, spd: 1 } },
    { id: 'armadura_pesada', name: 'Armadura Pesada', rarity: 'epico', bonuses: { hp: 25, def: 4, spd: -1 } },
    { id: 'olho_agui', name: 'Olho de Aguia', rarity: 'raro', bonuses: { spd: 3, npc: 3 } },
    { id: 'erva_vigor', name: 'Erva de Vigor', rarity: 'comum', bonuses: { hp: 10, npc: 2 } },
    { id: 'bico_aco', name: 'Bico de Aco', rarity: 'raro', bonuses: { atk: 4, npc: 2 } },
    { id: 'amuleta_sorte', name: 'Amuleto da Sorte', rarity: 'raro', bonuses: { def: 1, spd: 1, npc: 3 } },
    { id: 'ponta_tripla', name: 'Ponta Tripla', rarity: 'epico', bonuses: { atk: 6, npc: 3 } },
    { id: 'pluma_celeste', name: 'Pluma Celeste', rarity: 'lendario', bonuses: { spd: 4, atk: 3, npc: 4 } },
    { id: 'escudo_carvalho', name: 'Escudo de Carvalho', rarity: 'comum', bonuses: { hp: 15, def: 3 } },
    { id: 'escudo_ferro', name: 'Escudo de Ferro', rarity: 'raro', bonuses: { hp: 20, def: 5, spd: -1 } },
    { id: 'cinto_balas', name: 'Cinto de Balas', rarity: 'raro', bonuses: { atk: 3, spd: 1, npc: 2 } },
    { id: 'botas_vento', name: 'Botas do Vento', rarity: 'epico', bonuses: { spd: 5, npc: 2 } },
    { id: 'elixir_furia', name: 'Elixir da Furia', rarity: 'epico', bonuses: { atk: 7, hp: -5, npc: 2 } },
    { id: 'elixir_guardiao', name: 'Elixir do Guardiao', rarity: 'raro', bonuses: { hp: 12, def: 3, npc: 1 } },
    { id: 'chapa_titanio', name: 'Chapa de Titanio', rarity: 'lendario', bonuses: { hp: 30, def: 6, spd: -2, npc: 2 } },
    { id: 'visor_termal', name: 'Visor Termal', rarity: 'epico', bonuses: { atk: 4, spd: 2, npc: 4 } },
    { id: 'garras_veneno', name: 'Garras de Veneno', rarity: 'epico', bonuses: { atk: 5, npc: 3 } },
    { id: 'chip_ia', name: 'Chip de IA', rarity: 'lendario', bonuses: { spd: 3, def: 3, npc: 5 } },
    { id: 'municao_perfurante', name: 'Municao Perfurante', rarity: 'raro', bonuses: { atk: 5 } },
];

function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { users: {} };
    }
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('[Galo] Erro ao ler dados', err);
        return { users: {} };
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function ensureUser(data, userId) {
    if (!data.users[userId]) {
        data.users[userId] = { roosters: [], items: {} };
    }
    if (!data.users[userId].items) data.users[userId].items = {};
    return data.users[userId];
}

function rarityMult(rarity) {
    return RARITY_MULT[rarity] || 1;
}

function xpNeeded(level) {
    return 100 + (level - 1) * 50;
}

const ITEM_RARITY_WEIGHT = {
    comum: 55,
    raro: 30,
    epico: 12,
    lendario: 3,
};

function pickWeighted(list, key = 'weight') {
    const total = list.reduce((sum, item) => sum + (item[key] || 0), 0);
    if (total <= 0) return list[0];
    let roll = Math.random() * total;
    for (const item of list) {
        roll -= item[key] || 0;
        if (roll <= 0) return item;
    }
    return list[list.length - 1];
}

function rollRarity() {
    return pickWeighted(GACHA_RARITY, 'weight').rarity;
}

function rollType(rarity) {
    const pool = TYPE_CATALOG.filter(t => t.rarity === rarity);
    if (!pool.length) return TYPE_CATALOG[0];
    return pool[Math.floor(Math.random() * pool.length)];
}

function rarityRank(rarity) {
    if (rarity === 'comum') return 0;
    if (rarity === 'raro') return 1;
    if (rarity === 'epico') return 2;
    if (rarity === 'lendario') return 3;
    return 0;
}

function gachaRooster(name, forcedRarity) {
    const rarity = forcedRarity || rollRarity();
    const type = rollType(rarity);
    return buildRooster(type.id, name);
}

function gachaRoosterPack(count, guaranteedMinRarity) {
    const list = [];
    let hasMin = false;
    for (let i = 0; i < count; i++) {
        const r = gachaRooster();
        if (guaranteedMinRarity && rarityRank(r.rarity) >= rarityRank(guaranteedMinRarity)) hasMin = true;
        list.push(r);
    }

    if (guaranteedMinRarity && !hasMin && list.length) {
        list[0] = gachaRooster(null, guaranteedMinRarity);
    }

    return list;
}

function gachaItem(forcedRarity) {
    const weighted = EQUIPMENT_CATALOG.map(item => ({ ...item, weight: ITEM_RARITY_WEIGHT[item.rarity] || 1 }));
    if (forcedRarity) {
        const filtered = weighted.filter(i => i.rarity === forcedRarity);
        if (filtered.length) return pickWeighted(filtered, 'weight');
    }
    return pickWeighted(weighted, 'weight');
}

function gachaItemPack(count, guaranteedMinRarity) {
    const list = [];
    let hasMin = false;
    for (let i = 0; i < count; i++) {
        const item = gachaItem();
        if (guaranteedMinRarity && rarityRank(item.rarity) >= rarityRank(guaranteedMinRarity)) hasMin = true;
        list.push(item);
    }

    if (guaranteedMinRarity && !hasMin && list.length) {
        list[0] = gachaItem(guaranteedMinRarity);
    }

    return list;
}

function buildRooster(typeId, name) {
    const type = TYPE_CATALOG.find(t => t.id === typeId);
    if (!type) throw new Error('Tipo de galo invalido');
    const id = `g${Date.now().toString(36)}${Math.floor(Math.random() * 9999)}`;
    return {
        id,
        name: name || type.name,
        typeId: type.id,
        rarity: type.rarity,
        level: 1,
        xp: 0,
        npcChance: type.npcBase || 60,
        items: [],
        alive: true,
    };
}

function summarizeRooster(rooster) {
    return `${rooster.name} (${rooster.id}) - lvl ${rooster.level} ${rooster.alive ? '🟢' : '⚰️'}`;
}

function getType(rooster) {
    return TYPE_CATALOG.find(t => t.id === rooster.typeId);
}

function computeStats(rooster) {
    const type = getType(rooster);
    const rarity = rarityMult(rooster.rarity);
    const levelFactor = 1 + (rooster.level - 1) * 0.06;
    const base = type ? type.base : { hp: 80, atk: 10, def: 6, spd: 8 };

    let stats = {
        hp: Math.round(base.hp * rarity * levelFactor),
        atk: Math.round(base.atk * rarity * levelFactor),
        def: Math.round(base.def * rarity * levelFactor),
        spd: Math.round(base.spd * rarity * levelFactor),
        npc: rooster.npcChance || 60,
    };

    const items = rooster.items || [];
    items.forEach(itemId => {
        const item = EQUIPMENT_CATALOG.find(i => i.id === itemId);
        if (!item) return;
        const b = item.bonuses;
        stats.hp += b.hp || 0;
        stats.atk += b.atk || 0;
        stats.def += b.def || 0;
        stats.spd += b.spd || 0;
        stats.npc += b.npc || 0;
    });

    if (stats.npc > 95) stats.npc = 95;
    if (stats.spd < 1) stats.spd = 1;

    return stats;
}

function addXp(rooster, amount) {
    rooster.xp = (rooster.xp || 0) + amount;
    while (rooster.xp >= xpNeeded(rooster.level)) {
        rooster.xp -= xpNeeded(rooster.level);
        rooster.level += 1;
    }
}

function getRooster(data, userId, roosterKey) {
    const user = ensureUser(data, userId);
    if (!roosterKey) return { user, rooster: undefined };

    // Busca por ID exato primeiro
    let rooster = user.roosters.find(r => r.id === roosterKey);

    // Se não achou, tenta por nome/apelido (case-insensitive)
    if (!rooster) {
        const keyLower = roosterKey.toLowerCase();
        rooster = user.roosters.find(r => (r.name || '').toLowerCase() === keyLower);
    }

    return { user, rooster };
}

function canHaveMore(data, userId) {
    const user = ensureUser(data, userId);
    return user.roosters.filter(r => r.alive).length < MAX_GALOS;
}

function addRoosterToUser(data, userId, rooster) {
    const user = ensureUser(data, userId);
    user.roosters.push(rooster);
}

function grantItem(user, itemId) {
    if (!user.items) user.items = {};
    user.items[itemId] = (user.items[itemId] || 0) + 1;
}

function consumeItem(user, itemId) {
    if (!user.items || !user.items[itemId]) return false;
    user.items[itemId] -= 1;
    if (user.items[itemId] <= 0) delete user.items[itemId];
    return true;
}

function killRooster(rooster) {
    rooster.alive = false;
}

function nextNpcChance(rooster) {
    rooster.npcChance = Math.min(95, (rooster.npcChance || 60) + 1);
}

function pickAttack(rooster) {
    const type = getType(rooster);
    if (!type || !type.attacks || !type.attacks.length) {
        return { name: 'Ataque', mult: 1 };
    }
    return type.attacks[Math.floor(Math.random() * type.attacks.length)];
}

module.exports = {
    DATA_FILE,
    TYPE_CATALOG,
    EQUIPMENT_CATALOG,
    MAX_GALOS,
    loadData,
    saveData,
    ensureUser,
    buildRooster,
    summarizeRooster,
    computeStats,
    addXp,
    xpNeeded,
    gachaRooster,
    gachaRoosterPack,
    gachaItem,
    gachaItemPack,
    getRooster,
    canHaveMore,
    addRoosterToUser,
    grantItem,
    consumeItem,
    killRooster,
    nextNpcChance,
    pickAttack,
};
