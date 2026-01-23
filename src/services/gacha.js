const fs = require('fs');
const path = require('path');

const GACHA_DATA_FILE = path.join(__dirname, '..', '..', 'gacha.json');
const GACHA_LOG_FILE = path.join(__dirname, '..', '..', 'gacha_log.json');

// Itens do Gacha por raridade
const GACHA_ITEMS = {
    // Comum - 50% de chance
    common: [
        { name: 'Moedas Douradas', type: 'coins', value: 150, emoji: '🪙', description: '+150 moedas' },
        { name: 'Moedas Douradas', type: 'coins', value: 150, emoji: '🪙', description: '+150 moedas' },
        { name: 'Poção de Vida', type: 'potion', value: 50, emoji: '🧪', description: 'Restaura 50 HP em próxima batalha' },
        { name: 'Poção de Força', type: 'potion', value: 30, emoji: '💪', description: '+30% de dano no próximo ataque' },
        { name: 'Scroll Antigo', type: 'scroll', value: 100, emoji: '📜', description: '+100 XP' },
        { name: 'Mapa do Tesouro', type: 'coins', value: 200, emoji: '🗺️', description: '+200 moedas' },
    ],
    
    // Raro - 30% de chance
    rare: [
        { name: 'Goblin Premium', type: 'unit', unit: 'goblin', quantity: 3, emoji: '👺✨', description: 'Goblin x3 + 10% de ataque' },
        { name: 'Arqueiro Elite', type: 'unit', unit: 'arqueiro', quantity: 2, emoji: '🏹✨', description: 'Arqueiro x2 com +esquiva' },
        { name: 'Multiplicador 1.5x', type: 'multiplier', value: 1.5, emoji: '📈', description: '+50% em próximas 3 batalhas' },
        { name: 'Tesouro Encontrado', type: 'coins', value: 500, emoji: '💎', description: '+500 moedas' },
        { name: 'Baú do Pirata', type: 'coins', value: 400, emoji: '🏴‍☠️', description: '+400 moedas' },
        { name: 'Fragmento Misterioso', type: 'fragment', value: 1, emoji: '✨', description: '+1 fragmento (colecione 5!)' },
    ],
    
    // Épico - 15% de chance
    epic: [
        { name: 'Bárbaro Lendário', type: 'unit', unit: 'barbaro', quantity: 3, emoji: '⚔️✨', description: 'Bárbaro x3 com +crítico' },
        { name: 'Muro Ancestral', type: 'defense', defense: 'muro', quantity: 5, emoji: '🧱✨', description: 'Muro x5 fortificado' },
        { name: 'Torre de Cristal', type: 'defense', defense: 'torre', quantity: 3, emoji: '🗼✨', description: 'Torre x3 com reflexo' },
        { name: 'Poção Suprema', type: 'potion', value: 100, emoji: '🧴', description: 'Restaura 100 HP + imunidade 1 ataque' },
        { name: 'Riqueza Ancestral', type: 'coins', value: 1000, emoji: '👑', description: '+1000 moedas' },
        { name: 'Símbolo do Poder', type: 'symbol', value: 1, emoji: '⭐', description: '+1 símbolo de poder' },
    ],
    
    // Lendário - 5% de chance
    legendary: [
        { name: 'Dragão Furioso', type: 'unit', unit: 'dragao', quantity: 2, emoji: '🐉🔥', description: 'Dragão x2 LENDÁRIO com +50% dano' },
        { name: 'Fortaleza Impenetrável', type: 'defense', defense: 'fortaleza', quantity: 3, emoji: '🛡️✨', description: 'Fortaleza x3 com escudo eterno' },
        { name: 'Elixir da Eternidade', type: 'potion', value: 500, emoji: '🏺', description: 'Buff permanente +25% ataque/defesa' },
        { name: 'Tesouro do Imperador', type: 'coins', value: 5000, emoji: '👑💎', description: '+5000 moedas LENDÁRIO' },
        { name: 'Chave do Destino', type: 'key', value: 1, emoji: '🔑✨', description: 'Desbloqueia sala secreta' },
    ]
};

function getGachaRarity() {
    const rand = Math.random();
    
    if (rand < 0.50) return 'common';
    if (rand < 0.80) return 'rare';
    if (rand < 0.95) return 'epic';
    return 'legendary';
}

function pullGacha(userId, quantity = 1) {
    const results = [];
    
    for (let i = 0; i < quantity; i++) {
        const rarity = getGachaRarity();
        const items = GACHA_ITEMS[rarity];
        const item = items[Math.floor(Math.random() * items.length)];
        
        results.push({
            ...item,
            rarity,
            timestamp: Date.now(),
            id: `${userId}_${Date.now()}_${i}`
        });
    }
    
    // Salvar itens ao inventário do usuário
    const inventory = loadUserInventory(userId);
    results.forEach(item => {
        if (!inventory[userId]) inventory[userId] = [];
        inventory[userId].push(item);
    });
    saveInventory(inventory);
    
    // Registrar log
    savePullLog(userId, results);
    
    return results;
}

