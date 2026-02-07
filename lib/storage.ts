/**
 * Local storage utilities for progress tracking
 */

import { QuestionProgress, getDefaultSM2Data, calculateSM2, qualityFromCorrect } from './sm2';

const STORAGE_KEY = 'ai102-study-progress';

export interface StudyProgress {
  questions: Record<number, QuestionProgress>;
  streak: {
    current: number;
    lastStudyDate: string;
    longest: number;
  };
  stats: {
    totalSessions: number;
    totalTimeMs: number;
    lastSessionDate: string;
  };
  settings: {
    darkMode: boolean;
    showKeyboardHints: boolean;
  };
}

function getDefaultProgress(): StudyProgress {
  return {
    questions: {},
    streak: {
      current: 0,
      lastStudyDate: '',
      longest: 0,
    },
    stats: {
      totalSessions: 0,
      totalTimeMs: 0,
      lastSessionDate: '',
    },
    settings: {
      darkMode: true,
      showKeyboardHints: true,
    },
  };
}

export function loadProgress(): StudyProgress {
  if (typeof window === 'undefined') {
    return getDefaultProgress();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return {
        ...getDefaultProgress(),
        ...parsed,
        questions: parsed.questions || {},
        streak: { ...getDefaultProgress().streak, ...parsed.streak },
        stats: { ...getDefaultProgress().stats, ...parsed.stats },
        settings: { ...getDefaultProgress().settings, ...parsed.settings },
      };
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  
  return getDefaultProgress();
}

export function saveProgress(progress: StudyProgress): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function updateQuestionProgress(
  progress: StudyProgress,
  questionId: number,
  isCorrect: boolean,
  timeMs?: number
): StudyProgress {
  const existing = progress.questions[questionId] || {
    id: questionId,
    correct: 0,
    incorrect: 0,
    lastSeen: 0,
    sm2: getDefaultSM2Data(),
  };
  
  const quality = qualityFromCorrect(isCorrect, timeMs);
  const newSM2 = calculateSM2(existing.sm2, quality);
  
  return {
    ...progress,
    questions: {
      ...progress.questions,
      [questionId]: {
        ...existing,
        correct: existing.correct + (isCorrect ? 1 : 0),
        incorrect: existing.incorrect + (isCorrect ? 0 : 1),
        lastSeen: Date.now(),
        sm2: newSM2,
      },
    },
  };
}

export function updateStreak(progress: StudyProgress): StudyProgress {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = progress.streak.lastStudyDate;
  
  let newStreak = progress.streak.current;
  
  if (lastDate === today) {
    // Already studied today
    return progress;
  }
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  if (lastDate === yesterday) {
    // Consecutive day
    newStreak += 1;
  } else if (lastDate && lastDate !== today) {
    // Streak broken
    newStreak = 1;
  } else {
    // First day
    newStreak = 1;
  }
  
  return {
    ...progress,
    streak: {
      current: newStreak,
      lastStudyDate: today,
      longest: Math.max(newStreak, progress.streak.longest),
    },
  };
}

export function exportProgress(progress: StudyProgress): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(json: string): StudyProgress | null {
  try {
    const parsed = JSON.parse(json);
    // Validate structure
    if (parsed && typeof parsed === 'object') {
      return {
        ...getDefaultProgress(),
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to import progress:', e);
  }
  return null;
}

export function calculateStats(progress: StudyProgress, totalQuestions: number) {
  const questions = Object.values(progress.questions);
  const seen = questions.length;
  const mastered = questions.filter(q => q.sm2.repetition >= 3 && q.correct > q.incorrect * 2).length;
  const needsReview = questions.filter(q => q.sm2.nextReview <= Date.now()).length;
  const newQuestions = totalQuestions - seen;
  
  const totalCorrect = questions.reduce((sum, q) => sum + q.correct, 0);
  const totalIncorrect = questions.reduce((sum, q) => sum + q.incorrect, 0);
  const accuracy = totalCorrect + totalIncorrect > 0 
    ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) 
    : 0;
  
  // Readiness score: weighted average of coverage, accuracy, and mastery
  const coverage = seen / totalQuestions;
  const masteryRatio = seen > 0 ? mastered / seen : 0;
  const readiness = Math.round(
    (coverage * 30 + (accuracy / 100) * 40 + masteryRatio * 30)
  );
  
  return {
    totalQuestions,
    seen,
    mastered,
    needsReview,
    newQuestions,
    accuracy,
    readiness,
    totalCorrect,
    totalIncorrect,
  };
}

export function getCategoryStats(
  progress: StudyProgress,
  questions: { id: number; category: string }[]
) {
  const categoryMap: Record<string, { total: number; correct: number; incorrect: number; seen: number }> = {};
  
  for (const q of questions) {
    if (!categoryMap[q.category]) {
      categoryMap[q.category] = { total: 0, correct: 0, incorrect: 0, seen: 0 };
    }
    categoryMap[q.category].total++;
    
    const p = progress.questions[q.id];
    if (p) {
      categoryMap[q.category].correct += p.correct;
      categoryMap[q.category].incorrect += p.incorrect;
      categoryMap[q.category].seen++;
    }
  }
  
  return Object.entries(categoryMap)
    .map(([name, stats]) => ({
      name,
      ...stats,
      accuracy: stats.correct + stats.incorrect > 0
        ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)
        : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
