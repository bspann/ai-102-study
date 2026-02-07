/**
 * SM-2 Spaced Repetition Algorithm
 * Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SM2Data {
  easeFactor: number;  // E-Factor (2.5 default)
  interval: number;    // Days until next review
  repetition: number;  // Number of times reviewed
  nextReview: number;  // Timestamp of next review
  lastReview: number;  // Timestamp of last review
}

export interface QuestionProgress {
  id: number;
  correct: number;
  incorrect: number;
  lastSeen: number;
  sm2: SM2Data;
}

/**
 * Calculate the next review using SM-2 algorithm
 * @param quality - Quality of response (0-5)
 *   0 - Complete blackout
 *   1 - Incorrect, remembered upon seeing answer
 *   2 - Incorrect, but easy to recall upon seeing answer
 *   3 - Correct, with difficulty
 *   4 - Correct, after hesitation
 *   5 - Perfect response
 */
export function calculateSM2(
  currentData: SM2Data,
  quality: number
): SM2Data {
  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality));
  
  let { easeFactor, interval, repetition } = currentData;
  
  // If quality < 3, reset the repetition
  if (quality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    // Calculate new interval
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }
  
  // Calculate new ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Minimum ease factor is 1.3
  easeFactor = Math.max(1.3, easeFactor);
  
  const now = Date.now();
  
  return {
    easeFactor,
    interval,
    repetition,
    nextReview: now + interval * 24 * 60 * 60 * 1000,
    lastReview: now,
  };
}

export function getDefaultSM2Data(): SM2Data {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetition: 0,
    nextReview: 0,
    lastReview: 0,
  };
}

export function qualityFromCorrect(isCorrect: boolean, timeMs?: number): number {
  if (!isCorrect) {
    return 1; // Incorrect
  }
  
  // If answered quickly (under 10 seconds), it's a better quality
  if (timeMs && timeMs < 10000) {
    return 5; // Perfect
  } else if (timeMs && timeMs < 30000) {
    return 4; // Correct after some thought
  }
  
  return 3; // Correct with difficulty
}

/**
 * Get questions due for review, sorted by priority
 */
export function getDueQuestions(
  progress: Record<number, QuestionProgress>,
  allQuestionIds: number[]
): number[] {
  const now = Date.now();
  
  const scored = allQuestionIds.map(id => {
    const p = progress[id];
    
    if (!p) {
      // Never seen - high priority
      return { id, score: 1000 };
    }
    
    const daysSinceReview = (now - p.lastSeen) / (24 * 60 * 60 * 1000);
    const daysUntilDue = (p.sm2.nextReview - now) / (24 * 60 * 60 * 1000);
    
    // If due or overdue, higher score
    if (daysUntilDue <= 0) {
      return { id, score: 100 - daysUntilDue + (p.incorrect / (p.correct + 1)) * 10 };
    }
    
    // Not due yet, lower score based on how far away
    return { id, score: -daysUntilDue };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored.map(s => s.id);
}
