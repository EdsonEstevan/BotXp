const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

const DESKTOP_BG = 'https://i.imgur.com/2jzC7kW.jpeg';
const FRAME_WIDTH = 38;
const folders = {
    'Meu PC': ['Disco C:', 'Downloads', 'Imagens', 'Projetos'],
    'Downloads': ['instalador_bot.exe', 'meme_pack.zip', 'readme.txt'],
    'Imagens': ['wallpaper.png', 'galos.jpg', 'pikachu.gif'],
    'Projetos': ['bot-xp/', 'api-clash/', 'notes-app/'],
    'Disco C:': ['Windows/', 'Users/', 'Arquivos de Programas/'],
};

function frame(title, bodyLines, footerLines = []) {
    const pad = (text) => {
        const trimmed = text ?? '';
        return trimmed.length > FRAME_WIDTH - 4
            ? trimmed.slice(0, FRAME_WIDTH - 4)
            : trimmed.padEnd(FRAME_WIDTH - 4, ' ');
    };
    const divider = '├' + '─'.repeat(FRAME_WIDTH - 2) + '┤';
    const lines = [
        '┌' + '─'.repeat(FRAME_WIDTH - 2) + '┐',
        `│ ${pad(title)} │`,
        divider,
        ...bodyLines.map((l) => `│ ${pad(l)} │`),
    ];
    if (footerLines.length) {
        lines.push(divider, ...footerLines.map((l) => `│ ${pad(l)} │`));
    }
    lines.push('└' + '─'.repeat(FRAME_WIDTH - 2) + '┘');
    return ['```', ...lines, '```'].join('\n');
}

function desktopPayload(userId) {
    const desktopWindow = frame('Bot XP — Área de Trabalho', [
        '🗂️  Explorer        🎮  Tetris',
        '🧮  Calculadora     📁  Arquivos',
        '🖥️  Voltar p/ desktop',
        'Fundo: vaporwave (mock)',
    ], [
        '⊞ Iniciar | 🗂️ | 🧮 | 🎮 | 📁 | 🔈 | 🕓 12:00',
    ]);

    const embed = new EmbedBuilder()
        .setColor('#0a7cff')
        .setTitle('Desktop do bot')
        .setDescription(desktopWindow)
        .setImage(DESKTOP_BG)
        .setFooter({ text: 'Interface mock; todos os cliques são seguros e apenas você vê.' });

    return {
        embeds: [embed],
        components: buildDesktopButtons(userId),
        ephemeral: true,
    };
}

function buildDesktopButtons(userId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`pc:open:explorer:${userId}`).setLabel('Explorer').setEmoji('🗂️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`pc:open:calc:${userId}`).setLabel('Calculadora').setEmoji('🧮').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`pc:open:tetris:${userId}:0:0`).setLabel('Tetris').setEmoji('🎮').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`pc:open:files:${userId}`).setLabel('Arquivos').setEmoji('📁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`pc:open:desktop:${userId}`).setLabel('Área de trabalho').setEmoji('🖥️').setStyle(ButtonStyle.Secondary)
        ),
    ];
}

function explorerPayload(userId) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`pc:folder:${userId}`)
        .setPlaceholder('Escolha uma pasta')
        .addOptions(
            { label: 'Meu PC', value: 'Meu PC', emoji: '💻' },
            { label: 'Downloads', value: 'Downloads', emoji: '⬇️' },
            { label: 'Imagens', value: 'Imagens', emoji: '🖼️' },
            { label: 'Projetos', value: 'Projetos', emoji: '🛠️' },
            { label: 'Disco C:', value: 'Disco C:', emoji: '💽' },
        );

    const embed = new EmbedBuilder()
        .setColor('#1f6feb')
        .setTitle('Explorer')
        .setDescription(frame('Explorer', [
            'Escolha uma pasta no menu.',
            'Pastas rápidas na barra inferior.',
        ], ['⌂ Meu PC | ⬇️ Downloads | 🖼️ Imagens | 🛠️ Projetos | 💽 Disco C:']));

    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu), ...buildDesktopButtons(userId)] };
}

function folderEmbed(path) {
    const items = folders[path] || [];
    const lines = items.length ? items.map(i => `• ${i}`) : ['(vazio)'];
    const embed = new EmbedBuilder()
        .setColor('#1f6feb')
        .setTitle(`Explorer — ${path}`)
        .setDescription(frame(`Explorer — ${path}`, lines, ['⌂ Voltar pelo menu acima']));
    return embed;
}

