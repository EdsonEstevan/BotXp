const fs = require('fs');
const path = require('path');
const { addBalance } = require('./economy');

const STATE_FILE = path.join(__dirname, '..', '..', 'mokenpo.json');
const LOG_FILE = path.join(__dirname, '..', '..', 'mokenpo_log.txt');
const SPECIES_FILE = path.join(__dirname, '..', '..', 'pokemon_list.json');
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3
const REWARD_TABLE = [1000, 500, 250];
const CONSOLATION = 50;
const MAX_RECENT_CACHE = 200; // cache de dados de pokemon

let cachedState = null;
const pokemonCache = new Map(); // name/id -> data
let cachedSpecies = null;

function brtNow() {
    return new Date(Date.now() - TZ_OFFSET_MS);
}

function dayKey(date = brtNow()) {
    return date.toISOString().slice(0, 10);
}

function monthName(date) {
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return meses[date.getUTCMonth()];
}

function loadState() {
    if (cachedState) return cachedState;
    if (!fs.existsSync(STATE_FILE)) {
        cachedState = { week: 1, weekStart: dayKey(), current: null, lastLogDay: null, lastLogWeek: null };
        return cachedState;
    }
    try {
        cachedState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        return cachedState;
    } catch (err) {
        console.error('[Mokenpo] Erro ao ler estado:', err);
        cachedState = { week: 1, weekStart: dayKey(), current: null, lastLogDay: null, lastLogWeek: null };
        return cachedState;
    }
}

