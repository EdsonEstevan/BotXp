const fs = require('fs');
const path = require('path');

const NOTES_DATA_FILE = path.join(__dirname, '..', '..', 'notes_hierarchical.json');

const CATEGORIES = ['NPCs', 'Cidades', 'Histórias', 'Personagens', 'Itens', 'Lore', 'Campanhas', 'Outro'];

// Estrutura de dados:
// {
//   "userId": {
//     "settings": { "current_path": "NPCs/RpgX" },
//     "folders": {
//       "NPCs": {
//         "owner": "userId",
//         "shared_with": ["userId2"],
//         "notes": {
//           "note_id": { "title": "...", "content": "...", "created": timestamp, "updated": timestamp }
//         },
//         "folders": {
//           "RpgX": { ... }
//         }
//       }
//     }
//   }
// }

function loadNotesData() {
    try {
        if (!fs.existsSync(NOTES_DATA_FILE)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(NOTES_DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('[Notes] Erro ao carregar dados:', err);
        return {};
    }
}

function saveNotesData(data) {
    try {
        fs.writeFileSync(NOTES_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Notes] Erro ao salvar dados:', err);
    }
}

function initializeUser(userId) {
    const data = loadNotesData();
    if (!data[userId]) {
        data[userId] = {
            settings: { current_path: '' },
            folders: {}
        };
        saveNotesData(data);
    }
    return data;
}

function getFolderRef(data, userId, pathStr = '') {
    if (!data[userId]) {
        return { success: false, error: 'Usuário não inicializado.' };
    }

    const parts = pathStr ? pathStr.split('/').filter(Boolean) : [];
    let folder = { folders: data[userId].folders, notes: {}, owner: userId, shared_with: [] };

    for (const part of parts) {
        if (!folder.folders || !folder.folders[part]) {
            return { success: false, error: `Pasta "${part}" não encontrada!` };
        }
        folder = folder.folders[part];
    }

    return { success: true, folder };
}

function resolvePath(userId, pathStr, data) {
    const store = data || initializeUser(userId);

    if (!store[userId]) {
        return { success: false, error: 'Usuário não inicializado.' };
    }

    if (!pathStr || pathStr === '' || pathStr === '/') {
        return { success: true, path: '', folder: store[userId].folders, depth: 0 };
    }

    const parts = pathStr.split('/').filter(p => p.length > 0);
    let current = store[userId].folders;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) {
            return { success: false, error: `Pasta "${part}" não encontrada!` };
        }
        if (!current[part].folders) {
            return { success: false, error: `"${part}" não é uma pasta!` };
        }
        current = current[part].folders;
    }

    return { success: true, path: pathStr, folder: current, depth: parts.length };
}

function canAccessFolder(userId, folder) {
    if (!folder) return false;
    if (folder.owner === userId) return true;
    if (folder.shared_with && folder.shared_with.includes(userId)) return true;
    return false;
}

function createFolder(userId, folderName, parentPath = '') {
    const data = initializeUser(userId);
    
    if (folderName.includes('/') || folderName.includes('\\')) {
        return { success: false, error: 'Nome de pasta não pode conter / ou \\' };
    }
    
    const resolved = resolvePath(userId, parentPath, data);
    if (!resolved.success) return resolved;
    
    if (resolved.folder[folderName]) {
        return { success: false, error: `Pasta "${folderName}" já existe!` };
    }
    
    resolved.folder[folderName] = {
        owner: userId,
        shared_with: [],
        notes: {},
        folders: {}
    };
    
    saveNotesData(data);
    const newPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    return { success: true, path: newPath, message: `Pasta "${folderName}" criada com sucesso!` };
}

function createNote(userId, title, content, parentPath = '') {
    const data = initializeUser(userId);
    
    if (!parentPath) {
        return { success: false, error: 'Crie uma pasta primeiro! Ex: /nota pasta-criar nome:NPCs' };
    }

    const { success, folder, error } = getFolderRef(data, userId, parentPath);
    if (!success) return { success, error };

    if (!canAccessFolder(userId, folder)) {
        return { success: false, error: 'Sem acesso a esta pasta!' };
    }

    if (!folder.notes) {
        folder.notes = {};
    }

    const noteId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    folder.notes[noteId] = {
        owner: userId,
        title,
        content,
        shared_with: [],
        created: Date.now(),
        updated: Date.now()
    };
    
    saveNotesData(data);
    return { success: true, noteId, path: parentPath, message: `Nota "${title}" criada!` };
}