function loadUserInventory(userId) {
    try {
        if (!fs.existsSync(GACHA_DATA_FILE)) {
            return {};
        }
        const data = JSON.parse(fs.readFileSync(GACHA_DATA_FILE, 'utf8'));
        return data;
    } catch (err) {
        console.error('[Gacha] Erro ao carregar inventário:', err);
        return {};
    }
}

function saveInventory(inventory) {
    try {
        fs.writeFileSync(GACHA_DATA_FILE, JSON.stringify(inventory, null, 2), 'utf8');
    } catch (err) {
        console.error('[Gacha] Erro ao salvar inventário:', err);
    }
}

function savePullLog(userId, results) {
    try {
        const logs = fs.existsSync(GACHA_LOG_FILE)
            ? JSON.parse(fs.readFileSync(GACHA_LOG_FILE, 'utf8'))
            : [];
        
        logs.unshift({
            userId,
            timestamp: Date.now(),
            pulls: results.length,
            results: results.map(r => ({ name: r.name, rarity: r.rarity }))
        });
        
        if (logs.length > 100) logs.splice(100);
        
        fs.writeFileSync(GACHA_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
        console.error('[Gacha] Erro ao salvar log:', err);
    }
}

function getUserInventory(userId) {
    const inventory = loadUserInventory(userId);
    return inventory[userId] || [];
}

function getInventorySummary(userId) {
    const items = getUserInventory(userId);
    
    const summary = {
        common: items.filter(i => i.rarity === 'common').length,
        rare: items.filter(i => i.rarity === 'rare').length,
        epic: items.filter(i => i.rarity === 'epic').length,
        legendary: items.filter(i => i.rarity === 'legendary').length,
        total: items.length
    };
    
    return summary;
}

function claimItem(userId, itemId) {
    const inventory = loadUserInventory(userId);
    const userItems = inventory[userId] || [];
    
    const itemIndex = userItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return { success: false, error: 'Item não encontrado!' };
    
    const item = userItems[itemIndex];
    const { addEffect } = require('./effects');
    
    // Aplicar efeito do item
    if (item.type === 'coins') {
        const { addBalance } = require('./economy');
        addBalance(userId, item.value);
    }
    
    if (item.type === 'potion') {
        // Poção de Vida: +50 HP na próxima batalha
        if (item.name === 'Poção de Vida') {
            addEffect(userId, 'health_boost', 24 * 60 * 60 * 1000, 50);
        }
        // Poção de Força: +30% dano
        else if (item.name === 'Poção de Força') {
            addEffect(userId, 'damage_boost', 24 * 60 * 60 * 1000, 30);
        }
        // Poção Suprema: +100 HP + imunidade
        else if (item.name === 'Poção Suprema') {
            addEffect(userId, 'health_boost', 24 * 60 * 60 * 1000, 100);
            addEffect(userId, 'immunity', 24 * 60 * 60 * 1000);
        }
        // Elixir da Eternidade: +25% buff permanente
        else if (item.name === 'Elixir da Eternidade') {
            addEffect(userId, 'eternal_buff', null, 25); // Permanente!
        }
    }
    
    if (item.type === 'unit') {
        const { addTroops } = require('./clash');
        if (addTroops) {
            addTroops(userId, item.unit, item.quantity);
        }
    }
    
    if (item.type === 'defense') {
        const { addDefenses } = require('./clash');
        if (addDefenses) {
            addDefenses(userId, item.defense, item.quantity);
        }
    }
    
    if (item.type === 'multiplier') {
        // Multiplicador 1.5x por 3 batalhas
        addEffect(userId, 'steal_multiplier', 3 * 24 * 60 * 60 * 1000, item.value);
    }
    
    if (item.type === 'fragment') {
        // Fragmentos podem ser coletados (implementar sistema de coleção depois)
        addEffect(userId, 'fragment_collected', null, item.value);
    }
    
    if (item.type === 'key') {
        // Chave do Destino - desbloqueia sala secreta
        addEffect(userId, 'secret_room_unlocked', null);
    }
    
    if (item.type === 'symbol') {
        // Símbolo de poder - buff permanente
        addEffect(userId, 'power_symbol', null, item.value);
    }
    
    // Remover do inventário
    userItems.splice(itemIndex, 1);
    inventory[userId] = userItems;
    saveInventory(inventory);
    
    return { success: true, item };
}

function formatItemCard(item) {
    const rarityColors = {
        common: '⚪',
        rare: '🔵',
        epic: '🟣',
        legendary: '🟡'
    };
    
    const rarityEmoji = rarityColors[item.rarity] || '⚪';
    
    return `${rarityEmoji} **${item.name}** ${item.emoji}\n*${item.description}*`;
}

module.exports = {
    pullGacha,
    getUserInventory,
    getInventorySummary,
    claimItem,
    formatItemCard,
    GACHA_ITEMS
};
