# AI-102 Study App 🎓

Azure AI Engineer Associate (AI-102) Certification Study App with spaced repetition.

## Quick Start

```bash
cd ~/Projects/ai-102-study
./start.sh
# Opens at http://localhost:3102
```

## Features

- **379 exam questions** extracted and categorized
- **4 study modes:**
  - 📚 **Flashcards** - Self-paced review
  - ✏️ **Quiz** - Random questions with scoring
  - 🔄 **Review** - Focus on questions you got wrong
  - ⏱️ **Timed Practice** - 50 questions in 60 minutes (exam simulation)
- **SM-2 Spaced Repetition** - Prioritizes questions you struggle with
- **Progress tracking** - Dashboard with stats by category
- **Keyboard shortcuts** - A-F to select, Enter to submit, Space to reveal
- **Dark mode** - Easy on the eyes
- **Export/Import** - Backup your progress

## Question Categories

| Category | Count |
|----------|-------|
| General | 123 |
| Azure Cognitive Services | 93 |
| Azure Bot Service | 67 |
| Azure Cognitive Search | 37 |
| Computer Vision | 29 |
| Natural Language Processing | 12 |
| Azure OpenAI | 11 |
| Security & Governance | 5 |
| Responsible AI | 2 |

## Study Plan Recommendation

### Target: Pass by End of March/Early April 2026 (~8 weeks)

#### Week 1-2: Foundation Building
- **Daily:** 20-30 questions in Flashcard mode
- **Focus:** Azure Cognitive Services (93 questions) - this is the biggest category
- **Goal:** See all questions at least once, understand the patterns

#### Week 3-4: Deep Dive + Active Recall
- **Daily:** 25 questions in Quiz mode
- **Focus:** Azure Bot Service (67) and Cognitive Search (37)
- **Review:** Any questions marked incorrect using Review mode
- **Goal:** 70%+ accuracy on quizzes

#### Week 5-6: Weak Area Attack
- **Daily:** Review mode (all incorrects) + 15 new questions
- **Focus:** Computer Vision, NLP, Azure OpenAI
- **Timed Practice:** 1-2 full simulated exams per week
- **Goal:** 80%+ accuracy, no category below 70%

#### Week 7-8: Exam Prep Sprint
- **Daily:** Timed Practice mode
- **Focus:** Review mode for anything < 85% accuracy
- **Goal:** Consistent 85%+ on timed practice

### Pro Tips for C# Developers

1. **Practical correlation:** As you study, think about how you'd implement each service in C#/.NET
2. **Azure SDK patterns:** Many questions involve understanding the SDK structure
3. **REST API knowledge:** Know the endpoint patterns even if you use SDKs
4. **ARM/Bicep familiarity:** Some questions involve deployment configurations

### Key Topics to Master

1. **Cognitive Services deployment** - Resource creation, keys, endpoints
2. **Azure Bot Service** - QnA Maker, LUIS integration, channels
3. **Cognitive Search** - Indexers, skillsets, search analyzers
4. **Computer Vision** - OCR, Custom Vision, Form Recognizer
5. **Language services** - Text Analytics, Translator, entity recognition
6. **Speech services** - Speech-to-text, text-to-speech, speaker recognition
7. **Azure OpenAI** - Deployments, prompt engineering, responsible AI
8. **Security** - Managed identities, Key Vault, RBAC

### Study Schedule Example

| Time | Activity |
|------|----------|
| Morning commute | 15 min Flashcard mode (mobile) |
| Lunch break | 20 min Quiz mode |
| Evening | 30 min focused study + Review mode |
| Weekend | 1 full Timed Practice exam |

**Total: ~1-1.5 hours/day**

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| A-F | Select answer option |
| Enter | Check answer / Next question |
| Space | Reveal answer (flashcard) / Next |
| ← → | Navigate questions |
| Esc | Exit to home |

## Data Files

- `data/questions.json` - All 379 questions with answers and explanations
- Progress is stored in browser localStorage

## Export Your Progress

Click **Dashboard** → **Export Progress** to save a backup JSON file.
Import it on another device or after clearing browser data.

---

Good luck on your AI-102 exam! 🚀
