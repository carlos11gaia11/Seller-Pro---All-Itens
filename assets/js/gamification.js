(function exposeSellerProGamification(global) {
  'use strict';
const LEVELS = [
  { level: 1, start: 0, title: 'Iniciante' },
  { level: 2, start: 250, title: 'Especialista em formação' },
  { level: 3, start: 600, title: 'Especialista' },
  { level: 4, start: 1100, title: 'Especialista avançado' },
  { level: 5, start: 1800, title: 'Referência operacional' },
  { level: 6, start: 2700, title: 'Mentor Seller Pro' },
  { level: 7, start: 3900, title: 'Elite Seller Pro' }
];

const XP_WEIGHTS = Object.freeze({
  deliveredStores: 30,
  finalizedSales: 20,
  completedTasks: 12,
  activeSellers: 5
});

function safeCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function toIsoDay(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDay(isoDay, amount) {
  const [year, month, day] = isoDay.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getStreakFromDates(dates = [], referenceDate = new Date()) {
  const uniqueDays = new Set((Array.isArray(dates) ? dates : []).map(toIsoDay).filter(Boolean));
  let cursor = toIsoDay(referenceDate);
  let streak = 0;

  while (cursor && uniqueDays.has(cursor)) {
    streak += 1;
    cursor = shiftIsoDay(cursor, -1);
  }

  return streak;
}

function getLevelFromXp(value) {
  const xp = safeCount(value);
  let current = LEVELS[0];

  for (const level of LEVELS) {
    if (xp >= level.start) current = level;
    else break;
  }

  const currentIndex = LEVELS.findIndex(level => level.level === current.level);
  const next = LEVELS[currentIndex + 1];

  if (!next) {
    return {
      level: current.level,
      title: current.title,
      currentXp: xp,
      levelStartXp: current.start,
      nextLevelXp: null,
      progress: 100,
      xpToNextLevel: 0
    };
  }

  const range = next.start - current.start;
  const progress = Math.max(0, Math.min(100, Math.round(((xp - current.start) / range) * 100)));

  return {
    level: current.level,
    title: current.title,
    currentXp: xp,
    levelStartXp: current.start,
    nextLevelXp: next.start,
    progress,
    xpToNextLevel: Math.max(0, next.start - xp)
  };
}

function getAchievements(input = {}) {
  const stats = {
    deliveredStores: safeCount(input.deliveredStores),
    finalizedSales: safeCount(input.finalizedSales),
    completedTasks: safeCount(input.completedTasks),
    activeSellers: safeCount(input.activeSellers),
    streak: safeCount(input.streak)
  };

  return [
    {
      id: 'first-delivery',
      icon: 'rocket',
      title: 'Primeira entrega',
      description: 'Concluiu a primeira loja pronta.',
      unlocked: stats.deliveredStores >= 1,
      progress: Math.min(stats.deliveredStores, 1),
      target: 1
    },
    {
      id: 'ten-deliveries',
      icon: 'store',
      title: 'Ritmo de entrega',
      description: 'Concluiu 10 lojas prontas.',
      unlocked: stats.deliveredStores >= 10,
      progress: Math.min(stats.deliveredStores, 10),
      target: 10
    },
    {
      id: 'sales-finisher',
      icon: 'check',
      title: 'Ciclo completo',
      description: 'Finalizou 10 vendas acompanhadas.',
      unlocked: stats.finalizedSales >= 10,
      progress: Math.min(stats.finalizedSales, 10),
      target: 10
    },
    {
      id: 'task-master',
      icon: 'tasks',
      title: 'Mestre das tarefas',
      description: 'Concluiu 25 tarefas operacionais.',
      unlocked: stats.completedTasks >= 25,
      progress: Math.min(stats.completedTasks, 25),
      target: 25
    },
    {
      id: 'portfolio-builder',
      icon: 'users',
      title: 'Carteira em crescimento',
      description: 'Acompanha 15 sellers ativos.',
      unlocked: stats.activeSellers >= 15,
      progress: Math.min(stats.activeSellers, 15),
      target: 15
    },
    {
      id: 'week-streak',
      icon: 'flame',
      title: 'Semana consistente',
      description: 'Registrou atividade por 7 dias consecutivos.',
      unlocked: stats.streak >= 7,
      progress: Math.min(stats.streak, 7),
      target: 7
    }
  ];
}

function calculateGamification(input = {}) {
  const stats = {
    deliveredStores: safeCount(input.deliveredStores),
    finalizedSales: safeCount(input.finalizedSales),
    completedTasks: safeCount(input.completedTasks),
    activeSellers: safeCount(input.activeSellers)
  };

  const activityDates = Array.isArray(input.activityDates) ? input.activityDates : [];
  const latestActivityDay = activityDates.map(toIsoDay).filter(Boolean).sort().at(-1);
  const streakReference = input.referenceDate || latestActivityDay || new Date();
  const streak = getStreakFromDates(activityDates, streakReference);
  const xp = Object.entries(XP_WEIGHTS).reduce(
    (total, [metric, weight]) => total + stats[metric] * weight,
    0
  );
  const level = getLevelFromXp(xp);
  const achievements = getAchievements({ ...stats, streak });

  return {
    xp,
    level,
    streak,
    stats,
    achievements,
    weights: { ...XP_WEIGHTS }
  };
}


  global.SellerProGamification = Object.freeze({
    LEVELS,
    XP_WEIGHTS,
    getStreakFromDates,
    getLevelFromXp,
    getAchievements,
    calculateGamification
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
