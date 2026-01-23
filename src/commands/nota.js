const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { CATEGORIES, createFolder, createNote, listFolderContents, shareNote, getNote, deleteNote, initializeUser, loadNotesData, listAllFolderPaths } = require('../services/notesHierarchical');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nota')
        .setDescription('💾 Gerenciar notas com pastas hierárquicas')
        .addSubcommand(sub =>
            sub.setName('criar')
                .setDescription('Criar uma nova nota')
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título da nota (deixe vazio para usar a interface)')
                        .setRequired(false)
                        .setMaxLength(100))
                .addStringOption(option =>
                    option.setName('conteudo')
                        .setDescription('Conteúdo da nota (deixe vazio para usar a interface)')
                        .setRequired(false)
                        .setMaxLength(2000))
                .addStringOption(option =>
                    option.setName('caminho')
                        .setDescription('Caminho completo (ex: NPCs/RpgX/Cidades)')
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('pasta-criar')
                .setDescription('Criar uma nova pasta')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome da pasta')
                        .setRequired(true)
                        .setMaxLength(50))
                .addStringOption(option =>
                    option.setName('dentro-de')
                        .setDescription('Caminho da pasta pai (ex: NPCs/RpgX)')
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Listar conteúdo de uma pasta')
                .addStringOption(option =>
                    option.setName('caminho')
                        .setDescription('Caminho da pasta (deixe vazio para ver categorias)')
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('pastas')
                .setDescription('Mostrar árvore de pastas em ASCII')
                .addStringOption(option =>
                    option.setName('caminho')
                        .setDescription('Caminho de onde começar a árvore (opcional)')
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver conteúdo de uma nota')
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título parcial da nota (opcional)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('compartilhar')
                .setDescription('Compartilhar uma nota com alguém')
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título da nota')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para compartilhar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('deletar')
                .setDescription('Deletar uma nota')
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título da nota')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'criar') {
            await handleCreateNote(interaction, userId);
        } else if (subcommand === 'pasta-criar') {
            await handleCreateFolder(interaction, userId);
        } else if (subcommand === 'listar') {
            await handleListFolder(interaction, userId);
        } else if (subcommand === 'pastas') {
            await handleListTree(interaction, userId);
        } else if (subcommand === 'ver') {
            await handleViewNote(interaction, userId);
        } else if (subcommand === 'compartilhar') {
            await handleShareNote(interaction, userId);
        } else if (subcommand === 'deletar') {
            await handleDeleteNote(interaction, userId);
        }
    },

    // Autocomplete para sugerir caminhos de pastas
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const userId = interaction.user.id;

        if (focused.name !== 'dentro-de' && focused.name !== 'caminho') {
            return interaction.respond([]);
        }

        initializeUser(userId);
        const paths = listAllFolderPaths(userId);

        const query = focused.value?.toLowerCase() || '';
        const filtered = paths
            .filter(p => p.toLowerCase().includes(query))
            .slice(0, 25) // limite do Discord
            .map(p => ({ name: p || '(raiz)', value: p }));

        // sempre oferecer raiz como opção
        if (!filtered.find(f => f.value === '')) {
            filtered.unshift({ name: '(raiz)', value: '' });
        }

        await interaction.respond(filtered);
    },

    // Handler para componentes (selects/botões) e modal
    async handleComponent(interaction) {
        const [prefix, action, ownerId, mode = 'view', encodedBasePath = ''] = interaction.customId.split(':');
        if (prefix !== 'nota') return;

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: 'Apenas quem abriu o navegador pode usar estes menus.', flags: MessageFlags.Ephemeral });
        }

        const basePath = decodePath(encodedBasePath);

        if (action === 'folder') {
            const choice = interaction.values?.[0] ?? '';
            let nextPath = basePath;
            if (choice === '__up__') {
                nextPath = parentPath(basePath);
            } else {
                nextPath = decodePath(choice);
            }

            const view = buildFolderView(ownerId, nextPath, mode);
            if (!view.success) {
                return interaction.update({ content: `❌ ${view.error}`, embeds: [], components: [], flags: MessageFlags.Ephemeral });
            }

            return interaction.update({ embeds: [view.embed], components: view.components, content: '', flags: MessageFlags.Ephemeral });
        }

        if (action === 'note') {
            const choice = interaction.values?.[0] ?? '';
            const [encodedPath, noteId] = choice.split('|');
            const path = decodePath(encodedPath || '');

            const result = getNote(ownerId, noteId, path);
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
            }

            const noteEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`📄 ${result.note.title}`)
                .setDescription(result.note.content)
                .addFields(
                    { name: '📂 Caminho', value: path || '(raiz)', inline: true },
                    { name: '🔒 Privacidade', value: result.note.shared_with && result.note.shared_with.length > 0 ? '🔗 Compartilhado' : '🔒 Privado', inline: true }
                )
                .setFooter({ text: `Criado em: ${new Date(result.note.created).toLocaleString('pt-BR')}` });

            return interaction.reply({ embeds: [noteEmbed], flags: MessageFlags.Ephemeral });
        }

        if (action === 'create') {
            const path = basePath;
            const modal = new ModalBuilder()
                .setCustomId(`nota:create:${ownerId}:${encodePath(path)}`)
                .setTitle('Criar nota');

            const titleInput = new TextInputBuilder()
                .setCustomId('titulo')
                .setLabel('Título')
                .setPlaceholder('Minha nova nota')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const contentInput = new TextInputBuilder()
                .setCustomId('conteudo')
                .setLabel('Conteúdo')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(2000)
                .setPlaceholder('Digite o conteúdo da nota...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(contentInput)
            );

            return interaction.showModal(modal);
        }
    },

    async handleModalSubmit(interaction) {
        const [prefix, action, ownerId, encodedPath = ''] = interaction.customId.split(':');
        if (prefix !== 'nota' || action !== 'create') return;

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: 'Apenas quem abriu o criador pode enviar esta nota.', flags: MessageFlags.Ephemeral });
        }

        const path = decodePath(encodedPath || '');
        const titulo = interaction.fields.getTextInputValue('titulo');
        const conteudo = interaction.fields.getTextInputValue('conteudo');

        const result = createNote(ownerId, titulo, conteudo, path);
        if (!result.success) {
            return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('✅ Nota Criada!')
            .addFields(
                { name: '📝 Título', value: titulo, inline: false },
                { name: '📂 Caminho', value: path || '(raiz)', inline: false },
                { name: '📋 Preview', value: conteudo.substring(0, 200) + (conteudo.length > 200 ? '...' : ''), inline: false }
            )
            .setFooter({ text: 'Use /nota listar para ver suas notas' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};

async function handleCreateNote(interaction, userId) {
    const titulo = interaction.options.getString('titulo');
    const conteudo = interaction.options.getString('conteudo');
    const caminho = interaction.options.getString('caminho') || '';

    // Se usuário já forneceu tudo, cria direto
    if (titulo && conteudo && caminho) {
        const result = createNote(userId, titulo, conteudo, caminho);

        if (!result.success) {
            return await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('✅ Nota Criada!')
            .addFields(
                { name: '📝 Título', value: titulo, inline: false },
                { name: '📂 Caminho', value: caminho || '(raiz)', inline: false },
                { name: '📋 Preview', value: conteudo.substring(0, 200) + (conteudo.length > 200 ? '...' : ''), inline: false }
            )
            .setFooter({ text: 'Use /nota listar para ver suas notas' });

        return await interaction.reply({ embeds: [embed] });
    }

    // Caso contrário, abre navegador interativo para escolher pasta e então abrir modal
    const view = buildFolderView(userId, caminho, 'create');
    if (!view.success) {
        return interaction.reply({ content: `❌ ${view.error}`, flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ embeds: [view.embed], components: view.components, flags: MessageFlags.Ephemeral });
}

async function handleCreateFolder(interaction, userId) {
    const nome = interaction.options.getString('nome');
    const dentroDe = interaction.options.getString('dentro-de') || '';

    const result = createFolder(userId, nome, dentroDe);

    if (!result.success) {
        return await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setColor('#2196F3')
        .setTitle('📁 Pasta Criada!')
        .addFields(
            { name: '📂 Nome', value: nome, inline: true },
            { name: '📍 Caminho', value: result.path || '(raiz)', inline: true }
        )
        .setFooter({ text: 'Agora você pode criar notas dentro dela!' });

    await interaction.reply({ embeds: [embed] });
}

async function handleListFolder(interaction, userId) {
    const caminho = interaction.options.getString('caminho') || '';

    const result = listFolderContents(userId, caminho);

    if (!result.success) {
        return await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setColor('#9C27B0')
        .setTitle('📂 Conteúdo da Pasta')
        .setDescription(caminho || '(Raiz)')
        .setFooter({ text: `Total: ${result.folders.length} pastas, ${result.notes.length} notas` });

    if (result.folders.length > 0) {
        const folderList = result.folders
            .map(f => `📁 **${f.name}** ${f.isShared ? '🔗 (compartilhado)' : '🔒 (privado)'}`)
            .join('\n');
        embed.addFields({ name: 'Pastas', value: folderList, inline: false });
    }

    if (result.notes.length > 0) {
        const noteList = result.notes
            .map(n => `📄 **${n.title}** ${n.isShared ? '🔗' : '🔒'} - ${n.updated}`)
            .join('\n');
        embed.addFields({ name: 'Notas', value: noteList, inline: false });
    }

    if (result.folders.length === 0 && result.notes.length === 0) {
        embed.setDescription(`${caminho || '(Raiz)'}\n\n*Nenhum conteúdo aqui ainda!*`);
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleListTree(interaction, userId) {
    const caminho = interaction.options.getString('caminho') || '';
    initializeUser(userId);
    const data = loadNotesData();
    if (!data[userId] || !data[userId].folders || Object.keys(data[userId].folders).length === 0) {
        return await interaction.reply({ content: '📂 Nenhuma pasta criada ainda.', flags: MessageFlags.Ephemeral });
    }

    const parts = caminho ? caminho.split('/').filter(Boolean) : [];
    let current = { name: '(raiz)', folder: { folders: data[userId].folders, notes: {} } };

    if (parts.length > 0) {
        let node = data[userId].folders;
        for (const part of parts) {
            if (!node[part]) {
                return await interaction.reply({ content: `❌ Pasta "${part}" não encontrada neste caminho.`, flags: MessageFlags.Ephemeral });
            }
            node = node[part].folders;
        }
        // Recuperar referência real da pasta final
        node = data[userId].folders;
        for (const part of parts) {
            node = node[part];
        }
        current = { name: parts[parts.length - 1], folder: node };
    }

    const lines = [];

    function buildTree(name, folder, prefix = '', isLast = true) {
        const connector = prefix ? (isLast ? '└─ ' : '├─ ') : '';
        const line = `${prefix}${connector}📁 ${name}`;
        lines.push(line);

        const subfolders = Object.keys(folder.folders || {}).sort();
        const notes = Object.values(folder.notes || {}).sort((a, b) => a.title.localeCompare(b.title));
        const totalChildren = subfolders.length + notes.length;

        const nextPrefix = prefix + (prefix ? (isLast ? '   ' : '│  ') : '   ');

        subfolders.forEach((fname, idx) => {
            const isLastChild = idx === subfolders.length - 1 && notes.length === 0;
            buildTree(fname, folder.folders[fname], nextPrefix, isLastChild);
        });

        notes.forEach((note, idx) => {
            const isLastChild = idx === notes.length - 1;
            const connectorNote = isLastChild ? '└─ ' : '├─ ';
            const privacy = note.shared_with && note.shared_with.length > 0 ? '🔗' : '🔒';
            lines.push(`${nextPrefix}${connectorNote}📄 ${note.title} ${privacy}`);
        });
    }

    buildTree(current.name, current.folder, '', true);

    const maxLines = 60;
    if (lines.length > maxLines) {
        lines.splice(maxLines - 1);
        lines.push('└─ ... (árvore truncada)');
    }

    const embed = new EmbedBuilder()
        .setColor('#00BCD4')
        .setTitle('📂 Árvores de Pastas')
        .setDescription(`Caminho base: ${caminho || '(raiz)'}\n\n\`\`\`\n${lines.join('\n')}\n\`\`\``)
        .setFooter({ text: 'Use /nota pasta-criar e /nota criar para organizar suas notas' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleViewNote(interaction, userId) {
    const titulo = interaction.options.getString('titulo');

    // Se título foi fornecido, manter busca direta por compatibilidade
    if (titulo) {
        const data = require('../services/notesHierarchical').loadNotesData();
        let foundNote = null;
        let foundPath = '';

        function searchNote(folder, path = '') {
            for (const [id, note] of Object.entries(folder.notes || {})) {
                if (note.title.toLowerCase().includes(titulo.toLowerCase())) {
                    if (note.owner === userId || (note.shared_with && note.shared_with.includes(userId))) {
                        foundNote = { ...note, id };
                        foundPath = path;
                        return true;
                    }
                }
            }
            for (const [name, subfolder] of Object.entries(folder.folders || {})) {
                const newPath = path ? `${path}/${name}` : name;
                if (searchNote(subfolder, newPath)) return true;
            }
            return false;
        }

        if (data[userId]) {
            searchNote(data[userId]);
        }

        if (!foundNote) {
            return await interaction.reply({ content: '❌ Nota não encontrada!', flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`📄 ${foundNote.title}`)
            .setDescription(foundNote.content)
            .addFields(
                { name: '📂 Caminho', value: foundPath || '(raiz)', inline: true },
                { name: '🔒 Privacidade', value: foundNote.shared_with && foundNote.shared_with.length > 0 ? '🔗 Compartilhado' : '🔒 Privado', inline: true }
            )
            .setFooter({ text: `Criado em: ${new Date(foundNote.created).toLocaleString('pt-BR')}` });

        return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Caso sem título: abrir navegador interativo
    const view = buildFolderView(userId, '', 'view');
    if (!view.success) {
        return interaction.reply({ content: `❌ ${view.error}`, flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ embeds: [view.embed], components: view.components, flags: MessageFlags.Ephemeral });
}

async function handleShareNote(interaction, userId) {
    const titulo = interaction.options.getString('titulo');
    const targetUser = interaction.options.getUser('usuario');

    // Buscar nota
    const data = require('../services/notesHierarchical').loadNotesData();
    let foundNote = null;
    let foundPath = '';
    let noteId = '';

    function searchNote(folder, path = '') {
        for (const [id, note] of Object.entries(folder.notes || {})) {
            if (note.title.toLowerCase().includes(titulo.toLowerCase()) && note.owner === userId) {
                foundNote = note;
                foundPath = path;
                noteId = id;
                return true;
            }
        }
        for (const [name, subfolder] of Object.entries(folder.folders || {})) {
            const newPath = path ? `${path}/${name}` : name;
            if (searchNote(subfolder, newPath)) return true;
        }
        return false;
    }

    if (data[userId]) {
        searchNote(data[userId]);
    }

    if (!foundNote) {
        return await interaction.reply({ content: '❌ Nota não encontrada!', flags: MessageFlags.Ephemeral });
    }

    const result = shareNote(userId, noteId, targetUser.id, foundPath);

    if (!result.success) {
        return await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🔗 Nota Compartilhada!')
        .addFields(
            { name: '📄 Nota', value: foundNote.title, inline: false },
            { name: '👤 Compartilhado com', value: `<@${targetUser.id}>`, inline: true }
        );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleDeleteNote(interaction, userId) {
    const titulo = interaction.options.getString('titulo');

    // Buscar nota
    const data = require('../services/notesHierarchical').loadNotesData();
    let foundNote = null;
    let foundPath = '';
    let noteId = '';

    function searchNote(folder, path = '') {
        for (const [id, note] of Object.entries(folder.notes || {})) {
            if (note.title.toLowerCase().includes(titulo.toLowerCase()) && note.owner === userId) {
                foundNote = note;
                foundPath = path;
                noteId = id;
                return true;
            }
        }
        for (const [name, subfolder] of Object.entries(folder.folders || {})) {
            const newPath = path ? `${path}/${name}` : name;
            if (searchNote(subfolder, newPath)) return true;
        }
        return false;
    }

    if (data[userId]) {
        searchNote(data[userId]);
    }

    if (!foundNote) {
        return await interaction.reply({ content: '❌ Nota não encontrada!', flags: MessageFlags.Ephemeral });
    }

    const result = deleteNote(userId, noteId, foundPath);

    if (!result.success) {
        return await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🗑️ Nota Deletada!')
        .setDescription(`"${foundNote.title}" foi removida permanentemente.`);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

function buildFolderView(userId, folderPath = '', mode = 'view') {
    const result = listFolderContents(userId, folderPath);
    if (!result.success) return { success: false, error: result.error };

    const embed = new EmbedBuilder()
        .setColor('#00BCD4')
        .setTitle(mode === 'create' ? '📂 Escolha onde salvar' : '📂 Navegar notas')
        .setDescription(`Caminho: ${folderPath || '(raiz)'}`)
        .setFooter({ text: mode === 'create' ? 'Selecione a pasta e clique em Criar nota aqui' : 'Selecione uma pasta ou nota para navegar' });

    if (result.folders.length > 0) {
        const folderLines = result.folders
            .slice(0, 15)
            .map(f => `📁 ${f.name} ${f.isShared ? '🔗' : '🔒'}`)
            .join('\n');
        embed.addFields({ name: 'Pastas', value: folderLines });
    }

    if (result.notes.length > 0) {
        const noteLines = result.notes
            .slice(0, 15)
            .map(n => `📄 ${n.title} ${n.isShared ? '🔗' : '🔒'}`)
            .join('\n');
        embed.addFields({ name: 'Notas', value: noteLines });
    }

    if (result.folders.length === 0 && result.notes.length === 0) {
        embed.setDescription(`${folderPath || '(raiz)'}\n\n*Nenhum conteúdo aqui ainda.*`);
    }

    const components = [];

    if (result.folders.length > 0) {
        const options = [];
        if (folderPath) {
            options.push({ label: '⬆️ Voltar', value: '__up__', description: 'Voltar para a pasta anterior' });
        }

        result.folders.slice(0, 24).forEach(folder => {
            const nextPath = folderPath ? `${folderPath}/${folder.name}` : folder.name;
            options.push({
                label: truncate(folder.name),
                value: encodePath(nextPath),
                description: folder.isShared ? 'Compartilhada' : 'Privada'
            });
        });

        if (options.length > 0) {
            components.push(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`nota:folder:${userId}:${mode}:${encodePath(folderPath)}`)
                        .setPlaceholder('Navegar pastas')
                        .addOptions(options)
                )
            );
        }
    }

    if (result.notes.length > 0) {
        const noteOptions = result.notes.slice(0, 25).map(note => ({
            label: truncate(note.title),
            value: `${encodePath(folderPath)}|${note.id}`,
            description: note.isShared ? 'Compartilhada' : 'Privada'
        }));

        if (mode === 'view') {
            components.push(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`nota:note:${userId}:${mode}:${encodePath(folderPath)}`)
                        .setPlaceholder('Abrir nota')
                        .addOptions(noteOptions)
                )
            );
        }
    }

    if (mode === 'create') {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`nota:create:${userId}:${mode}:${encodePath(folderPath)}`)
                    .setLabel('Criar nota aqui')
                    .setStyle(ButtonStyle.Primary)
            )
        );
    }

    return { success: true, embed, components };
}

function truncate(text, max = 80) {
    if (!text) return '';
    return text.length > max ? `${text.substring(0, max - 3)}...` : text;
}

function encodePath(pathStr = '') {
    return encodeURIComponent(pathStr);
}

function decodePath(encoded = '') {
    try {
        return decodeURIComponent(encoded);
    } catch (e) {
        return '';
    }
}

function parentPath(pathStr = '') {
    const parts = pathStr.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
}
