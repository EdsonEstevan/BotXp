const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getActiveEffectsDescription, getUserEffects } = require('../services/effects');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('efeitos')
        .setDescription('🔮 Veja seus efeitos ativos do Gacha'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const effects = getUserEffects(userId);

        if (effects.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('🔮 Efeitos Ativos')
                .setDescription('Você não tem nenhum efeito ativo no momento.')
                .setFooter({ text: 'Puxe itens do Gacha para obter efeitos!' });

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const effectDescriptions = {
            'health_boost': { name: '❤️ Boost de Saúde', emoji: '❤️' },
            'damage_boost': { name: '⚔️ Boost de Dano', emoji: '⚔️' },
            'defense_boost': { name: '🛡️ Boost de Defesa', emoji: '🛡️' },
            'eternal_buff': { name: '✨ Buff Eterno', emoji: '✨' },
            'dodge_buff': { name: '🎯 Buff de Esquiva', emoji: '🎯' },
            'steal_multiplier': { name: '💰 Multiplicador de Saque', emoji: '💰' },
            'immunity': { name: '🛡️ Imunidade', emoji: '🛡️' },
            'fragment_collected': { name: '📿 Fragmento', emoji: '📿' },
            'secret_room_unlocked': { name: '🔑 Sala Secreta Desbloqueada', emoji: '🔑' },
            'power_symbol': { name: '⭐ Símbolo de Poder', emoji: '⭐' },
        };

        const embed = new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🔮 Seus Efeitos Ativos')
            .setThumbnail(interaction.user.displayAvatarURL());

        const fields = effects.map(effect => {
            const desc = effectDescriptions[effect.type] || { name: effect.type, emoji: '❓' };
            let duration = 'Permanente ⏳';
            
            if (effect.duration) {
                const timeLeft = effect.duration - (Date.now() - effect.startTime);
                if (timeLeft > 0) {
                    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                    duration = `${hours}h ${minutes}m`;
                }
            }

            let value = `⏱️ **Duração:** ${duration}`;
            if (effect.value !== null && effect.value !== undefined) {
                value += `\n📊 **Valor:** ${effect.value}`;
            }

            return { name: `${desc.emoji} ${desc.name}`, value, inline: false };
        });

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        embed.setFooter({ text: 'Reclame itens do Gacha para ganhar mais efeitos!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
