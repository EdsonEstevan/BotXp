const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const { startChallenge } = require('./pokequiz');

const SCHEDULE_FILE = path.join(__dirname, '..', '..', 'pokequiz_schedules.json');
const activeJobs = new Map();

function loadSchedules() {
    try {
        if (fs.existsSync(SCHEDULE_FILE)) return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    } catch (err) {
        console.error('[PokeQuizScheduler] Erro ao ler agendamentos', err);
    }
    return [];
}

function saveSchedules(list) {
    try {
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error('[PokeQuizScheduler] Erro ao salvar agendamentos', err);
    }
}

function createJob(client, job) {
    const { id, channelId, hour, minute, genMin, genMax } = job;
    const cron = `${minute} ${hour} * * *`;
    const sched = schedule.scheduleJob(cron, async () => {
        try {
            console.log(`[PokeQuizScheduler] disparando desafio #${id} no canal ${channelId}`);
            await startChallenge(client, channelId, genMin, genMax);
        } catch (err) {
            console.error('[PokeQuizScheduler] erro no agendamento', id, err?.message || err);
        }
    });
    activeJobs.set(id, sched);
}

function initPokeQuizScheduler(client) {
    const list = loadSchedules();
    list.forEach(job => {
        createJob(client, job);
        console.log(`[PokeQuizScheduler] agendamento #${job.id} ativo para ${job.hour}:${String(job.minute).padStart(2, '0')} canal ${job.channelId}`);
    });
}

function addPokeQuizSchedule(client, channelId, hour, minute, genMin = 1, genMax = 9) {
    const list = loadSchedules();
    const id = list.length ? Math.max(...list.map(j => j.id)) + 1 : 1;
    const job = { id, channelId, hour, minute, genMin, genMax };
    list.push(job);
    saveSchedules(list);
    createJob(client, job);
    return job;
}

function listPokeQuizSchedules() {
    return loadSchedules();
}

function removePokeQuizSchedule(id) {
    const list = loadSchedules();
    const idx = list.findIndex(j => j.id === id);
    if (idx === -1) return false;
    const job = activeJobs.get(id);
    if (job) job.cancel();
    activeJobs.delete(id);
    list.splice(idx, 1);
    saveSchedules(list);
    return true;
}

module.exports = {
    initPokeQuizScheduler,
    addPokeQuizSchedule,
    listPokeQuizSchedules,
    removePokeQuizSchedule,
};
