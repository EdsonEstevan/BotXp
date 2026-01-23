const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, addBalance } = require('../../services/economy');

// Palavras para a forca
const words = [
    'discord', 'javascript', 'programacao', 'desenvolvimento', 'bot', 
    'usuario', 'comunidade', 'servidor', 'computador', 'tecnologia',
    'inteligencia', 'algoritmo', 'internet', 'codigo', 'software',
    'hardware', 'banco', 'dados', 'seguranca', 'criptografia'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forca')
        .setDescription('Jogue forca e ganhe moedas!')
        .addIntegerOption(option =>
            option.setName('aposta')
                .setDescription('Quantidade de moedas a ganhar se acertar')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const reward = interaction.options.getInteger('aposta');
        
        const word = words[Math.floor(Math.random() * words.length)].toUpperCase();
        const guessed = new Set();
        const maxWrong = 6;
        let wrongGuesses = 0;
        
        const getDisplay = () => {
            return word.split('').map(letter => guessed.has(letter) ? letter : '_').join(' ');
        };
        
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const buttons = alphabet.map(letter =>
            new ButtonBuilder()
                .setCustomId(`forca_${letter}_${userId}_${word}_${reward}_${wrongGuesses}`)
                .setLabel(letter)
                .setStyle(ButtonStyle.Secondary)
        );

        // Discord permite no máximo 5 componentes por linha
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }
        
        const hangman = [
            '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========\n```',
            '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========\n```',
            '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========\n```',
            '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========\n```',
            '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========\n```',
            '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========\n```',
            '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========\n```'
        ];
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎮 Forca')
            .setDescription(`${getDisplay()}\n\n${hangman[wrongGuesses]}\n\nErros: ${wrongGuesses}/${maxWrong}`)
            .addFields(
                { name: 'Prêmio', value: `**${reward}** moedas se acertar!`, inline: false }
            )
            .setFooter({ text: 'Escolha uma letra' });
        
        await interaction.reply({
            embeds: [embed],
            components: rows,
            ephemeral: false
        });
    },
};
