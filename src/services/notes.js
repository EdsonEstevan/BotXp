const fs = require('fs');
const path = require('path');

const NOTES_FILE = path.join(__dirname, '..', '..', 'notes.json');
const CATEGORIES = ['CENARIOS', 'NPCS', 'PERSONAGENS', 'PODERES', 'EQUIPAMENTOS', 'LOCAIS'];
const DEFAULT_SUBFOLDER = 'geral';

function loadNotes() {
    try {
        if (fs.existsSync(NOTES_FILE)) {
            const data = fs.readFileSync(NOTES_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
    } catch (err) {
        console.error('[Notes] Erro ao carregar notas:', err);
    }
    return { guilds: {} };
}

function saveNotes(data) {
    try {
        fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Notes] Erro ao salvar notas:', err);
    }
}

function normalizeCategory(category) {
    if (!category) return null;
    const upper = String(category).trim().toUpperCase();
    return CATEGORIES.includes(upper) ? upper : null;
}

function normalizeSubfolder(subfolder) {
    if (!subfolder) return DEFAULT_SUBFOLDER;
    const value = String(subfolder).trim();
    return value.length > 0 ? value : DEFAULT_SUBFOLDER;
}

function ensureGuild(data, guildId) {
    if (!data.guilds[guildId]) {
        const subfolders = {};
        for (const category of CATEGORIES) {
            subfolders[category] = [DEFAULT_SUBFOLDER];
        }
        data.guilds[guildId] = {
            nextId: 1,
            notes: [],
            subfolders,
        };
    }
    return data.guilds[guildId];
}

function getExistingSubfolder(subfolders, candidate) {
    const candidateLower = candidate.toLowerCase();
    return subfolders.find(name => name.toLowerCase() === candidateLower) || null;
}

function addNote(guildId, authorId, categoryInput, subfolderInput, title, content) {
    const data = loadNotes();
    const guildData = ensureGuild(data, guildId);
    const category = normalizeCategory(categoryInput);
    if (!category) {
        return { success: false, error: 'Categoria invalida.' };
    }
    const subfolderRaw = normalizeSubfolder(subfolderInput);
    const subfolders = guildData.subfolders[category] || [DEFAULT_SUBFOLDER];
    const existing = getExistingSubfolder(subfolders, subfolderRaw);
    const subfolder = existing || subfolderRaw;
    if (!existing) {
        subfolders.push(subfolderRaw);
    }
    guildData.subfolders[category] = subfolders;

    const note = {
        id: guildData.nextId++,
        category,
        subfolder,
        title: String(title || '').trim(),
        content: String(content || '').trim(),
        authorId,
        createdAt: new Date().toISOString(),
    };
    guildData.notes.push(note);
    saveNotes(data);
    return { success: true, note };
}

function listNotes(guildId, filters = {}) {
    const data = loadNotes();
    const guildData = ensureGuild(data, guildId);
    const category = normalizeCategory(filters.category);
    const subfolder = filters.subfolder ? String(filters.subfolder).trim().toLowerCase() : null;
    const authorId = filters.authorId || null;

    return guildData.notes.filter(note => {
        if (category && note.category !== category) return false;
        if (subfolder && note.subfolder.toLowerCase() !== subfolder) return false;
        if (authorId && note.authorId !== authorId) return false;
        return true;
    });
}

function getNoteById(guildId, noteId) {
    const data = loadNotes();
    const guildData = ensureGuild(data, guildId);
    return guildData.notes.find(note => note.id === noteId) || null;
}

function listSubfolders(guildId, categoryInput) {
    const data = loadNotes();
    const guildData = ensureGuild(data, guildId);
    const category = normalizeCategory(categoryInput);
    if (!category) return [];
    return guildData.subfolders[category] || [DEFAULT_SUBFOLDER];
}

module.exports = {
    CATEGORIES,
    DEFAULT_SUBFOLDER,
    addNote,
    listNotes,
    getNoteById,
    listSubfolders,
};
