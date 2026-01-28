const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const { fetchMeme, BR_SUBREDDITS } = require('./memeApi');
const { EmbedBuilder } = require('discord.js');

const SCHEDULES_FILE = path.join(__dirname, '..', '..', 'schedules.json');
const activeJobs = new Map(); // jobId -> schedule.Job

function loadSchedules() {
    try {
        if (fs.existsSync(SCHEDULES_FILE)) {
            const data = fs.readFileSync(SCHEDULES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[Scheduler] Erro ao carregar agendamentos:', err);
    }
    return [];
}

function saveSchedules(schedules) {
    try {
        fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf8');
    } catch (err) {
        console.error('[Scheduler] Erro ao salvar agendamentos:', err);
    }
}

function createScheduledJob(client, jobData) {
    const { id, channelId, hour, minute, subreddit } = jobData;
    
    // Cron: minuto hora * * * (todo dia nesse horário)
    const cronExpression = `${minute} ${hour} * * *`;
    
    const job = schedule.scheduleJob(cronExpression, async () => {
        console.log(`[Scheduler] Enviando meme agendado #${id} para canal ${channelId}`);
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                console.error(`[Scheduler] Canal ${channelId} não encontrado ou não é texto.`);
                return;
            }
            
            const memeSet = new Set();
            const memeData = await fetchMeme({ subreddit, subreddits: BR_SUBREDDITS, memeSet });
            
            if (!memeData) {
                await channel.send('Não foi possível obter um meme agendado. 😢');
                return;
            }
            
            const { embed, content } = memeData;
            await channel.send({ content, embeds: [embed] });
            console.log(`[Scheduler] Meme agendado #${id} enviado com sucesso!`);
        } catch (err) {
            console.error(`[Scheduler] Erro ao enviar meme agendado #${id}:`, err);
        }
    });
    
    activeJobs.set(id, job);
    return job;
}

function initScheduler(client) {
    const schedules = loadSchedules();
    console.log(`[Scheduler] Carregando ${schedules.length} agendamento(s)...`);
    
    schedules.forEach(jobData => {
        createScheduledJob(client, jobData);
        console.log(`[Scheduler] Agendamento #${jobData.id} ativado: ${jobData.hour}:${String(jobData.minute).padStart(2, '0')} no canal ${jobData.channelId}`);
    });
}

function addSchedule(client, channelId, hour, minute, subreddit = 'HUEstation') {
    const schedules = loadSchedules();
    const id = schedules.length > 0 ? Math.max(...schedules.map(s => s.id)) + 1 : 1;
    
    const newSchedule = { id, channelId, hour, minute, subreddit };
    schedules.push(newSchedule);
    saveSchedules(schedules);
    
    createScheduledJob(client, newSchedule);
    console.log(`[Scheduler] Novo agendamento #${id} criado: ${hour}:${String(minute).padStart(2, '0')}`);
    
    return newSchedule;
}

function removeSchedule(scheduleId) {
    const schedules = loadSchedules();
    const index = schedules.findIndex(s => s.id === scheduleId);
    
    if (index === -1) return false;
    
    // Cancela o job ativo
    const job = activeJobs.get(scheduleId);
    if (job) {
        job.cancel();
        activeJobs.delete(scheduleId);
    }
    
    schedules.splice(index, 1);
    saveSchedules(schedules);
    console.log(`[Scheduler] Agendamento #${scheduleId} removido.`);
    
    return true;
}

function listSchedules() {
    return loadSchedules();
}

module.exports = {
    initScheduler,
    addSchedule,
    removeSchedule,
    listSchedules,
};