function listFolderContents(userId, folderPath = '') {
    const data = initializeUser(userId);
    const { success, folder, error } = getFolderRef(data, userId, folderPath);
    if (!success) return { success, error };
    
    if (!folder.notes) folder.notes = {};
    if (!folder.folders) folder.folders = {};
    
    const folders = Object.entries(folder.folders).map(([name, sub]) => ({
        name,
        owner: sub.owner,
        isShared: sub.shared_with && sub.shared_with.length > 0
    }));
    
    const notes = Object.entries(folder.notes).map(([id, note]) => ({
        id,
        title: note.title,
        owner: note.owner,
        isShared: note.shared_with && note.shared_with.length > 0,
        updated: new Date(note.updated).toLocaleString('pt-BR')
    }));
    
    return { success: true, folders, notes, path: folderPath };
}

function shareNote(userId, noteId, targetUserId, folderPath = '') {
    const data = initializeUser(userId);
    initializeUser(targetUserId);

    const { success, folder, error } = getFolderRef(data, userId, folderPath);
    if (!success) return { success, error };

    const note = (folder.notes || {})[noteId];
    if (!note) {
        return { success: false, error: 'Nota não encontrada!' };
    }
    
    if (note.owner !== userId) {
        return { success: false, error: 'Apenas o dono pode compartilhar!' };
    }
    
    if (!note.shared_with) note.shared_with = [];
    
    if (note.shared_with.includes(targetUserId)) {
        return { success: false, error: 'Já compartilhado com este usuário!' };
    }
    
    note.shared_with.push(targetUserId);
    saveNotesData(data);
    
    return { success: true, message: `Nota compartilhada com <@${targetUserId}>!` };
}

function getNote(userId, noteId, folderPath = '') {
    const data = initializeUser(userId);

    const { success, folder, error } = getFolderRef(data, userId, folderPath);
    if (!success) return { success, error };

    const note = (folder.notes || {})[noteId];
    if (!note) {
        return { success: false, error: 'Nota não encontrada!' };
    }
    
    if (note.owner !== userId && (!note.shared_with || !note.shared_with.includes(userId))) {
        return { success: false, error: 'Sem acesso a esta nota!' };
    }
    
    return { success: true, note, noteId, path: folderPath };
}

function deleteNote(userId, noteId, folderPath = '') {
    const data = initializeUser(userId);

    const { success, folder, error } = getFolderRef(data, userId, folderPath);
    if (!success) return { success, error };

    const note = (folder.notes || {})[noteId];
    if (!note) {
        return { success: false, error: 'Nota não encontrada!' };
    }
    
    if (note.owner !== userId) {
        return { success: false, error: 'Apenas o dono pode deletar!' };
    }
    
    delete folder.notes[noteId];
    saveNotesData(data);
    
    return { success: true, message: 'Nota deletada!' };
}

// Lista todos os caminhos de pasta para autocomplete
function listAllFolderPaths(userId) {
    const data = loadNotesData();
    if (!data[userId] || !data[userId].folders) return [];

    const paths = [];

    function walk(folder, prefix = '') {
        const subfolders = Object.keys(folder.folders || {});
        subfolders.forEach(name => {
            const fullPath = prefix ? `${prefix}/${name}` : name;
            paths.push(fullPath);
            walk(folder.folders[name], fullPath);
        });
    }

    walk({ folders: data[userId].folders }, '');
    return paths;
}

module.exports = {
    CATEGORIES,
    loadNotesData,
    saveNotesData,
    initializeUser,
    createFolder,
    createNote,
    listFolderContents,
    shareNote,
    getNote,
    deleteNote,
    resolvePath,
    listAllFolderPaths
};
