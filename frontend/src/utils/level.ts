export type LevelData = {
  level: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  percentage: number;
};

export function calculateLevelData(totalXp: number): LevelData {
  const maxLevel = 999;
  let level = 1;
  let remainingXp = totalXp;

  while (level < maxLevel) {
    const xpNeeded = Math.floor(1000 * Math.pow(1.2, level - 1));
    if (remainingXp >= xpNeeded) {
      remainingXp -= xpNeeded;
      level++;
    } else {
      break;
    }
  }

  const xpRequiredForNextLevel = Math.floor(1000 * Math.pow(1.2, level - 1));
  const percentage = xpRequiredForNextLevel > 0 
    ? Math.min(100, Math.round((remainingXp / xpRequiredForNextLevel) * 100))
    : 100;

  return {
    level,
    xpInCurrentLevel: remainingXp,
    xpRequiredForNextLevel,
    percentage,
  };
}