function saveState(state) {
    cachedState = state;
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function daysBetween(aKey, bKey) {
    const a = new Date(aKey);
    const b = new Date(bKey);
    return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function ensureWeek(state, todayKey) {
    if (!state.weekStart) state.weekStart = todayKey;
    const diff = daysBetween(state.weekStart, todayKey);
    if (diff >= 7) {
        state.week += 1;
        state.weekStart = todayKey;
    }
}

function genNumber(genName) {
    if (!genName) return 0;
    const map = {
        'generation-i': 1,
        'generation-ii': 2,
        'generation-iii': 3,
        'generation-iv': 4,
        'generation-v': 5,
        'generation-vi': 6,
        'generation-vii': 7,
        'generation-viii': 8,
        'generation-ix': 9,
    };
    return map[genName] || 0;
}

function normalizeName(name) {
    return (name || '').trim().toLowerCase();
}

function setCache(key, data) {
    if (pokemonCache.size > MAX_RECENT_CACHE) {
        const firstKey = pokemonCache.keys().next().value;
        pokemonCache.delete(firstKey);
    }
    pokemonCache.set(key, data);
}

async function ensureSpeciesList() {
    if (cachedSpecies) return cachedSpecies;
    if (fs.existsSync(SPECIES_FILE)) {
        try {
            const txt = fs.readFileSync(SPECIES_FILE, 'utf8');
            cachedSpecies = JSON.parse(txt);
            if (Array.isArray(cachedSpecies) && cachedSpecies.length > 0) return cachedSpecies;
        } catch (err) {
            console.error('[Mokenpo] Erro ao ler cache de species', err);
        }
    }

    const res = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1010');
    if (!res.ok) throw new Error('pokemon_not_found');
    const data = await res.json();
    const list = (data.results || []).map(r => r.name).filter(Boolean);
    cachedSpecies = list;
    try {
        fs.writeFileSync(SPECIES_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error('[Mokenpo] Erro ao salvar cache de species', err);
    }
    return list;
}

async function suggestNames(term, limit = 25) {
    const list = await ensureSpeciesList();
    const t = (term || '').toLowerCase();
    const filtered = t
        ? list.filter(n => n.includes(t)).slice(0, limit)
        : list.slice(0, limit);
    return filtered;
}

async function fetchPokemonInfo(identifier) {
    const key = normalizeName(String(identifier));
    if (pokemonCache.has(key)) return pokemonCache.get(key);

    const baseUrl = 'https://pokeapi.co/api/v2/pokemon/';
    const res = await fetch(baseUrl + encodeURIComponent(key));
    if (!res.ok) throw new Error('pokemon_not_found');
    const data = await res.json();
    const speciesRes = await fetch(data.species.url);
    if (!speciesRes.ok) throw new Error('pokemon_not_found');
    const species = await speciesRes.json();

    const info = {
        id: data.id,
        name: data.name,
        types: (data.types || []).map(t => t.type.name),
        weightKg: (data.weight || 0) / 10,
        heightM: (data.height || 0) / 10,
        sprite: data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || null,
        generation: species.generation?.name || null,
        generationNum: genNumber(species.generation?.name),
    };
    setCache(key, info);
    setCache(String(info.id), info);
    return info;
}

async function pickDailyPokemon() {
    // tenta até achar gen <= 9
    for (let i = 0; i < 10; i++) {
        const rand = Math.floor(Math.random() * 1010) + 1; // 1..1010
        const info = await fetchPokemonInfo(rand);
        if (info.generationNum >= 1 && info.generationNum <= 9) return info;
    }
    throw new Error('Falha ao escolher pokemon diário');
}

async function ensureDailyPokemon() {
    const state = loadState();
    const today = dayKey();
    ensureWeek(state, today);

    if (state.current && state.current.day === today) return state.current;

    const info = await pickDailyPokemon();
    state.current = {
        day: today,
        pokemon: info,
        winners: [],
    };
    saveState(state);
    return state.current;
}

function prizeForPosition(pos) {
    return REWARD_TABLE[pos] || CONSOLATION;
}

function formatTypes(types) {
    return (types || []).map(t => t.toUpperCase()).join('/');
}

function buildFeedback(target, guess) {
    const feedback = {};
    if (guess.generationNum === target.generationNum) {
        feedback.generation = 'igual';
    } else if (guess.generationNum < target.generationNum) {
        feedback.generation = 'maior';
    } else {
        feedback.generation = 'menor';
    }

    const intersect = guess.types.filter(t => target.types.includes(t));
    if (intersect.length === 0) feedback.types = 'nenhum tipo bate';
    else if (intersect.length === 1) feedback.types = 'apenas um tipo bate';
    else feedback.types = 'ambos os tipos batem';

    if (guess.weightKg === target.weightKg) feedback.weight = 'igual';
    else if (guess.weightKg < target.weightKg) feedback.weight = 'correto pesa mais';
    else feedback.weight = 'correto pesa menos';

    if (guess.heightM === target.heightM) feedback.height = 'igual';
    else if (guess.heightM < target.heightM) feedback.height = 'correto é mais alto';
    else feedback.height = 'correto é mais baixo';

    return feedback;
}

function feedbackText(feedback) {
    return `Geração: ${feedback.generation} | Tipos: ${feedback.types} | Peso: ${feedback.weight} | Altura: ${feedback.height}`;
}

function remainingPrizes(winnersLen) {
    const list = [];
    for (let i = winnersLen; i < 3; i++) list.push(REWARD_TABLE[i]);
    if (list.length === 0) list.push(CONSOLATION);
    return list;
}

function appendLogHeader(state, target) {
    const today = brtNow();
    const dayStr = dayKey(today);
    let lines = [];

    if (state.lastLogWeek !== state.week) {
            lines.push('');
            lines.push(`Semana ${state.week} que o bot está sendo usado`);
        state.lastLogWeek = state.week;
    }

    if (state.lastLogDay !== dayStr) {
        const title = `Dia ${today.getUTCDate()} do mês ${monthName(today)} do ano ${today.getUTCFullYear()}`;
        lines.push(title);
        lines.push(`Pokemon do dia: ${target.pokemon.name}`);
        lines.push('Comandos usados ao longo do dia:');
            lines.push('');
        state.lastLogDay = dayStr;
    }

    if (lines.length) {
        fs.appendFileSync(LOG_FILE, lines.join('\n') + '\n', 'utf8');
    }
}

function appendAttemptLog(state, userTag, guess, target, feedback, correct) {
    appendLogHeader(state, target);
    const diffWeight = (target.pokemon.weightKg - guess.weightKg).toFixed(2);
    const diffHeight = (target.pokemon.heightM - guess.heightM).toFixed(2);
    const line = [
        `${userTag} tentou ${guess.name} (gen ${guess.generationNum}, tipos ${formatTypes(guess.types)}, ${guess.weightKg.toFixed(2)}kg, ${guess.heightM.toFixed(2)}m).`,
        `  - Alvo: gen ${target.pokemon.generationNum} (${feedback.generation}), tipos ${formatTypes(target.pokemon.types)}`,
        `  - Peso: dif ${diffWeight} (${feedback.weight}) | Altura: dif ${diffHeight} (${feedback.height})`,
        `  - Tipos: ${feedback.types}${correct ? ' [ACERTOU]' : ''}`,
    ].join('\n');
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
    saveState(state);
}

async function handleGuess(userId, userTag, guessName) {
    const state = loadState();
    const current = await ensureDailyPokemon();
    const targetPokemon = current.pokemon;
    const guessInfo = await fetchPokemonInfo(guessName);

    const correct = normalizeName(guessInfo.name) === normalizeName(targetPokemon.name);
    const fb = buildFeedback(targetPokemon, guessInfo);

    appendAttemptLog(state, userTag, guessInfo, { pokemon: targetPokemon }, fb, correct);

    let prize = 0;
    let announcement = null;
    let position = null;

    if (correct) {
        const already = current.winners.find(w => w.userId === userId);
        if (!already) {
            position = current.winners.length;
            prize = prizeForPosition(position);
            addBalance(userId, prize);
            current.winners.push({ userId, userTag, prize });
            saveState(state);
            const remaining = remainingPrizes(current.winners.length);
            announcement = { userTag, prize, remaining, target: { pokemon: targetPokemon } };
        }
    }

    return { correct, feedback: fb, prize, announcement, target: { pokemon: targetPokemon }, guessInfo, position };
}

module.exports = {
    ensureDailyPokemon,
    handleGuess,
    feedbackText,
    remainingPrizes,
    suggestNames,
    fetchPokemonInfo,
};
