const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { startChallenge, submitGuess } = require('../services/pokequiz');
const { addPokeQuizSchedule, listPokeQuizSchedules } = require('../services/pokequizScheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qualpokemon')
        .setDescription('Silhueta para adivinhar Pokémon')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Inicia um desafio agora')
                .addIntegerOption(o => o.setName('gen_min').setDescription('Geração mínima (1-9)').setMinValue(1).setMaxValue(9))
                .addIntegerOption(o => o.setName('gen_max').setDescription('Geração máxima (1-9)').setMinValue(1).setMaxValue(9))
                .addChannelOption(o => o.setName('canal').setDescription('Canal para enviar o desafio'))
        )
        .addSubcommand(sub =>
            sub.setName('agendar')
                .setDescription('Agenda desafios diários')
                .addChannelOption(o => o.setName('canal').setDescription('Canal para enviar').setRequired(true))
                .addIntegerOption(o => o.setName('hora').setDescription('Hora (0-23)').setRequired(true).setMinValue(0).setMaxValue(23))
                .addIntegerOption(o => o.setName('minuto').setDescription('Minuto (0-59)').setRequired(true).setMinValue(0).setMaxValue(59))
                .addIntegerOption(o => o.setName('gen_min').setDescription('Geração mínima (1-9)').setMinValue(1).setMaxValue(9))
                .addIntegerOption(o => o.setName('gen_max').setDescription('Geração máxima (1-9)').setMinValue(1).setMaxValue(9))
        )
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Lista agendamentos de desafios')
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            await interaction.deferReply({ ephemeral: true });
            const genMin = interaction.options.getInteger('gen_min') ?? 1;
            const genMax = interaction.options.getInteger('gen_max') ?? 9;
            if (genMin > genMax) return interaction.editReply('gen_min não pode ser maior que gen_max.');
            const channel = interaction.options.getChannel('canal') || interaction.channel;
            try {
                const res = await startChallenge(client, channel.id, genMin, genMax);
                await interaction.editReply(`Desafio iniciado em <#${res.channelId}> (gerações ${genMin}-${genMax}).`);
            } catch (err) {
                console.error('[QualPokemon] erro start', err?.message || err);
                await interaction.editReply('Erro ao iniciar desafio.');
            }
            return;
        }

        if (sub === 'agendar') {
            await interaction.deferReply({ ephemeral: true });
            const channel = interaction.options.getChannel('canal');
            const hour = interaction.options.getInteger('hora');
            const minute = interaction.options.getInteger('minuto');
            const genMin = interaction.options.getInteger('gen_min') ?? 1;
            const genMax = interaction.options.getInteger('gen_max') ?? 9;
            if (genMin > genMax) return interaction.editReply('gen_min não pode ser maior que gen_max.');
            try {
                const job = addPokeQuizSchedule(client, channel.id, hour, minute, genMin, genMax);
                await interaction.editReply(`Agendado #${job.id} para ${hour}:${String(minute).padStart(2, '0')} em <#${channel.id}> (gens ${genMin}-${genMax}).`);
            } catch (err) {
                console.error('[QualPokemon] erro agendar', err?.message || err);
                await interaction.editReply('Erro ao agendar.');
            }
            return;
        }

        if (sub === 'listar') {
            const list = listPokeQuizSchedules();
            if (!list.length) return interaction.reply({ content: 'Nenhum agendamento.', ephemeral: true });
            const lines = list.map(j => `#${j.id} - ${j.hour}:${String(j.minute).padStart(2, '0')} canal <#${j.channelId}> gens ${j.genMin}-${j.genMax}`);
            return interaction.reply({ content: lines.join('\n'), ephemeral: true });
        }
    },

    async handleComponent(interaction) {
        if (!interaction.customId.startsWith('qualpoke:guess:')) return;
        const [, , challengeId] = interaction.customId.split(':');
        const modal = new ModalBuilder().setCustomId(`qualpoke:modal:${challengeId}`).setTitle('Seu palpite');
        const input = new TextInputBuilder()
            .setCustomId('qualpoke_guess_input')
            .setLabel('Nome do Pokémon')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(30);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction) {
        if (!interaction.customId.startsWith('qualpoke:modal:')) return;
        const [, , challengeId] = interaction.customId.split(':');
        const guess = interaction.fields.getTextInputValue('qualpoke_guess_input');
        await interaction.deferReply({ ephemeral: true });
        try {
            const result = await submitGuess(challengeId, interaction.user.id, interaction.user.tag, guess);
            const status = result.correct ? '✅ Acertou!' : '❌ Errou.';
            const prizeText = result.prize > 0 ? `Prêmio: ${result.prize} moedas.` : result.alreadyWinner ? 'Você já ganhou neste desafio.' : 'Sem prêmio.';
            const remText = result.remaining?.length ? `Prêmios restantes: ${result.remaining.join(', ')}` : 'Sem prêmios restantes.';
            await interaction.editReply({ content: `${status} Você chutou **${guess}**. ${prizeText} ${remText}` });

            const channel = await interaction.client.channels.fetch(result.channelId);
            if (channel?.isTextBased()) {
                const sent = await channel.send(`${interaction.user} chutou **${guess}** — ${result.correct ? '✅' : '❌'} ${result.prize ? `(+${result.prize} moedas)` : ''}`);
                if (result.correct) {
                    setTimeout(() => sent.delete().catch(() => {}), 15000); // feedback temporário para acertos
                }
            }
        } catch (err) {
            console.error('[QualPokemon] erro no palpite', err?.message || err);
            await interaction.editReply({ content: 'Erro ao registrar palpite ou desafio expirado.' });
        }
    },
};
