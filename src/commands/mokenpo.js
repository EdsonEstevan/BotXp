const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
} = require('discord.js');
const { ensureDailyPokemon, handleGuess, remainingPrizes, suggestNames } = require('../services/mokenpo');

const BUTTON_ID_GUESS = 'mokenpo:guess';
const MODAL_ID_GUESS = 'mokenpo:guessmodal';
const INPUT_ID_PALPITE = 'mokenpo_input_guess';

function arrowFrom(feedbackValue) {
    if (feedbackValue === 'maior' || feedbackValue?.includes('mais')) return '⬆️';
    if (feedbackValue === 'menor' || feedbackValue?.includes('menos')) return '⬇️';
    if (feedbackValue === 'igual') return '↔️';
    return '➖';
}

function dot(isCorrect) {
    return isCorrect ? '🔵' : '🔴';
}

function buildCompactFeedback(result) {
    const target = result.target?.pokemon || { types: [], generationNum: 0, weightKg: 0, heightM: 0 };
    const guess = result.guessInfo || { types: [], generationNum: 0, weightKg: 0, heightM: 0, name: '' };

    const genCorrect = result.feedback.generation === 'igual';
    const genLine = `${dot(genCorrect)} Geração ${guess.generationNum} ${arrowFrom(result.feedback.generation)}`;

    const t1 = (guess.types && guess.types[0]) || '-';
    const t2 = (guess.types && (guess.types[1] || guess.types[0])) || '-';
    const has1 = t1 !== '-' && (target.types || []).includes(t1);
    const has2 = t2 !== '-' && (target.types || []).includes(t2);
    const typeLine = `${dot(has1)} Tipo1: ${t1.toUpperCase()}   ${dot(has2)} Tipo2: ${t2.toUpperCase()}`;

    const weightCorrect = result.feedback.weight === 'igual';
    const heightCorrect = result.feedback.height === 'igual';
    const weightLine = `${dot(weightCorrect)} Peso ${guess.weightKg.toFixed(2)}kg ${arrowFrom(result.feedback.weight)}`;
    const heightLine = `${dot(heightCorrect)} Altura ${guess.heightM.toFixed(2)}m ${arrowFrom(result.feedback.height)}`;

    return [genLine, typeLine, weightLine, heightLine].join('\n');
}

function prizesText(winnersLen) {
    const rem = remainingPrizes(winnersLen);
    return rem.map(v => `${v} moedas`).join(', ');
}

function buildMainEmbed(current) {
    return new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle('Mokenpo — Pokémon do dia')
        .setDescription('Adivinhe o Pokémon do dia (gerações I a IX). Use o botão para chutar quantas vezes quiser. Feedback é privado.')
        .addFields(
            { name: 'Dicas', value: 'Após cada palpite: geração maior/menor/igual, combinação de tipos, peso e altura (mais/menos/igual).' },
            { name: 'Prêmios', value: '1º 1000, 2º 500, 3º 250, demais 50' },
            { name: 'Prêmios restantes hoje', value: prizesText(current.winners.length) },
        );
}

function buildButtons(prefill = '') {
    const clean = (prefill || '').slice(0, 30).replace(/[:]/g, '');
    const cid = clean ? `${BUTTON_ID_GUESS}:${clean}` : BUTTON_ID_GUESS;
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(cid).setLabel('Dar palpite').setStyle(ButtonStyle.Primary)
    )];
}

async function buildSpriteAttachment(spriteUrl) {
    if (!spriteUrl) return { files: [], imageUrl: null, content: null, status: 'no_url' };
    try {
        const res = await fetch(spriteUrl);
        if (!res.ok) throw new Error('fetch_sprite_failed');
        const buf = Buffer.from(await res.arrayBuffer());
        const attachment = new AttachmentBuilder(buf, { name: 'pokemon.png' });
        return { files: [attachment], imageUrl: 'attachment://pokemon.png', content: spriteUrl, status: 'attached_file' };
    } catch (err) {
        console.error('[Mokenpo] Falha ao baixar sprite', err?.message || err);
        return { files: [], imageUrl: spriteUrl, content: spriteUrl, status: 'fallback_url' };
    }
}

async function buildResultPayload(result, guessName) {
    const fb = buildCompactFeedback(result);
    const correctMsg = result.correct ? '✅ Você acertou!' : '❌ Você errou.';
    const embed = new EmbedBuilder()
        .setColor(result.correct ? '#00cc66' : '#ff5555')
        .setTitle('Resultado do palpite')
        .setDescription(`${correctMsg}\n${fb}`);

    let files = [];
    let content;

    if (result.correct) {
        embed.addFields({ name: 'Prêmio', value: `${result.prize} moedas`, inline: true });
        const sprite = result.target?.pokemon?.sprite;
        const spriteData = await buildSpriteAttachment(sprite);
        if (spriteData.status !== 'attached_file') {
            console.error('[Mokenpo] Sprite não anexada na resposta', { status: spriteData.status, sprite });
        }
        files = spriteData.files;
        if (spriteData.imageUrl) embed.setImage(spriteData.imageUrl);
        const contentParts = [];
        if (spriteData.content) contentParts.push(spriteData.content);
        if (spriteData.status !== 'attached_file') contentParts.push(`[debug] Sprite não foi anexada (status: ${spriteData.status}). Se não ver a imagem, abra o link acima.`);
        if (contentParts.length) content = contentParts.join('\n');
    }

    return { content, embeds: [embed], components: buildButtons(guessName), files };
}

