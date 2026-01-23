const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const { EmbedBuilder } = require('discord.js');

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'gifv'];

function isImage(url) {
    return IMAGE_EXTENSIONS.some(ext => url.endsWith('.' + ext));
}
function isVideo(url) {
    return VIDEO_EXTENSIONS.some(ext => url.endsWith('.' + ext));
}

async function fetchMeme({ subreddit, memeSet, tries = 0 }) {
    const MAX_TRIES = 5;
    const endpoint = subreddit ? `https://meme-api.com/gimme/${subreddit}` : 'https://meme-api.com/gimme';
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('HTTP error');
        const data = await res.json();
        console.log(`[memeApi] Tentativa ${tries+1}:`, data);
        if (!data) {
            console.log('[memeApi] Falha: data vazio');
        } else if (data.nsfw) {
            console.log('[memeApi] Ignorado: NSFW');
        } else if (data.spoiler) {
            console.log('[memeApi] Ignorado: Spoiler');
        } else if (!data.url) {
            console.log('[memeApi] Falha: url vazio');
        } else if (memeSet.has(data.postLink)) {
            console.log('[memeApi] Ignorado: repetido', data.postLink);
        }
        if (!data || data.nsfw || data.spoiler || !data.url || memeSet.has(data.postLink)) {
            if (tries < MAX_TRIES) {
                return fetchMeme({ subreddit, memeSet, tries: tries + 1 });
            } else {
                console.log('[memeApi] Erro: Limite de tentativas atingido.');
                return null;
            }
        }
        memeSet.add(data.postLink);
        if (memeSet.size > 10) memeSet.delete([...memeSet][0]);
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
            return fetchMeme({ subreddit, memeSet, tries: tries + 1 });
        }
        return null;
    }
}

module.exports = fetchMeme;
