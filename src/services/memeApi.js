const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const { EmbedBuilder } = require('discord.js');

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'gifv'];
const BR_SUBREDDITS = ['HUEstation', 'brasilmemes', 'MemesBrasil', 'shitpostbr', 'MemesDoBrasil'];
const RECENT_LIMIT = 80;
const recentLinks = [];
const recentSet = new Set();

function isImage(url) {
    return IMAGE_EXTENSIONS.some(ext => url.endsWith('.' + ext));
}
function isVideo(url) {
    return VIDEO_EXTENSIONS.some(ext => url.endsWith('.' + ext));
}

function pickSub(subreddit, subreddits) {
    if (subreddit) return subreddit;
    const list = Array.isArray(subreddits) && subreddits.length ? subreddits : BR_SUBREDDITS;
    return list[Math.floor(Math.random() * list.length)];
}

function isRecent(link, memeSet) {
    return (memeSet && memeSet.has(link)) || recentSet.has(link);
}

function pushRecent(link, memeSet) {
    if (memeSet) {
        memeSet.add(link);
        if (memeSet.size > 20) memeSet.delete([...memeSet][0]);
    }
    if (!recentSet.has(link)) {
        recentLinks.push(link);
        recentSet.add(link);
        if (recentLinks.length > RECENT_LIMIT) {
            const first = recentLinks.shift();
            recentSet.delete(first);
        }
    }
}

async function fetchMeme({ subreddit, subreddits, memeSet, tries = 0 }) {
    const MAX_TRIES = 8;
    const picked = pickSub(subreddit, subreddits);
    const endpoint = picked ? `https://meme-api.com/gimme/${picked}` : 'https://meme-api.com/gimme';
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('HTTP error');
        const data = await res.json();
        console.log(`[memeApi] Tentativa ${tries+1} sub=${picked}:`, data);
        if (!data) {
            console.log('[memeApi] Falha: data vazio');
        } else if (data.nsfw) {
            console.log('[memeApi] Ignorado: NSFW');
        } else if (data.spoiler) {
            console.log('[memeApi] Ignorado: Spoiler');
        } else if (!data.url) {
            console.log('[memeApi] Falha: url vazio');
        } else if (isRecent(data.postLink, memeSet)) {
            console.log('[memeApi] Ignorado: repetido', data.postLink);
        }
        if (!data || data.nsfw || data.spoiler || !data.url || isRecent(data.postLink, memeSet)) {
            if (tries < MAX_TRIES) {
                return fetchMeme({ subreddit, subreddits, memeSet, tries: tries + 1 });
            } else {
                console.log('[memeApi] Erro: Limite de tentativas atingido.');
                return null;
            }
        }
        pushRecent(data.postLink, memeSet);
        let embed = new EmbedBuilder()
            .setTitle(data.title)
            .setURL(data.postLink)
            .setFooter({ text: `r/${data.subreddit}` });
        let content = '';
        let isVideo = false;
        if (isImage(data.url)) {
            embed.setImage(data.url);
        } else if (isVideo(data.url)) {
            isVideo = true;
            embed.setDescription('Vídeo abaixo.');
            content = data.url;
        } else {
            embed.setDescription('Não foi possível exibir o meme.');
        }
        return { embed, content, isVideo };
    } catch (err) {
        console.log('[memeApi] Erro exception:', err);
        if (tries < MAX_TRIES) {
            return fetchMeme({ subreddit, subreddits, memeSet, tries: tries + 1 });
        }
        return null;
    }
}

module.exports = { fetchMeme, BR_SUBREDDITS };
