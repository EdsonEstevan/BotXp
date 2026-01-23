const fs = require('fs');
const path = require('path');

const COOLDOWN_FILE = path.join(__dirname, '..', '..', 'cooldowns.json');

function loadCooldowns() {
    try {
        if (fs.existsSync(COOLDOWN_FILE)) {
            const data = fs.readFileSync(COOLDOWN_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[Cooldown] Erro ao carregar cooldowns:', err);
    }
    return {};
}

function saveCooldowns(cooldowns) {
    try {
        fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2), 'utf8');
    } catch (err) {
        console.error('[Cooldown] Erro ao salvar cooldowns:', err);
    }
}

function canUseSalario(userId) {
    const cooldowns = loadCooldowns();
    
    if (!cooldowns[userId]) {
        return { allowed: true, timeLeft: 0 };
    }
    
    const lastUsed = cooldowns[userId];
    const now = Date.now();
    const diff = now - lastUsed;
    const twentyFourHours = 24 * 60 * 60 * 1000; // 86400000ms
    
    if (diff >= twentyFourHours) {
        return { allowed: true, timeLeft: 0 };
    }
    
    const timeLeft = twentyFourHours - diff;
    return { allowed: false, timeLeft };
}

function recordSalarioUse(userId) {
    const cooldowns = loadCooldowns();
    cooldowns[userId] = Date.now();
    saveCooldowns(cooldowns);
}

function formatTimeLeft(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
    canUseSalario,
    recordSalarioUse,
    formatTimeLeft,
};
