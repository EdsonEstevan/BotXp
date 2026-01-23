const fs = require('fs');
const path = require('path');

const TROOPS_DATA_FILE = path.join(__dirname, '..', '..', 'troops.json');
const DEFENSES_DATA_FILE = path.join(__dirname, '..', '..', 'defenses.json');
const BATTLE_LOG_FILE = path.join(__dirname, '..', '..', 'battle_log.json');
const COOLDOWNS_FILE = path.join(__dirname, '..', '..', 'attack_cooldowns.json');
const BASE_DATA_FILE = path.join(__dirname, '..', '..', 'clash_base.json');

// Dados padrão de tropas - agora com vantagens estratégicas
const DEFAULT_TROOPS = {
    goblin: { 
        name: 'Goblin Ladrão', 
        cost: 80, 
        attack: 15,
        health: 30,
        special: 'Rouba 50% mais moedas',
        emoji: '👺'
    },
    arqueiro: { 
        name: 'Arqueiro Ágil', 
        cost: 180, 
        attack: 35,
        health: 40,
        special: '+20% de esquiva',
        emoji: '🏹'
    },
    barbaro: { 
        name: 'Bárbaro Furioso', 
        cost: 280, 
        attack: 50,
        health: 80,
        special: '+30% de dano crítico',
        emoji: '⚔️'
    },
    dragao: { 
        name: 'Dragão Ancião', 
        cost: 800, 
        attack: 120,
        health: 150,
        special: 'Ignora 40% da defesa',
        emoji: '🐉'
    },
};

// Dados padrão de defesas - agora com mecânicas ativas
const DEFAULT_DEFENSES = {
    muro: { 
        name: 'Muralha Reforçada', 
        cost: 40, 
        defense: 20,
        durability: 100,
        special: 'Absorve primeiros 30 de dano',
        emoji: '🧱'
    },
    torre: { 
        name: 'Torre dos Arqueiros', 
        cost: 100, 
        defense: 45,
        durability: 150,
        special: 'Contra-ataca causando 25 de dano',
        emoji: '🗼'
    },
    castelo: { 
        name: 'Castelo Fortificado', 
        cost: 200, 
        defense: 90,
        durability: 250,
        special: 'Reduz dano em 35%',
        emoji: '🏰'
    },
    fortaleza: { 
        name: 'Fortaleza Impenetrável', 
        cost: 500, 
        defense: 180,
        durability: 400,
        special: 'Reflete 20% do dano + escudo',
        emoji: '🛡️'
    },
};

// Construções passivas (geram ouro periodicamente)
const PASSIVE_BUILDINGS = {
    miner: { name: 'Mina Modesta', cost: 200, gold: 80, intervalMinutes: 30, emoji: '⛏️' },
    extractor: { name: 'Extrator Robusto', cost: 800, gold: 350, intervalMinutes: 120, emoji: '⚙️' },
    foundry: { name: 'Fundição Épica', cost: 2400, gold: 1200, intervalMinutes: 360, emoji: '🏭' }
};

// Limites de construção por nível de vila
const TOWN_HALL_LEVELS = [0, 500, 1500, 4000, 8000]; // custo para upar para nível i (índice = nível)
function getSlotsForLevel(level) {
    return 1 + level; // nível 1 = 2 slots, nível 2 = 3 slots, etc.
}

function loadUserTroops(userId) {
    try {
        const data = fs.existsSync(TROOPS_DATA_FILE) 
            ? JSON.parse(fs.readFileSync(TROOPS_DATA_FILE, 'utf8'))
            : {};
        
        if (!data[userId]) {
            data[userId] = {};
            Object.keys(DEFAULT_TROOPS).forEach(key => {
                data[userId][key] = 0;
            });
        }
        return data;
    } catch (err) {
        console.error('[Troops] Erro ao carregar tropas:', err);
        return {};
    }
}

function saveUserTroops(data) {
    try {
        fs.writeFileSync(TROOPS_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Troops] Erro ao salvar tropas:', err);
    }
}

function loadUserDefenses(userId) {
    try {
        const data = fs.existsSync(DEFENSES_DATA_FILE)
            ? JSON.parse(fs.readFileSync(DEFENSES_DATA_FILE, 'utf8'))
            : {};
        
        if (!data[userId]) {
            data[userId] = {};
            Object.keys(DEFAULT_DEFENSES).forEach(key => {
                data[userId][key] = 0;
            });
        }
        return data;
    } catch (err) {
        console.error('[Defenses] Erro ao carregar defesas:', err);
        return {};
    }
}

