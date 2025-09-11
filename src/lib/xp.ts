const BASE_XP = 100;
const GROWTH_FACTOR = 1.5;

export const MAX_LEVEL = 50;

/**
 * Calculates the total XP required to reach a specific level.
 * @param level The target level.
 * @returns The total XP required for that level.
 */
export const getXpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  // Uses geometric progression formula sum: a * (r^n - 1) / (r - 1)
  return Math.floor(
    (BASE_XP * (Math.pow(GROWTH_FACTOR, level - 1) - 1)) / (GROWTH_FACTOR - 1),
  );
};

/**
 * Calculates the current level and progress based on total XP.
 * @param xp The total experience points of the user.
 * @returns An object with the current level, and progress towards the next level.
 */
export const getLevelFromXp = (xp: number) => {
  if (xp < 0) xp = 0;

  let level = 1;
  // Find the current level
  while (level < MAX_LEVEL) {
    if (xp < getXpForLevel(level + 1)) {
      break;
    }
    level++;
  }

  const xpForCurrentLevel = getXpForLevel(level);
  const xpForNextLevel = getXpForLevel(level + 1);

  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;

  const progress =
    xpNeededForNextLevel > 0
      ? (xpInCurrentLevel / xpNeededForNextLevel) * 100
      : 100;

  return {
    level,
    progress: Math.min(progress, 100),
    xpForCurrentLevel,
    xpForNextLevel,
  };
};
