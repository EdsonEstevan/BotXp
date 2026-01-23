const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jogos')
        .setDescription('Minigames para ganhar moedas!')
        .addSubcommand(sub =>
            sub.setName('coinflip')
                .setDescription('Cara ou Coroa! Aposte moedas.')
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Quantidade de moedas a apostar')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('dadao')
                .setDescription('Role um dado (1-6) e ganhe até 6x!')
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Quantidade de moedas a apostar')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('numero')
                        .setDescription('Número que você escolhe (1-6)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(6)))
        .addSubcommand(sub =>
            sub.setName('adivinhe')
                .setDescription('Adivinhe um número entre 1-10!')
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Quantidade de moedas a apostar')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('roleta')
                .setDescription('Jogue na roleta de slots!')
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Quantidade de moedas a apostar')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('ppt')
                .setDescription('Pedra, Papel ou Tesoura contra o bot!')
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Quantidade de moedas a apostar')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('forca')
                .setDescription('Jogue forca e ganhe moedas!')
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Moedas a ganhar se acertar')
                        .setRequired(true)
                        .setMinValue(10)))
        .addSubcommand(sub =>
            sub.setName('roubo')
                .setDescription('🔓 Tente roubar moedas de um amigo!')
                .addUserOption(option =>
                    option.setName('alvo')
                        .setDescription('Qual amigo você quer roubar?')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantidade')
                        .setDescription('Quantas moedas tentar roubar? (máx: 1000)')
                        .setRequired(false))),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            const commandFile = require(`./games/${subcommand}`);
            await commandFile.execute(interaction, client);
        } catch (err) {
            console.error(`Erro ao executar jogo ${subcommand}:`, err);
            await interaction.reply({
                content: '❌ Erro ao executar o jogo.',
                ephemeral: true
            });
        }
    },
};