function calcModal(userId) {
    const modal = new ModalBuilder().setCustomId(`pc:calcsubmit:${userId}`).setTitle('Calculadora');
    const input = new TextInputBuilder()
        .setCustomId('pc_calc_expr')
        .setLabel('Expressão (ex: (2+3)*4/5)')
        .setPlaceholder('Use + - * / % ()')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(60);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

function calcAppPayload(userId) {
    const embed = new EmbedBuilder()
        .setColor('#0ea5e9')
        .setTitle('Calculadora')
        .setDescription(frame('Calculadora', [
            'Suporta 0-9 + - * / % ( )',
            'Ex: (2+3)*4/5',
            'Clique no botão para digitar.',
        ]));
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pc:calcmodal:${userId}`).setLabel('Abrir calculadora').setEmoji('🧮').setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], components: [row, ...buildDesktopButtons(userId)] };
}

function tetrisPayload(userId, score = 0, lines = 0) {
    const board = [
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┃ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ┃',
        '┗━━━━━━━━━━━━━━━━━━┛',
    ];

    // Pequena “animação” textual baseada no score
    const noise = (score + lines) % 7;
    for (let i = 0; i < noise && i < board.length - 1; i++) {
        board[i] = board[i].replace('▢', '▓');
    }

    const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setTitle('Tetris (mock)')
        .setDescription(frame('Tetris', [
            ...board,
            `Score: ${score}`,
            `Linhas: ${lines}`,
            'Clique em dropar peça para somar pontos.',
        ], ['Setas virtuais: ← ↓ → | ⏹️']))
        .setFooter({ text: 'Sem persistência real — apenas diversão rápida.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pc:tetris:${userId}:${score}:${lines}`)
            .setLabel('Dropar peça')
            .setEmoji('🧱')
            .setStyle(ButtonStyle.Success)
    );
    return { embeds: [embed], components: [row, ...buildDesktopButtons(userId)] };
}

function filesPayload(userId) {
    const embed = new EmbedBuilder()
        .setColor('#fbbf24')
        .setTitle('Pasta de arquivos')
        .setDescription(frame('Arquivos', [
            'Recentes:',
            '• resume.pdf',
            '• notas.txt',
            '• sprint-plan.md',
            'Fixos:',
            '• todo.md',
            '• ideias.md',
            '• screenshots/',
        ], ['Abra Explorer para mais pastas']));
    return { embeds: [embed], components: buildDesktopButtons(userId) };
}

function assertOwner(interaction, ownerId) {
    if (interaction.user.id !== ownerId) {
        return false;
    }
    return true;
}

function evalExpression(expr) {
    const safe = expr.replace(/\s+/g, '');
    if (!/^[-+*/%().0-9]+$/.test(safe)) {
        throw new Error('Expressão inválida. Use apenas números e + - * / % ( ).');
    }
    // eslint-disable-next-line no-new-func
    const result = Function(`return (${safe})`)();
    if (!Number.isFinite(result)) {
        throw new Error('Resultado não numérico.');
    }
    return Math.round((result + Number.EPSILON) * 10000) / 10000;
}

module.exports = {
    data: new SlashCommandBuilder().setName('pc').setDescription('Abre um desktop simulado com mini apps'),

    async execute(interaction) {
        const payload = desktopPayload(interaction.user.id);
        await interaction.reply({ ...payload, ephemeral: true });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'pc') return;
        const action = parts[1];
        const userId = parts[parts.length - 1];
        if (!assertOwner(interaction, userId)) {
            return interaction.reply({ content: 'Abra seu próprio /pc para usar estes controles.', ephemeral: true });
        }

        if (action === 'open') {
            const app = parts[2];
            if (app === 'explorer') return interaction.update(explorerPayload(userId));
            if (app === 'calc') return interaction.update(calcAppPayload(userId));
            if (app === 'tetris') {
                const score = Number(parts[3]) || 0;
                const lines = Number(parts[4]) || 0;
                return interaction.update(tetrisPayload(userId, score, lines));
            }
            if (app === 'files') return interaction.update(filesPayload(userId));
            if (app === 'desktop') return interaction.update(desktopPayload(userId));
        }

        if (action === 'folder') {
            const path = interaction.values?.[0] || 'Meu PC';
            const embed = folderEmbed(path);
            return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(interaction.component), ...buildDesktopButtons(userId)] });
        }

        if (action === 'calcmodal') {
            const modal = calcModal(userId);
            return interaction.showModal(modal);
        }

        if (action === 'tetris') {
            const score = Number(parts[3]) || 0;
            const lines = Number(parts[4]) || 0;
            const addScore = Math.floor(Math.random() * 120) + 10;
            const addLines = Math.floor(Math.random() * 3) + 1;
            const nextScore = score + addScore;
            const nextLines = lines + addLines;
            return interaction.update(tetrisPayload(userId, nextScore, nextLines));
        }
    },

    async handleModalSubmit(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'pc' || parts[1] !== 'calcsubmit') return;
        const userId = parts[2];
        if (!assertOwner(interaction, userId)) {
            return interaction.reply({ content: 'Abra seu próprio /pc para usar estes controles.', ephemeral: true });
        }
        const expr = interaction.fields.getTextInputValue('pc_calc_expr');
        try {
            const result = evalExpression(expr);
            const embed = new EmbedBuilder()
                .setColor('#0ea5e9')
                .setTitle('Resultado')
                .setDescription(`${expr} = **${result}**`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: err.message || 'Erro ao calcular.', ephemeral: true });
        }
    },
};
