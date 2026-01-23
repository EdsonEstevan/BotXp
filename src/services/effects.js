const fs = require('fs');
const path = require('path');

const EFFECTS_FILE = path.join(__dirname, '..', '..', 'user_effects.json');

function loadEffects() {
    try {
        if (!fs.existsSync(EFFECTS_FILE)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(EFFECTS_FILE, 'utf8'));
    } catch (err) {
        console.error('[Effects] Erro ao carregar efeitos:', err);
        return {};
    }
}

function saveEffects(effects) {
    try {
        fs.writeFileSync(EFFECTS_FILE, JSON.stringify(effects, null, 2), 'utf8');
    } catch (err) {
        console.error('[Effects] Erro ao salvar efeitos:', err);
    }
}

function addEffect(userId, effectType, duration = null, value = null) {
    const effects = loadEffects();
    
    if (!effects[userId]) {
        effects[userId] = [];
    }
    
    const effect = {
        type: effectType,
        startTime: Date.now(),
        duration: duration, // null = permanente
        value: value,
        id: `${Date.now()}_${Math.random()}`
    };
    
    effects[userId].push(effect);
    saveEffects(effects);
    
    return effect;
}

function removeEffect(userId, effectId) {
    const effects = loadEffects();
    
    if (!effects[userId]) return;
    
    effects[userId] = effects[userId].filter(e => e.id !== effectId);
    saveEffects(effects);
}

function getUserEffects(userId) {
    const effects = loadEffects();
    const userEffects = effects[userId] || [];
    
    // Remover efeitos expirados
    const now = Date.now();
    const active = userEffects.filter(e => {
        if (!e.duration) return true; // Efeitos permanentes
        return (now - e.startTime) < e.duration;
    });
    
    if (active.length !== userEffects.length) {
        effects[userId] = active;
        saveEffects(effects);
    }
    
    return active;
}

function hasEffect(userId, effectType) {
    const effects = getUserEffects(userId);
    return effects.some(e => e.type === effectType);
}

function getEffectValue(userId, effectType) {
    const effects = getUserEffects(userId);
    const effect = effects.find(e => e.type === effectType);
    return effect ? effect.value : null;
}

function getActiveEffectsDescription(userId) {
    const effects = getUserEffects(userId);
    
    if (effects.length === 0) return 'Nenhum efeito ativo';
    
    const descriptions = {
        'health_boost': '❤️ Boost de HP +50',
        'damage_boost': '⚔️ Boost de Dano +30%',
        'defense_boost': '🛡️ Boost de Defesa +25%',
        'eternal_buff': '✨ Buff Eterno +25% (Atq/Def)',
        'dodge_buff': '🎯 Esquiva +20%',
        'steal_multiplier': '💰 Saque x1.5',
        'immunity': '🛡️ Imunidade (próximo ataque)',
    };
    
    return effects
        .map(e => descriptions[e.type] || e.type)
        .join('\n');
}

module.exports = {
    addEffect,
    removeEffect,
    getUserEffects,
    hasEffect,
    getEffectValue,
    getActiveEffectsDescription
};
