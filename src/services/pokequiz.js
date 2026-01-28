const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Jimp = require('jimp');
const { fetchPokemonInfo } = require('./mokenpo');
const { addBalance } = require('./economy');

const STATE_FILE = path.join(__dirname, '..', '..', 'pokequiz_state.json');
const PRIZES = [1000, 500, 250];
let lastPokemonId = null;

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('[PokeQuiz] Erro ao ler estado', err);
    }
    return { challenges: [] };
}

function saveState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
        console.error('[PokeQuiz] Erro ao salvar estado', err);
    }
}

function normalize(name) {
    return (name || '').trim().toLowerCase();
}

async function pickRandomPokemon(genMin = 1, genMax = 9) {
    for (let i = 0; i < 25; i++) {
        const id = Math.floor(Math.random() * 1010) + 1;
        if (lastPokemonId && id === lastPokemonId && i < 24) continue;
        const info = await fetchPokemonInfo(id);
        if (!info?.generationNum || info.generationNum < genMin || info.generationNum > genMax) continue;
        if (!info.sprite) continue;
        lastPokemonId = id;
        return info;
    }
    throw new Error('no_pokemon_in_range');
}

async function makeSilhouette(spriteUrl) {
    const res = await fetch(spriteUrl);
    if (!res.ok) throw new Error('sprite_fetch_failed');
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await Jimp.read(buf);

    const silhouetteColor = { r: 11, g: 94, b: 215 };
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function scanSilhouette(x, y, idx) {
        const alpha = this.bitmap.data[idx + 3];
        if (alpha > 10) {
            this.bitmap.data[idx] = silhouetteColor.r;
            this.bitmap.data[idx + 1] = silhouetteColor.g;
            this.bitmap.data[idx + 2] = silhouetteColor.b;
            this.bitmap.data[idx + 3] = alpha;
        } else {
            this.bitmap.data[idx + 3] = 0;
        }
    });

    const pad = 60;
    const bg = new Jimp(img.bitmap.width + pad * 2, img.bitmap.height + pad * 2, '#f8fafc');
    bg.composite(img, pad, pad, { mode: Jimp.BLEND_SOURCE_OVER });

    return bg.getBufferAsync(Jimp.MIME_PNG);
}

function remainingPrizes(count) {
    const rem = [];
    for (let i = count; i < PRIZES.length; i++) rem.push(PRIZES[i]);
    return rem;
}

async function startChallenge(client, channelId, genMin = 1, genMax = 9) {
    const state = loadState();
    const pokemon = await pickRandomPokemon(genMin, genMax);
    const buffer = await makeSilhouette(pokemon.sprite);
    const attachment = new AttachmentBuilder(buffer, { name: 'pokemon-sombra.png' });

    const challengeId = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const buttonId = `qualpoke:guess:${challengeId}`;

    const embed = new EmbedBuilder()
        .setColor('#0d1117')
        .setTitle('Qual é esse Pokémon?')
        .setDescription('Clique no botão e dê seu palpite. Os 3 primeiros ganham moedas!')
        .addFields(
            { name: 'Prêmios', value: '1º 1000 | 2º 500 | 3º 250' },
            { name: 'Geração', value: `Entre ${genMin} e ${genMax}` }
        )
        .setImage('attachment://pokemon-sombra.png');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(buttonId).setLabel('Dar palpite').setStyle(ButtonStyle.Primary)
    );

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) throw new Error('invalid_channel');

    const message = await channel.send({ embeds: [embed], files: [attachment], components: [row] });

    state.challenges.push({
        id: challengeId,
        channelId,
        messageId: message.id,
        pokemon: { id: pokemon.id, name: pokemon.name, sprite: pokemon.sprite },
        genMin,
        genMax,
        winners: [],
        createdAt: Date.now(),
    });
    saveState(state);

    return { challengeId, messageId: message.id, channelId, pokemonName: pokemon.name };
}

function getChallenge(id) {
    const state = loadState();
    return state.challenges.find(c => c.id === id);
}

function updateChallenge(challenge) {
    const state = loadState();
    const idx = state.challenges.findIndex(c => c.id === challenge.id);
    if (idx >= 0) {
        state.challenges[idx] = challenge;
        saveState(state);
    }
}

async function submitGuess(challengeId, userId, userTag, guessName) {
    const stateChallenge = getChallenge(challengeId);
    if (!stateChallenge) throw new Error('challenge_not_found');

    const guessInfo = await fetchPokemonInfo(guessName);
    const correct = normalize(guessInfo.name) === normalize(stateChallenge.pokemon.name);

    let prize = 0;
    let position = null;
    let alreadyWinner = false;

    if (correct) {
        const existing = stateChallenge.winners.find(w => w.userId === userId);
        if (existing) {
            alreadyWinner = true;
        } else {
            position = stateChallenge.winners.length;
            prize = PRIZES[position] || 0;
            stateChallenge.winners.push({ userId, userTag, prize });
            if (prize > 0) addBalance(userId, prize);
            updateChallenge(stateChallenge);
        }
    }

    return {
        correct,
        prize,
        position,
        alreadyWinner,
        remaining: remainingPrizes(stateChallenge.winners.length),
        targetName: stateChallenge.pokemon.name,
        guessName: guessInfo.name,
        channelId: stateChallenge.channelId,
    };
}

module.exports = {
    startChallenge,
    submitGuess,
    remainingPrizes,
};
