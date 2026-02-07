/**
 * Question utilities
 */

export interface Question {
  id: number;
  type: string;
  question: string;
  options: { letter: string; text: string }[];
  answer: string;
  explanation: string;
  category: string;
}

// Clean up text from PDF extraction artifacts
export function cleanText(text: string): string {
  if (!text) return '';
  
  // Add spaces between camelCase/PascalCase words that got merged
  let cleaned = text
    // Add space before uppercase letters that follow lowercase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Add space after periods that are followed by uppercase
    .replace(/\.([A-Z])/g, '. $1')
    // Fix common merged words
    .replace(/thefollowing/gi, 'the following')
    .replace(/youare/gi, 'you are')
    .replace(/youneed/gi, 'you need')
    .replace(/whichof/gi, 'which of')
    .replace(/eachcorrect/gi, 'each correct')
    .replace(/selectthe/gi, 'select the')
    .replace(/shouldyou/gi, 'should you')
    .replace(/tothe/gi, 'to the')
    .replace(/forthe/gi, 'for the')
    .replace(/fromthe/gi, 'from the')
    .replace(/inthe/gi, 'in the')
    .replace(/ofthe/gi, 'of the')
    .replace(/withthe/gi, 'with the')
    .replace(/andthe/gi, 'and the')
    .replace(/onthe/gi, 'on the');
    
  return cleaned;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function parseAnswer(answer: string): string[] {
  if (!answer) return [];
  // Split by comma or no separator (e.g., "ABF" or "A, B, F")
  return answer.replace(/\s/g, '').split(/,?/).filter(Boolean);
}

export function checkAnswer(userAnswer: string[], correctAnswer: string): boolean {
  const correct = parseAnswer(correctAnswer);
  if (correct.length !== userAnswer.length) return false;
  
  const sortedUser = [...userAnswer].sort();
  const sortedCorrect = [...correct].sort();
  
  return sortedUser.every((a, i) => a === sortedCorrect[i]);
}