function loadBaseData() {
    try {
        if (!fs.existsSync(BASE_DATA_FILE)) return {};
        return JSON.parse(fs.readFileSync(BASE_DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('[Clash] Erro ao carregar bases:', err);
        return {};
    }
}

function saveBaseData(data) {
    try {
        fs.writeFileSync(BASE_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Clash] Erro ao salvar bases:', err);
    }
}

function ensureBase(userId) {
    const data = loadBaseData();
    if (!data[userId]) {
        data[userId] = {
            townHall: 1,
            buildings: [],
            created: Date.now()
        };
        saveBaseData(data);
    }
    return data;
}

function getBaseInfo(userId) {
    const data = ensureBase(userId);
    const base = data[userId];
    const slots = getSlotsForLevel(base.townHall);
    return { ...base, slots };
}

function buildPassive(userId, buildingKey) {
    const { subtractBalance, getBalance } = require('./economy');
    if (!PASSIVE_BUILDINGS[buildingKey]) {
        return { success: false, error: 'Construção inválida.' };
    }
    const data = ensureBase(userId);
    const base = data[userId];
    const slots = getSlotsForLevel(base.townHall);

    if (base.buildings.length >= slots) {
        return { success: false, error: 'Limite de construções atingido. Upe sua vila para liberar mais slots.' };
    }

    const cfg = PASSIVE_BUILDINGS[buildingKey];
    const balance = getBalance(userId);
    if (balance < cfg.cost) {
        return { success: false, error: 'Saldo insuficiente para construir.' };
    }

    subtractBalance(userId, cfg.cost);
    base.buildings.push({
        type: buildingKey,
        builtAt: Date.now(),
        lastCollected: Date.now()
    });
    saveBaseData(data);
    return { success: true, message: `Construção iniciada: ${cfg.name}` };
}

function collectPassive(userId) {
    const { addBalance } = require('./economy');
    const data = ensureBase(userId);
    const base = data[userId];
    let total = 0;
    const details = [];
    const now = Date.now();

    base.buildings.forEach(b => {
        const cfg = PASSIVE_BUILDINGS[b.type];
        if (!cfg) return;
        const interval = cfg.intervalMinutes * 60 * 1000;
        const cycles = Math.floor((now - b.lastCollected) / interval);
        if (cycles > 0) {
            const amount = cycles * cfg.gold;
            total += amount;
            b.lastCollected += cycles * interval;
            details.push(`${cfg.name}: +${amount} (x${cycles})`);
        }
    });

    if (total > 0) {
        addBalance(userId, total);
        saveBaseData(data);
    }

    return { success: true, total, details };
}

function upgradeTownHall(userId) {
    const { subtractBalance, getBalance } = require('./economy');
    const data = ensureBase(userId);
    const base = data[userId];
    const currentLevel = base.townHall;
    const nextLevel = currentLevel + 1;

    if (nextLevel >= TOWN_HALL_LEVELS.length) {
        return { success: false, error: 'Nível máximo da vila alcançado.' };
    }

    const cost = TOWN_HALL_LEVELS[nextLevel];
    const balance = getBalance(userId);
    if (balance < cost) {
        return { success: false, error: `Custa ${cost} moedas para upar a vila.` };
    }

    subtractBalance(userId, cost);
    base.townHall = nextLevel;
    saveBaseData(data);
    return { success: true, level: nextLevel, slots: getSlotsForLevel(nextLevel) };
}

function saveUserDefenses(data) {
    try {
        fs.writeFileSync(DEFENSES_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Defenses] Erro ao salvar defesas:', err);
    }
}

function buyTroop(userId, troopKey, quantity = 1) {
    const { getBalance, subtractBalance } = require('./economy');
    const troops = loadUserTroops(userId);
    
    if (!DEFAULT_TROOPS[troopKey]) {
        return { success: false, error: 'Tropa inválida' };
    }
    
    const troop = DEFAULT_TROOPS[troopKey];
    const totalCost = troop.cost * quantity;
    const balance = getBalance(userId);
    
    if (balance < totalCost) {
        return { success: false, error: 'Saldo insuficiente' };
    }
    
    subtractBalance(userId, totalCost);
    
    if (!troops[userId]) {
        troops[userId] = {};
    }
    
    troops[userId][troopKey] = (troops[userId][troopKey] || 0) + quantity;
    saveUserTroops(troops);
    
    return { success: true, message: `Você comprou ${quantity}x ${troop.name}!` };
}

function buyDefense(userId, defenseKey, quantity = 1) {
    const { getBalance, subtractBalance } = require('./economy');
    const defenses = loadUserDefenses(userId);
    
    if (!DEFAULT_DEFENSES[defenseKey]) {
        return { success: false, error: 'Defesa inválida' };
    }
    
    const defense = DEFAULT_DEFENSES[defenseKey];
    const totalCost = defense.cost * quantity;
    const balance = getBalance(userId);
    
    if (balance < totalCost) {
        return { success: false, error: 'Saldo insuficiente' };
    }
    
    subtractBalance(userId, totalCost);
    
    if (!defenses[userId]) {
        defenses[userId] = {};
    }
    
    defenses[userId][defenseKey] = (defenses[userId][defenseKey] || 0) + quantity;
    saveUserDefenses(defenses);
    
    return { success: true, message: `Você comprou ${quantity}x ${defense.name}!` };
}

function getAttackPower(userId) {
    const troops = loadUserTroops(userId);
    let totalAttack = 0;
    let totalHealth = 0;
    
    if (!troops[userId]) return { attack: 0, health: 0, troops: [] };
    
    const troopsList = [];
    Object.keys(troops[userId]).forEach(troopKey => {
        const quantity = troops[userId][troopKey];
        if (quantity > 0) {
            const troopData = DEFAULT_TROOPS[troopKey];
            totalAttack += quantity * troopData.attack;
            totalHealth += quantity * troopData.health;
            troopsList.push({ key: troopKey, quantity, ...troopData });
        }
    });
    
    return { attack: totalAttack, health: totalHealth, troops: troopsList };
}

function getDefensePower(userId) {
    const defenses = loadUserDefenses(userId);
    let totalDefense = 0;
    let totalDurability = 0;
    
    if (!defenses[userId]) return { defense: 0, durability: 0, defenses: [] };
    
    const defensesList = [];
    Object.keys(defenses[userId]).forEach(defenseKey => {
        const quantity = defenses[userId][defenseKey];
        if (quantity > 0) {
            const defenseData = DEFAULT_DEFENSES[defenseKey];
            totalDefense += quantity * defenseData.defense;
            totalDurability += quantity * defenseData.durability;
            defensesList.push({ key: defenseKey, quantity, ...defenseData });
        }
    });
    
    return { defense: totalDefense, durability: totalDurability, defenses: defensesList };
}

function describePassive(userId) {
    const base = getBaseInfo(userId);
    if (!base.buildings || base.buildings.length === 0) {
        return { summary: 'Nenhuma construção.', totalPending: 0 };
    }
    const now = Date.now();
    let totalPending = 0;
    const lines = base.buildings.map(b => {
        const cfg = PASSIVE_BUILDINGS[b.type];
        if (!cfg) return null;
        const interval = cfg.intervalMinutes * 60 * 1000;
        const cycles = Math.floor((now - b.lastCollected) / interval);
        const pending = cycles > 0 ? cycles * cfg.gold : 0;
        totalPending += pending;
        const nextInMs = interval - ((now - b.lastCollected) % interval);
        const nextMinutes = Math.max(0, Math.floor(nextInMs / 60000));
        return `${cfg.emoji} ${cfg.name} - rende ${cfg.gold} a cada ${cfg.intervalMinutes}m | pendente: ${pending} | próximo em ~${nextMinutes}m`;
    }).filter(Boolean);

    return { summary: lines.join('\n'), totalPending };
}

function canAttack(userId) {
    try {
        const cooldowns = fs.existsSync(COOLDOWNS_FILE) 
            ? JSON.parse(fs.readFileSync(COOLDOWNS_FILE, 'utf8'))
            : {};
        
        if (!cooldowns[userId]) return { allowed: true, timeLeft: 0 };
        
        const lastAttack = cooldowns[userId];
        const now = Date.now();
        const cooldownTime = 30 * 60 * 1000; // 30 minutos
        const diff = now - lastAttack;
        
        if (diff >= cooldownTime) {
            return { allowed: true, timeLeft: 0 };
        }
        
        return { allowed: false, timeLeft: cooldownTime - diff };
    } catch (err) {
        return { allowed: true, timeLeft: 0 };
    }
}

function recordAttack(userId) {
    try {
        const cooldowns = fs.existsSync(COOLDOWNS_FILE) 
            ? JSON.parse(fs.readFileSync(COOLDOWNS_FILE, 'utf8'))
            : {};
        
        cooldowns[userId] = Date.now();
        fs.writeFileSync(COOLDOWNS_FILE, JSON.stringify(cooldowns, null, 2), 'utf8');
    } catch (err) {
        console.error('[Clash] Erro ao registrar ataque:', err);
    }
}

function simulateBattle(attackerData, defenderData, attackerId, defenderId) {
    const { hasEffect, getEffectValue } = require('./effects');
    
    let attackerHP = attackerData.health;
    let defenderHP = defenderData.durability;
    
    // Aplicar boosts
    if (hasEffect(attackerId, 'health_boost')) {
        attackerHP += getEffectValue(attackerId, 'health_boost') || 0;
    }
    
    if (hasEffect(defenderData, 'health_boost')) {
        defenderHP += getEffectValue(defenderId, 'health_boost') || 0;
    }
    
    const battleLog = [];
    let round = 1;
    let immunityUsed = false;
    
    // Simular batalha em rodadas
    while (attackerHP > 0 && defenderHP > 0 && round <= 10) {
        // Ataque do atacante
        let damage = attackerData.attack;
        
        // Aplicar boost de dano
        if (hasEffect(attackerId, 'damage_boost')) {
            const damageBoost = getEffectValue(attackerId, 'damage_boost') || 0;
            damage = Math.floor(damage * (1 + damageBoost / 100));
        }
        
        // Aplicar buff eterno
        if (hasEffect(attackerId, 'eternal_buff')) {
            damage = Math.floor(damage * 1.25);
        }
        
        // Aplicar especiais das defesas
        let defenseReduction = Math.floor(damage * (defenderData.defense / (defenderData.defense + 200)));
        
        // Buff de defesa eterno reduz dano
        if (hasEffect(defenderId, 'eternal_buff')) {
            defenseReduction = Math.floor(defenseReduction * 1.25);
        }
        
        damage -= defenseReduction;
        damage = Math.max(1, damage); // Mínimo 1 de dano
        
        // Verificar imunidade
        if (hasEffect(defenderId, 'immunity') && !immunityUsed) {
            battleLog.push(`🛡️ Rodada ${round}: Defesa IMUNE! Ataque bloqueado!`);
            immunityUsed = true;
            round++;
            continue;
        }
        
        defenderHP -= damage;
        battleLog.push(`⚔️ Rodada ${round}: Suas tropas causaram ${damage} de dano!`);
        
        if (defenderHP <= 0) {
            battleLog.push('✅ Defesas destruídas!');
            break;
        }
        
        // Contra-ataque das defesas
        const counterAttack = Math.floor(defenderData.defense * 0.3);
        attackerHP -= counterAttack;
        battleLog.push(`🛡️ Defesas contra-atacaram causando ${counterAttack} de dano!`);
        
        if (attackerHP <= 0) {
            battleLog.push('❌ Suas tropas foram derrotadas!');
            break;
        }
        
        round++;
    }
    
    const attackerWon = attackerHP > 0;
    const stars = attackerWon ? Math.max(1, Math.min(3, Math.floor((attackerHP / attackerData.health) * 3))) : 0;
    
    return {
        won: attackerWon,
        stars,
        attackerHPLeft: Math.max(0, attackerHP),
        defenderHPLeft: Math.max(0, defenderHP),
        battleLog,
        rounds: round - 1
    };
}

function attack(attackerId, defenderId) {
    const { getBalance, subtractBalance, addBalance } = require('./economy');
    const { hasEffect, getEffectValue } = require('./effects');
    
    const { allowed, timeLeft } = canAttack(attackerId);
    if (!allowed) {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        return { 
            success: false, 
            error: `Você precisa esperar ${minutes}m ${seconds}s para atacar novamente!`
        };
    }
    
    const attackerPower = getAttackPower(attackerId);
    const defenderPower = getDefensePower(defenderId);
    
    if (attackerPower.attack === 0) {
        return { success: false, error: 'Você não tem tropas!' };
    }
    
    // Simular batalha com efeitos
    const battle = simulateBattle(attackerPower, defenderPower, attackerId, defenderId);
    
    let stolen = 0;
    if (battle.won) {
        const defenderBalance = getBalance(defenderId);
        const maxSteal = Math.floor(defenderBalance * 0.25); // 25% máximo
        let baseSteal = Math.floor(attackerPower.attack * battle.stars * 0.8);
        
        // Multiplicador de saque
        if (hasEffect(attackerId, 'steal_multiplier')) {
            const multiplier = getEffectValue(attackerId, 'steal_multiplier');
            baseSteal = Math.floor(baseSteal * multiplier);
        }
        
        stolen = Math.min(baseSteal, maxSteal);
        
        if (stolen > 0) {
            subtractBalance(defenderId, stolen);
            addBalance(attackerId, stolen);
        }
    }
    
    recordAttack(attackerId);
    
    // Salvar log de batalha
    saveBattleLog(attackerId, defenderId, battle, stolen);
    
    return { 
        success: true, 
        won: battle.won,
        stolen,
        stars: battle.stars,
        battleLog: battle.battleLog,
        rounds: battle.rounds
    };
}

function saveBattleLog(attackerId, defenderId, battle, stolen) {
    try {
        const logs = fs.existsSync(BATTLE_LOG_FILE) 
            ? JSON.parse(fs.readFileSync(BATTLE_LOG_FILE, 'utf8'))
            : [];
        
        logs.unshift({
            timestamp: Date.now(),
            attacker: attackerId,
            defender: defenderId,
            won: battle.won,
            stars: battle.stars,
            stolen,
            rounds: battle.rounds
        });
        
        // Manter apenas os últimos 50 logs
        if (logs.length > 50) logs.splice(50);
        
        fs.writeFileSync(BATTLE_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
        console.error('[Clash] Erro ao salvar log:', err);
    }
}

function getUserTroopsInfo(userId) {
    const data = getAttackPower(userId);
    
    let info = '';
    data.troops.forEach(troop => {
        info += `${troop.emoji} **${troop.name}** x${troop.quantity}\n`;
        info += `   ⚔️ Ataque: ${troop.attack * troop.quantity} | ❤️ Vida: ${troop.health * troop.quantity}\n`;
        info += `   ✨ ${troop.special}\n\n`;
    });
    
    return { 
        info: info || 'Nenhuma tropa adquirida', 
        attack: data.attack,
        health: data.health
    };
}

function getUserDefensesInfo(userId) {
    const data = getDefensePower(userId);
    
    let info = '';
    data.defenses.forEach(defense => {
        info += `${defense.emoji} **${defense.name}** x${defense.quantity}\n`;
        info += `   🛡️ Defesa: ${defense.defense * defense.quantity} | 💪 Resistência: ${defense.durability * defense.quantity}\n`;
        info += `   ✨ ${defense.special}\n\n`;
    });
    
    return { 
        info: info || 'Nenhuma defesa adquirida', 
        defense: data.defense,
        durability: data.durability
    };
}

// Expor também slots e construções na interface externa

module.exports = {
    DEFAULT_TROOPS,
    DEFAULT_DEFENSES,
    PASSIVE_BUILDINGS,
    buyTroop,
    buyDefense,
    getAttackPower,
    getDefensePower,
    attack,
    getUserTroopsInfo,
    getUserDefensesInfo,
    addTroops,
    addDefenses,
    buildPassive,
    collectPassive,
    upgradeTownHall,
    getBaseInfo,
    describePassive
};

function addTroops(userId, troopKey, quantity = 1) {
    const troops = loadUserTroops(userId);
    
    if (!DEFAULT_TROOPS[troopKey]) {
        return { success: false, error: 'Tropa inválida' };
    }
    
    if (!troops[userId]) {
        troops[userId] = {};
        Object.keys(DEFAULT_TROOPS).forEach(key => {
            troops[userId][key] = 0;
        });
    }
    
    troops[userId][troopKey] += quantity;
    saveUserTroops(troops);
    
    return { success: true, quantity, troop: DEFAULT_TROOPS[troopKey].name };
}

function addDefenses(userId, defenseKey, quantity = 1) {
    const defenses = loadUserDefenses(userId);
    
    if (!DEFAULT_DEFENSES[defenseKey]) {
        return { success: false, error: 'Defesa inválida' };
    }
    
    if (!defenses[userId]) {
        defenses[userId] = {};
        Object.keys(DEFAULT_DEFENSES).forEach(key => {
            defenses[userId][key] = 0;
        });
    }
    
    defenses[userId][defenseKey] += quantity;
    saveUserDefenses(defenses);
    
    return { success: true, quantity, defense: DEFAULT_DEFENSES[defenseKey].name };
}
