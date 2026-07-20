import test from 'node:test';
import assert from 'node:assert/strict';

await import('../assets/js/gamification.js');

const {
  calculateGamification,
  getAchievements,
  getLevelFromXp,
  getStreakFromDates
} = globalThis.SellerProGamification;

test('getLevelFromXp starts at level 1 and reports progress to next level', () => {
  assert.deepEqual(getLevelFromXp(0), {
    level: 1,
    title: 'Iniciante',
    currentXp: 0,
    levelStartXp: 0,
    nextLevelXp: 250,
    progress: 0,
    xpToNextLevel: 250
  });
});

test('getLevelFromXp advances exactly at a level threshold', () => {
  const result = getLevelFromXp(250);
  assert.equal(result.level, 2);
  assert.equal(result.title, 'Especialista em formação');
  assert.equal(result.progress, 0);
  assert.equal(result.xpToNextLevel, 350);
});

test('calculateGamification awards deterministic XP from operational metrics', () => {
  const result = calculateGamification({
    deliveredStores: 4,
    finalizedSales: 2,
    completedTasks: 3,
    activeSellers: 5,
    activityDates: ['2026-07-20', '2026-07-19', '2026-07-18']
  });

  assert.equal(result.xp, 4 * 30 + 2 * 20 + 3 * 12 + 5 * 5);
  assert.equal(result.stats.deliveredStores, 4);
  assert.equal(result.streak, 3);
});

test('getStreakFromDates ignores duplicates and counts consecutive days from reference day', () => {
  assert.equal(
    getStreakFromDates(
      ['2026-07-20', '2026-07-20', '2026-07-19', '2026-07-18', '2026-07-16'],
      new Date('2026-07-20T12:00:00-03:00')
    ),
    3
  );
});

test('getAchievements unlocks milestones and keeps locked achievements visible', () => {
  const achievements = getAchievements({
    deliveredStores: 10,
    finalizedSales: 1,
    completedTasks: 25,
    activeSellers: 15,
    streak: 7
  });

  const unlockedIds = achievements.filter(item => item.unlocked).map(item => item.id);
  assert.ok(unlockedIds.includes('first-delivery'));
  assert.ok(unlockedIds.includes('ten-deliveries'));
  assert.ok(unlockedIds.includes('week-streak'));
  assert.ok(achievements.some(item => !item.unlocked));
});

test('calculateGamification sanitizes negative and invalid metric values', () => {
  const result = calculateGamification({
    deliveredStores: -3,
    finalizedSales: Number.NaN,
    completedTasks: '2',
    activeSellers: null,
    activityDates: []
  });

  assert.equal(result.xp, 24);
  assert.equal(result.stats.deliveredStores, 0);
  assert.equal(result.stats.completedTasks, 2);
});
