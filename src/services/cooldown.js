const fs = require('fs');
const path = require('path');

const COOLDOWN_FILE = path.join(__dirname, '..', '..', 'cooldowns.json');

function loadCooldowns() {
    try {
        if (fs.existsSync(COOLDOWN_FILE)) {
            const data = fs.readFileSync(COOLDOWN_FILE, 'utf8');
            const parsed = JSON.parse(data);
            // migração: formato antigo era { userId: timestamp }
            if (!parsed.daily && Object.values(parsed).every(v => typeof v === 'number')) {
                return { daily: parsed, weekly: {}, monthly: {} };
            }
            if (!parsed.daily) parsed.daily = {};
            if (!parsed.weekly) parsed.weekly = {};
            if (!parsed.monthly) parsed.monthly = {};
            return parsed;
        }
    } catch (err) {
        console.error('[Cooldown] Erro ao carregar cooldowns:', err);
    }
    return { daily: {}, weekly: {}, monthly: {} };
}

function saveCooldowns(cooldowns) {
    try {
        fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2), 'utf8');
    } catch (err) {
        console.error('[Cooldown] Erro ao salvar cooldowns:', err);
    }
}

function ensureBuckets(cooldowns) {
    if (!cooldowns.daily) cooldowns.daily = {};
    if (!cooldowns.weekly) cooldowns.weekly = {};
    if (!cooldowns.monthly) cooldowns.monthly = {};
}

function canUseGeneric(userId, bucket, intervalMs) {
    const cooldowns = loadCooldowns();
    ensureBuckets(cooldowns);

    const lastUsed = cooldowns[bucket][userId];
    if (!lastUsed) return { allowed: true, timeLeft: 0 };

    const diff = Date.now() - lastUsed;
    if (diff >= intervalMs) return { allowed: true, timeLeft: 0 };

    return { allowed: false, timeLeft: intervalMs - diff };
}

function recordGeneric(userId, bucket) {
    const cooldowns = loadCooldowns();
    ensureBuckets(cooldowns);
    cooldowns[bucket][userId] = Date.now();
    saveCooldowns(cooldowns);
}

function canUseSalario(userId) {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return canUseGeneric(userId, 'daily', twentyFourHours);
}

function recordSalarioUse(userId) {
    return recordGeneric(userId, 'daily');
}

function canUseWeekly(userId) {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return canUseGeneric(userId, 'weekly', oneWeek);
}

function recordWeeklyUse(userId) {
    return recordGeneric(userId, 'weekly');
}

function canUseMonthly(userId) {
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    return canUseGeneric(userId, 'monthly', oneMonth);
}

function recordMonthlyUse(userId) {
    return recordGeneric(userId, 'monthly');
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
    canUseWeekly,
    recordWeeklyUse,
    canUseMonthly,
    recordMonthlyUse,
    formatTimeLeft,
};