async function openGuessModal(interaction, prefill = '') {
    const modal = new ModalBuilder()
        .setCustomId(MODAL_ID_GUESS)
        .setTitle('Seu palpite de Pokémon');

    const input = new TextInputBuilder()
        .setCustomId(INPUT_ID_PALPITE)
        .setLabel('Nome do Pokémon')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
        .setPlaceholder('ex: charizard');

    if (prefill) input.setValue(prefill);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mokenpo')
        .setDescription('Adivinhe o Pokémon do dia e ganhe moedas')
        .addStringOption(opt =>
            opt.setName('palpite')
                .setDescription('Pré-preencher um palpite (opcional)')
                .setRequired(false)
                .setAutocomplete(true)),

    async execute(interaction) {
        const prefill = interaction.options.getString('palpite') || '';

        // Se veio palpite direto no slash, resolve sem abrir modal (ephemeral)
        if (prefill) {
            await interaction.deferReply({ ephemeral: true });
            try {
                const result = await handleGuess(interaction.user.id, interaction.user.tag, prefill);
                const payload = await buildResultPayload(result, result.guessInfo?.name);
                await interaction.editReply(payload);

                if (result.correct && result.announcement && interaction.channel?.isTextBased()) {
                    const sprite = result.target?.pokemon?.sprite;
                    const spriteData = await buildSpriteAttachment(sprite);
                    if (spriteData.status !== 'attached_file') {
                        console.error('[Mokenpo] Sprite não anexada no anúncio', { status: spriteData.status, sprite });
                    }
                    const annEmbed = new EmbedBuilder()
                        .setColor('#00cc66')
                        .setTitle('Mokenpo — Acerto!')
                        .setDescription(`${result.announcement.userTag} acertou o Pokémon do dia e ganhou ${result.announcement.prize} moedas!`)
                        .addFields({ name: 'Prêmios restantes', value: prizesText(result.position + 1) });
                    if (spriteData.imageUrl) annEmbed.setImage(spriteData.imageUrl);
                    const content = spriteData.status !== 'attached_file'
                        ? `[debug] Sprite não enviada no anúncio (status: ${spriteData.status}). Link: ${spriteData.content || 'n/d'}`
                        : undefined;
                    await interaction.channel.send({ content, embeds: [annEmbed], files: spriteData.files });
                }
            } catch (err) {
                console.error('[Mokenpo] Erro no palpite direto:', err);
                const msg = err?.message === 'pokemon_not_found'
                    ? 'Não encontrei esse Pokémon na PokéAPI. Verifique o nome e tente novamente.'
                    : 'Erro ao processar palpite. Tente de novo.';
                await interaction.editReply({ content: msg, components: buildButtons(prefill) }).catch(() => {});
            }
            return;
        }

        // Modo padrão: mostra embed público + botão para modal
        const current = await ensureDailyPokemon();
        const embed = buildMainEmbed(current);
        await interaction.reply({ embeds: [embed], components: buildButtons(), ephemeral: false });
    },

    async handleComponent(interaction) {
        if (interaction.customId.startsWith(BUTTON_ID_GUESS)) {
            const parts = interaction.customId.split(':');
            const prefill = parts[2] || parts[1] || '';
            return openGuessModal(interaction, prefill);
        }
    },

    async handleModalSubmit(interaction) {
        if (interaction.customId !== MODAL_ID_GUESS) return;
        const guess = interaction.fields.getTextInputValue(INPUT_ID_PALPITE);
        await interaction.deferReply({ ephemeral: true });

        try {
            const result = await handleGuess(interaction.user.id, interaction.user.tag, guess);
            const payload = await buildResultPayload(result, result.guessInfo?.name);
            await interaction.editReply(payload);

            if (result.correct && result.announcement && interaction.channel?.isTextBased()) {
                try {
                    const sprite = result.target?.pokemon?.sprite;
                    const spriteData = await buildSpriteAttachment(sprite);
                    if (spriteData.status !== 'attached_file') {
                        console.error('[Mokenpo] Sprite não anexada no anúncio', { status: spriteData.status, sprite });
                    }
                    const annEmbed = new EmbedBuilder()
                        .setColor('#00cc66')
                        .setTitle('Mokenpo — Acerto!')
                        .setDescription(`${result.announcement.userTag} acertou o Pokémon do dia e ganhou ${result.announcement.prize} moedas!`)
                        .addFields({ name: 'Prêmios restantes', value: prizesText(result.position + 1) });
                    if (spriteData.imageUrl) annEmbed.setImage(spriteData.imageUrl);
                    const content = spriteData.status !== 'attached_file'
                        ? `[debug] Sprite não enviada no anúncio (status: ${spriteData.status}). Link: ${spriteData.content || 'n/d'}`
                        : undefined;
                    await interaction.channel.send({ content, embeds: [annEmbed], files: spriteData.files });
                } catch (errSend) {
                    console.error('[Mokenpo] Falha ao anunciar acerto', errSend?.code || errSend?.message || errSend);
                }
            }
        } catch (err) {
            console.error('[Mokenpo] Erro no palpite:', err);
            const msg = err?.message === 'pokemon_not_found'
                ? 'Não encontrei esse Pokémon na PokéAPI. Verifique o nome e tente novamente.'
                : 'Erro ao processar palpite. Tente de novo.';
            const payload = { content: msg, components: buildButtons(guess), ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(payload).catch(() => {});
            } else {
                await interaction.reply(payload).catch(() => {});
            }
        }
    },

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const term = focused.value || '';
        try {
            const list = await suggestNames(term, 25);
            const choices = list.map(name => ({ name, value: name })).slice(0, 25);
            return interaction.respond(choices);
        } catch (err) {
            console.error('[Mokenpo] autocomplete error', err);
            return interaction.respond([]);
        }
    },
};
