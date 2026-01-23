const fs = require('fs');
const path = require('path');

const ECONOMY_FILE = path.join(__dirname, '..', '..', 'economy.json');

function loadEconomy() {
    try {
        if (fs.existsSync(ECONOMY_FILE)) {
            const data = fs.readFileSync(ECONOMY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[Economy] Erro ao carregar economia:', err);
    }
    return {};
}

function saveEconomy(economy) {
    try {
        fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2), 'utf8');
    } catch (err) {
        console.error('[Economy] Erro ao salvar economia:', err);
    }
}

function getBalance(userId) {
    const economy = loadEconomy();
    
    if (!economy[userId]) {
        economy[userId] = {
            balance: 100,
            joined: new Date().toISOString(),
        };
        saveEconomy(economy);
    }
    
    return economy[userId].balance;
}

function addBalance(userId, amount) {
    const economy = loadEconomy();
    
    if (!economy[userId]) {
        economy[userId] = {
            balance: 100,
            joined: new Date().toISOString(),
        };
    }
    
    economy[userId].balance += amount;
    saveEconomy(economy);
    
    return economy[userId].balance;
}

function subtractBalance(userId, amount) {
    const economy = loadEconomy();
    
    if (!economy[userId]) {
        economy[userId] = {
            balance: 100,
            joined: new Date().toISOString(),
        };
    }
    
    if (economy[userId].balance < amount) {
        return null; // Saldo insuficiente
    }
    
    economy[userId].balance -= amount;
    saveEconomy(economy);
    
    return economy[userId].balance;
}

function transfer(fromUserId, toUserId, amount) {
    const economy = loadEconomy();
    
    // Verificar se ambos os usuários existem
    if (!economy[fromUserId]) {
        economy[fromUserId] = {
            balance: 100,
            joined: new Date().toISOString(),
        };
    }
    
    if (!economy[toUserId]) {
        economy[toUserId] = {
            balance: 100,
            joined: new Date().toISOString(),
        };
    }
    
    // Verificar saldo suficiente
    if (economy[fromUserId].balance < amount) {
        return { success: false, error: 'Saldo insuficiente' };
    }
    
    economy[fromUserId].balance -= amount;
    economy[toUserId].balance += amount;
    saveEconomy(economy);
    
    return { success: true, fromBalance: economy[fromUserId].balance, toBalance: economy[toUserId].balance };
}

function getUserData(userId) {
    const economy = loadEconomy();
    
    if (!economy[userId]) {
        economy[userId] = {
            balance: 100,
            joined: new Date().toISOString(),
        };
        saveEconomy(economy);
    }
    
    return economy[userId];
}

function getTopUsers(limit = 10) {
    const economy = loadEconomy();
    const users = Object.entries(economy)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, limit);
    
    return users;
}

module.exports = {
    getBalance,
    addBalance,
    subtractBalance,
    transfer,
    getUserData,
    getTopUsers,
};
