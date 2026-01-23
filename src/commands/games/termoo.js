const fs = require('fs');
const path = require('path');
const { addBalance } = require('../../services/economy');
const { EmbedBuilder } = require('discord.js');

const DATA_FILE = path.join(__dirname, '..', '..', '..', 'termoo.json');
const WORDS = [
    'CASA', 'TRONO', 'LIVRO', 'MAGIA', 'CIVIL', 'NOBRE', 'AREIA', 'CARRO', 'MOUSE', 'FORCA', 'BOTAO', 'PEDRA',
    'METAL', 'FOGO', 'NINJA', 'CARTA', 'FRUTO', 'VIDRO', 'PLUMA', 'PRAIA', 'TORRE', 'LANCE', 'FESTA', 'NARIZ',
    'AMIGO', 'CAMPO', 'PORTA', 'FLORE', 'SABER', 'DENTE', 'NIVEL', 'SONHO', 'RITMO', 'CURVA', 'RUGIR', 'LIMAO',
    'MUITO', 'POUCO', 'TRECO', 'COISA', 'TEMPO', 'GRANA', 'NOITE', 'FARDO', 'FUGIR', 'RISCO', 'VELHO'
];

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return null;
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('[Termoo] Erro ao ler dados', err);
        return null;
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Termoo] Erro ao salvar dados', err);
    }
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function ensureTodayData() {
    let data = loadData();
    const current = today();
    if (!data || data.date !== current) {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const log = (data && data.log) ? data.log : [];
        log.unshift({ date: current, word });
        if (log.length > 30) log.length = 30;
        data = { date: current, word, winners: [], attempts: {}, log };
        saveData(data);
    } else {
        // garantir campos para dias já existentes
        if (!data.winners) data.winners = [];
        if (!data.attempts) data.attempts = {};
        if (Array.isArray(data.attempts)) {
            // migração de formato antigo (array de ids) para objeto
            const migrated = {};
            data.attempts.forEach(uid => migrated[uid] = []);
            data.attempts = migrated;
        }
        if (!data.log) data.log = [];
    }
    return data;
}

function scoreGuess(guess, target) {
    // Both uppercase 5 letters
    const feedback = [];
    const targetArr = target.split('');
    const used = Array(5).fill(false);

    // First pass greens
    for (let i = 0; i < 5; i++) {
        if (guess[i] === target[i]) {
            feedback[i] = '🟩';
            used[i] = true;
        }
    }
    // Yellows / blacks
    for (let i = 0; i < 5; i++) {
        if (feedback[i]) continue;
        const idx = targetArr.findIndex((ch, j) => ch === guess[i] && !used[j]);
        if (idx >= 0) {
            feedback[i] = '🟨';
            used[idx] = true;
        } else {
            feedback[i] = '⬛';
        }
    }
    return feedback.join('');
}

function formatBoard(attempts) {
    if (!attempts.length) return 'Nenhum palpite ainda.';
    return attempts
    .map(a => `${a.guess.split('').join(' ')}\n${a.feedback}`)
        .join('\n');
}

module.exports = {
    data: {
        name: 'termoo'
    },

    async execute(interaction) {
        const palpiteRaw = interaction.options.getString('palpite');
        const palpite = (palpiteRaw || '').trim().toUpperCase();

        if (!palpite || palpite.length !== 5) {
            return interaction.reply({ content: '❌ Informe uma palavra de 5 letras (qualquer palavra do português).', ephemeral: true });
        }

        const data = ensureTodayData();
        const target = data.word;

        if (data.winners.includes(interaction.user.id)) {
            return interaction.reply({ content: '✅ Você já acertou a palavra de hoje. Aguarde a próxima!', ephemeral: true });
        }

        const userAttempts = data.attempts[interaction.user.id] || [];
        if (userAttempts.length >= 6) {
            const board = formatBoard(userAttempts);
            return interaction.reply({ content: `⏳ Você já usou suas 6 tentativas hoje.\n\u0060\u0060\u0060\n${board}\n\u0060\u0060\u0060`, ephemeral: true });
        }

        const feedback = scoreGuess(palpite, target);
        const attemptsNow = [...userAttempts, { guess: palpite, feedback }];
        data.attempts[interaction.user.id] = attemptsNow;
        const board = formatBoard(attemptsNow);

        const embed = new EmbedBuilder()
            .setColor('#00AAFF')
            .setTitle('🧠 Termoo diário')
            .setDescription(`\u0060\u0060\u0060\n${board}\n\u0060\u0060\u0060`)
            .addFields(
                { name: 'Tentativas', value: `${attemptsNow.length}/6`, inline: true },
                { name: 'Legenda', value: '🟩 posição correta | 🟨 letra em outra posição | ⬛ não existe na palavra', inline: false }
            )
            .setFooter({ text: `Palavra do dia: ${data.date}` });

        if (palpite === target) {
            const place = data.winners.length; // 0-based
            let prize = 0;
            if (place === 0) prize = 200;
            else if (place === 1) prize = 100;
            else if (place === 2) prize = 50;

            data.winners.push(interaction.user.id);
            saveData(data);

            if (prize > 0) {
                addBalance(interaction.user.id, prize);
            }

            embed.setColor('#00FF00');
            embed.addFields({ name: 'Resultado', value: `🎉 Palavra descoberta!` });
            embed.addFields({ name: 'Prêmio', value: prize > 0 ? `+${prize} moedas (posição ${place + 1})` : 'Sem prêmio (após top 3)' });

            saveData(data);

            // mensagem pública com prêmio e próximos valores
            const remainingPrizes = place === 0 ? 'Próximo: 100, depois 50.' : place === 1 ? 'Próximo: 50.' : 'Prêmios do dia esgotados.';
            const publicMsg = `<@${interaction.user.id}> acertou o Termoo do dia e ganhou ${prize} moedas! ${remainingPrizes}`;
            if (interaction.channel) {
                interaction.channel.send({ content: publicMsg }).catch(() => {});
            }

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        saveData(data);

        if (attemptsNow.length >= 6) {
            embed.addFields({ name: 'Status', value: '⚠️ Tentativas esgotadas. Volte amanhã.' });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
