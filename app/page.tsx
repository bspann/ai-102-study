'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import questionsData from '../data/questions.json';
import { 
  loadProgress, saveProgress, updateQuestionProgress, updateStreak,
  calculateStats, getCategoryStats, exportProgress, importProgress,
  StudyProgress
} from '../lib/storage';
import { getDueQuestions } from '../lib/sm2';
import { Question, cleanText, shuffleArray, parseAnswer, checkAnswer } from '../lib/questions';

type Mode = 'home' | 'flashcard' | 'quiz' | 'review' | 'timed' | 'dashboard';

const questions = questionsData as Question[];

export default function Home() {
  const [mode, setMode] = useState<Mode>('home');
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<number[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Load progress on mount
  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
    setDarkMode(loaded.settings.darkMode);
    document.documentElement.setAttribute('data-theme', loaded.settings.darkMode ? 'dark' : 'light');
  }, []);

  // Save progress when it changes
  useEffect(() => {
    if (progress) {
      saveProgress(progress);
    }
  }, [progress]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      
      if (mode === 'flashcard' && ['QUIZ', 'REVIEW', 'TIMED'].includes(mode) === false) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (showAnswer) {
            nextQuestion();
          } else {
            setShowAnswer(true);
          }
        }
        if (e.key === 'ArrowRight') nextQuestion();
        if (e.key === 'ArrowLeft') prevQuestion();
      }
      
      if (['quiz', 'review', 'timed'].includes(mode)) {
        if (['A', 'B', 'C', 'D', 'E', 'F'].includes(key) && !showAnswer) {
          toggleAnswer(key);
        }
        if (e.key === 'Enter' && selectedAnswers.length > 0 && !showAnswer) {
          checkCurrentAnswer();
        }
        if ((e.key === ' ' || e.key === 'Enter') && showAnswer) {
          e.preventDefault();
          nextQuestion();
        }
      }
      
      if (e.key === 'Escape') {
        setMode('home');
        setShowAnswer(false);
        setSelectedAnswers([]);
        setTimerRunning(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, selectedAnswers, questionQueue, currentIndex]);

  // Start a study mode
  const startMode = useCallback((newMode: Mode) => {
    if (!progress) return;
    
    let queue: number[] = [];
    const allIds = questions.map(q => q.id);
    
    if (newMode === 'review') {
      // Questions with more incorrect than correct, or never seen
      const needsReview = questions
        .filter(q => {
          const p = progress.questions[q.id];
          if (!p) return false;
          return p.incorrect >= p.correct || p.sm2.repetition < 2;
        })
        .map(q => q.id);
      queue = shuffleArray(needsReview);
      
      if (queue.length === 0) {
        alert('No questions need review! Try Quiz mode instead.');
        return;
      }
    } else if (newMode === 'timed') {
      // Simulate exam: random questions
      queue = shuffleArray(allIds).slice(0, 50);
      setTimerSeconds(60 * 60); // 1 hour
      setTimerRunning(true);
    } else {
      // Use SM2 priority for other modes
      queue = getDueQuestions(progress.questions, allIds);
      
      if (categoryFilter) {
        const categoryIds = new Set(questions.filter(q => q.category === categoryFilter).map(q => q.id));
        queue = queue.filter(id => categoryIds.has(id));
      }
      
      if (newMode === 'quiz') {
        queue = shuffleArray(queue);
      }
    }
    
    // Update streak
    const updatedProgress = updateStreak(progress);
    setProgress(updatedProgress);
    
    setQuestionQueue(queue);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setShowAnswer(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    setQuestionStartTime(Date.now());
    setMode(newMode);
  }, [progress, categoryFilter]);

  // Get current question
  const currentQuestion = useMemo(() => {
    if (questionQueue.length === 0) return null;
    const qId = questionQueue[currentIndex];
    return questions.find(q => q.id === qId) || null;
  }, [questionQueue, currentIndex]);

  // Toggle answer selection
  const toggleAnswer = useCallback((letter: string) => {
    if (showAnswer) return;
    
    setSelectedAnswers(prev => {
      if (prev.includes(letter)) {
        return prev.filter(a => a !== letter);
      }
      
      // For single-answer questions, replace
      if (currentQuestion) {
        const correctAnswers = parseAnswer(currentQuestion.answer);
        if (correctAnswers.length === 1) {
          return [letter];
        }
      }
      
      return [...prev, letter];
    });
  }, [showAnswer, currentQuestion]);

  // Check answer
  const checkCurrentAnswer = useCallback(() => {
    if (!currentQuestion || !progress) return;
    
    const isCorrect = checkAnswer(selectedAnswers, currentQuestion.answer);
    const timeMs = Date.now() - questionStartTime;
    
    const updatedProgress = updateQuestionProgress(progress, currentQuestion.id, isCorrect, timeMs);
    setProgress(updatedProgress);
    
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));
    
    setShowAnswer(true);
  }, [currentQuestion, progress, selectedAnswers, questionStartTime]);

  // Navigation
  const nextQuestion = useCallback(() => {
    if (currentIndex < questionQueue.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswers([]);
      setShowAnswer(false);
      setQuestionStartTime(Date.now());
    } else {
      // End of session
      setMode('home');
      setTimerRunning(false);
    }
  }, [currentIndex, questionQueue.length]);

  const prevQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setSelectedAnswers([]);
      setShowAnswer(false);
    }
  }, [currentIndex]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newValue = !prev;
      document.documentElement.setAttribute('data-theme', newValue ? 'dark' : 'light');
      if (progress) {
        setProgress({
          ...progress,
          settings: { ...progress.settings, darkMode: newValue },
        });
      }
      return newValue;
    });
  }, [progress]);

  // Export/Import
  const handleExport = useCallback(() => {
    if (!progress) return;
    const json = exportProgress(progress);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai102-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [progress]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const imported = importProgress(text);
      if (imported) {
        setProgress(imported);
        alert('Progress imported successfully!');
      } else {
        alert('Failed to import progress. Invalid file format.');
      }
    };
    input.click();
  }, []);

  // Stats
  const stats = useMemo(() => {
    if (!progress) return null;
    return calculateStats(progress, questions.length);
  }, [progress]);

  const categoryStats = useMemo(() => {
    if (!progress) return [];
    return getCategoryStats(progress, questions);
  }, [progress]);

  const categories = useMemo(() => {
    const cats = new Set(questions.map(q => q.category));
    return Array.from(cats).sort();
  }, []);

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!progress) {
    return <div className="container" style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="logo" onClick={() => setMode('home')} style={{ cursor: 'pointer' }}>
          🎓 AI-102 Study
        </div>
        <nav className="nav">
          <button 
            className={`nav-link ${mode === 'home' ? 'active' : ''}`}
            onClick={() => setMode('home')}
          >
            Home
          </button>
          <button 
            className={`nav-link ${mode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMode('dashboard')}
          >
            Dashboard
          </button>
          {progress.streak.current > 0 && (
            <span className="streak-badge">
              🔥 {progress.streak.current} day{progress.streak.current > 1 ? 's' : ''}
            </span>
          )}
          <button className="btn btn-icon" onClick={toggleDarkMode} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      <div className="container">
        {/* Home */}
        {mode === 'home' && (
          <div>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: 16 }}>Azure AI-102 Study</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                {stats?.totalQuestions} questions • {stats?.seen} seen • {stats?.mastered} mastered
              </p>
              
              {stats && (
                <div style={{ maxWidth: 300, margin: '0 auto 32px' }}>
                  <div className="readiness-score">{stats.readiness}%</div>
                  <div className="readiness-label">Estimated Readiness</div>
                </div>
              )}
            </div>

            {/* Category filter */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Filter by Category
              </h3>
              <div className="filter-chips">
                <button 
                  className={`chip ${!categoryFilter ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`chip ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-4" style={{ marginBottom: 40 }}>
              <div className="mode-card" onClick={() => startMode('flashcard')}>
                <div className="mode-icon">📚</div>
                <div className="mode-title">Flashcards</div>
                <div className="mode-description">Review questions at your own pace</div>
              </div>
              
              <div className="mode-card" onClick={() => startMode('quiz')}>
                <div className="mode-icon">✏️</div>
                <div className="mode-title">Quiz</div>
                <div className="mode-description">Test yourself with random questions</div>
              </div>
              
              <div className="mode-card" onClick={() => startMode('review')}>
                <div className="mode-icon">🔄</div>
                <div className="mode-title">Review</div>
                <div className="mode-description">Focus on questions you got wrong</div>
              </div>
              
              <div className="mode-card" onClick={() => startMode('timed')}>
                <div className="mode-icon">⏱️</div>
                <div className="mode-title">Timed Practice</div>
                <div className="mode-description">50 questions in 60 minutes</div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="card">
              <div className="card-title">Quick Stats</div>
              <div className="grid grid-4">
                <div className="stat">
                  <div className="stat-value">{stats?.seen || 0}</div>
                  <div className="stat-label">Questions Seen</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{stats?.mastered || 0}</div>
                  <div className="stat-label">Mastered</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{stats?.accuracy || 0}%</div>
                  <div className="stat-label">Accuracy</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{stats?.needsReview || 0}</div>
                  <div className="stat-label">Need Review</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {mode === 'dashboard' && (
          <div>
            <h1 style={{ marginBottom: 24 }}>Progress Dashboard</h1>
            
            <div className="dashboard-grid">
              {/* Overall progress */}
              <div className="card">
                <div className="card-title">Overall Progress</div>
                <div className="stat">
                  <div className="readiness-score">{stats?.readiness}%</div>
                  <div className="readiness-label">Estimated Readiness</div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Questions Covered</span>
                    <span>{stats?.seen} / {stats?.totalQuestions}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(stats?.seen || 0) / (stats?.totalQuestions || 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Study streak */}
              <div className="card">
                <div className="card-title">Study Streak</div>
                <div className="stat">
                  <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    🔥 {progress.streak.current}
                  </div>
                  <div className="stat-label">Current Streak (days)</div>
                </div>
                <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Longest: {progress.streak.longest} days
                </div>
              </div>

              {/* Accuracy */}
              <div className="card">
                <div className="card-title">Accuracy</div>
                <div className="stat">
                  <div className="stat-value">{stats?.accuracy}%</div>
                  <div className="stat-label">Overall Accuracy</div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24, color: 'var(--text-secondary)' }}>
                  <span>✓ {stats?.totalCorrect}</span>
                  <span>✗ {stats?.totalIncorrect}</span>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-title">Progress by Category</div>
              {categoryStats.map(cat => (
                <div key={cat.name} className="category-item">
                  <div className="category-header">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-stats">
                      {cat.seen}/{cat.total} seen • {cat.accuracy}% accuracy
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${cat.accuracy >= 80 ? 'success' : cat.accuracy >= 50 ? 'warning' : 'danger'}`}
                      style={{ width: `${cat.seen / cat.total * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Export/Import */}
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-title">Data Management</div>
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <button className="btn btn-primary" onClick={handleExport}>
                  📤 Export Progress
                </button>
                <button className="btn btn-secondary" onClick={handleImport}>
                  📥 Import Progress
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flashcard Mode */}
        {mode === 'flashcard' && currentQuestion && (
          <div>
            <div className="question-card">
              <div className="question-header">
                <span className="question-number">
                  Question {currentIndex + 1} of {questionQueue.length}
                </span>
                <span className="question-category">{currentQuestion.category}</span>
              </div>
              
              <div className="question-text">{cleanText(currentQuestion.question)}</div>
              
              {currentQuestion.options.length > 0 && (
                <div className="options">
                  {currentQuestion.options.map(opt => (
                    <div key={opt.letter} className="option" style={{ cursor: 'default' }}>
                      <span className="option-letter">{opt.letter}.</span>
                      <span className="option-text">{cleanText(opt.text)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {!showAnswer ? (
                <div className="actions">
                  <button className="btn btn-primary" onClick={() => setShowAnswer(true)}>
                    Show Answer
                  </button>
                </div>
              ) : (
                <>
                  <div className="explanation">
                    <div className="explanation-title">
                      Answer: {currentQuestion.answer}
                    </div>
                    <div className="explanation-text">
                      {cleanText(currentQuestion.explanation)}
                    </div>
                  </div>
                  
                  <div className="actions">
                    <button className="btn btn-secondary" onClick={prevQuestion} disabled={currentIndex === 0}>
                      ← Previous
                    </button>
                    <button className="btn btn-primary" onClick={nextQuestion}>
                      {currentIndex < questionQueue.length - 1 ? 'Next →' : 'Finish'}
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="shortcuts-hint">
              <kbd>Space</kbd> Reveal/Next • <kbd>←</kbd> <kbd>→</kbd> Navigate • <kbd>Esc</kbd> Exit
            </div>
          </div>
        )}

        {/* Quiz / Review / Timed Mode */}
        {['quiz', 'review', 'timed'].includes(mode) && currentQuestion && (
          <div>
            {mode === 'timed' && (
              <div className={`timer ${timerSeconds < 300 ? 'danger' : timerSeconds < 600 ? 'warning' : ''}`}>
                ⏱️ {formatTime(timerSeconds)}
              </div>
            )}
            
            <div className="question-card">
              <div className="question-header">
                <span className="question-number">
                  Question {currentIndex + 1} of {questionQueue.length}
                  {sessionStats.correct + sessionStats.incorrect > 0 && (
                    <span style={{ marginLeft: 16, color: 'var(--text-secondary)' }}>
                      ✓ {sessionStats.correct} ✗ {sessionStats.incorrect}
                    </span>
                  )}
                </span>
                <span className="question-category">{currentQuestion.category}</span>
              </div>
              
              <div className="question-text">{cleanText(currentQuestion.question)}</div>
              
              {currentQuestion.options.length > 0 && (
                <div className="options">
                  {currentQuestion.options.map(opt => {
                    const isSelected = selectedAnswers.includes(opt.letter);
                    const correctAnswers = parseAnswer(currentQuestion.answer);
                    const isCorrect = correctAnswers.includes(opt.letter);
                    
                    let className = 'option';
                    if (isSelected && !showAnswer) className += ' selected';
                    if (showAnswer && isCorrect) className += ' correct';
                    if (showAnswer && isSelected && !isCorrect) className += ' incorrect';
                    
                    return (
                      <div 
                        key={opt.letter} 
                        className={className}
                        onClick={() => toggleAnswer(opt.letter)}
                      >
                        <span className="option-letter">{opt.letter}.</span>
                        <span className="option-text">{cleanText(opt.text)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {!showAnswer ? (
                <div className="actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={checkCurrentAnswer}
                    disabled={selectedAnswers.length === 0}
                  >
                    Check Answer
                  </button>
                </div>
              ) : (
                <>
                  <div className="explanation">
                    <div className="explanation-title">
                      {checkAnswer(selectedAnswers, currentQuestion.answer) ? (
                        <span style={{ color: 'var(--success)' }}>✓ Correct!</span>
                      ) : (
                        <span style={{ color: 'var(--danger)' }}>✗ Incorrect - Answer: {currentQuestion.answer}</span>
                      )}
                    </div>
                    <div className="explanation-text">
                      {cleanText(currentQuestion.explanation)}
                    </div>
                  </div>
                  
                  <div className="actions">
                    <button className="btn btn-primary" onClick={nextQuestion}>
                      {currentIndex < questionQueue.length - 1 ? 'Next Question →' : 'Finish Session'}
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="shortcuts-hint">
              <kbd>A</kbd>-<kbd>F</kbd> Select • <kbd>Enter</kbd> Check/Next • <kbd>Esc</kbd> Exit
            </div>
          </div>
        )}

        {/* Session Complete */}
        {['quiz', 'review', 'timed', 'flashcard'].includes(mode) && !currentQuestion && questionQueue.length > 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, maxWidth: 500, margin: '40px auto' }}>
            <h2 style={{ marginBottom: 24 }}>🎉 Session Complete!</h2>
            
            <div className="grid grid-2" style={{ marginBottom: 24 }}>
              <div className="stat">
                <div className="stat-value" style={{ color: 'var(--success)' }}>{sessionStats.correct}</div>
                <div className="stat-label">Correct</div>
              </div>
              <div className="stat">
                <div className="stat-value" style={{ color: 'var(--danger)' }}>{sessionStats.incorrect}</div>
                <div className="stat-label">Incorrect</div>
              </div>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <div className="stat-value">
                {sessionStats.correct + sessionStats.incorrect > 0
                  ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
                  : 0}%
              </div>
              <div className="stat-label">Session Accuracy</div>
            </div>
            
            <button className="btn btn-primary" onClick={() => setMode('home')}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
