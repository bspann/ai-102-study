#!/usr/bin/env python3
"""Parse AI-102 exam questions from extracted PDF text."""
import re
import json
import os

def parse_questions(raw_text):
    """Parse questions from raw text."""
    questions = []
    
    # Split by question markers
    # Pattern: "Question: N" followed by content until next question or end
    question_splits = re.split(r'(?=Question:\s*\d+)', raw_text)
    
    for part in question_splits:
        if not part.strip():
            continue
            
        # Extract question number
        num_match = re.match(r'Question:\s*(\d+)', part)
        if not num_match:
            continue
            
        q_num = int(num_match.group(1))
        
        # Remove header/footer noise
        content = part
        content = re.sub(r'Questions and Answers PDF \d+/\d+', '', content)
        content = re.sub(r'Questions &AnswersPDF P-\d+', '', content)
        content = re.sub(r'http://www\.justcerts\.com', '', content)
        
        # Find question type (HOTSPOT, DRAG DROP, etc.)
        q_type = "multiple_choice"
        if "HOTSPOT" in content:
            q_type = "hotspot"
        elif "DRAGDROP" in content or "DRAG DROP" in content:
            q_type = "drag_drop"
        elif "Select the answer" in content and "dropdown" in content.lower():
            q_type = "dropdown"
        
        # Extract the answer
        answer = ""
        answer_match = re.search(r'\nAnswer:\s*([A-Z,\s]+?)(?:\n|Explanation:|$)', content)
        if answer_match:
            answer = answer_match.group(1).strip()
            # Clean up answer (remove spaces around commas, etc.)
            answer = re.sub(r'\s*,\s*', ', ', answer)
        
        # Extract explanation
        explanation = ""
        exp_match = re.search(r'Explanation:(.*?)(?=Question:\s*\d+|$)', content, re.DOTALL)
        if exp_match:
            explanation = exp_match.group(1).strip()
            # Clean up explanation
            explanation = re.sub(r'Reference:\s*https?://[^\s]+', '', explanation)
            explanation = explanation.strip()
        
        # Extract the question text (between Question: N and Answer:)
        q_text_match = re.search(r'Question:\s*\d+\s*(.*?)\s*(?=Answer:|$)', content, re.DOTALL)
        q_text = ""
        if q_text_match:
            q_text = q_text_match.group(1).strip()
            # Remove type indicators
            q_text = re.sub(r'^(HOTSPOT|DRAGDROP|DRAG DROP)\s*', '', q_text)
        
        # Try to extract options for multiple choice
        options = []
        option_pattern = r'([A-F])\.\s*([^\n]+)'
        option_matches = re.findall(option_pattern, q_text)
        if option_matches:
            options = [{"letter": m[0], "text": m[1].strip()} for m in option_matches]
        
        # Determine category based on content
        category = categorize_question(q_text + " " + explanation)
        
        questions.append({
            "id": q_num,
            "type": q_type,
            "question": q_text,
            "options": options,
            "answer": answer,
            "explanation": explanation,
            "category": category
        })
    
    return questions

def categorize_question(text):
    """Categorize question based on content."""
    text_lower = text.lower()
    
    categories = {
        "Azure Cognitive Services": ["cognitive services", "cognitive service", "face api", "computer vision", "text analytics", "translator", "speech"],
        "Azure Bot Service": ["bot service", "bot framework", "qna maker", "luis", "language understanding", "chatbot"],
        "Azure Cognitive Search": ["cognitive search", "search index", "indexer", "skillset", "search solution"],
        "Computer Vision": ["computer vision", "ocr", "image analysis", "custom vision", "form recognizer", "document intelligence"],
        "Natural Language Processing": ["text analytics", "sentiment", "key phrase", "entity recognition", "language detection", "translator", "translation"],
        "Speech Services": ["speech to text", "text to speech", "speech recognition", "speech synthesis", "speaker recognition"],
        "Azure OpenAI": ["openai", "gpt", "dall-e", "embeddings", "azure openai"],
        "Video Indexer": ["video indexer", "media services"],
        "Responsible AI": ["responsible ai", "fairness", "transparency", "accountability", "inclusiveness"],
        "Security & Governance": ["authentication", "authorization", "managed identity", "key vault", "rbac", "role-based"]
    }
    
    for category, keywords in categories.items():
        if any(kw in text_lower for kw in keywords):
            return category
    
    return "General"

def main():
    # Read raw text
    raw_path = os.path.expanduser("~/Projects/ai-102-study/raw_text.txt")
    with open(raw_path, 'r') as f:
        raw_text = f.read()
    
    # Parse questions
    questions = parse_questions(raw_text)
    
    # Sort by question number
    questions.sort(key=lambda x: x["id"])
    
    # Save to JSON
    output_path = os.path.expanduser("~/Projects/ai-102-study/data/questions.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(questions, f, indent=2)
    
    # Print stats
    print(f"Parsed {len(questions)} questions")
    
    # Category breakdown
    categories = {}
    for q in questions:
        cat = q["category"]
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nCategory breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    
    # Type breakdown
    types = {}
    for q in questions:
        t = q["type"]
        types[t] = types.get(t, 0) + 1
    
    print("\nQuestion type breakdown:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")
    
    print(f"\nSaved to {output_path}")

if __name__ == "__main__":
    main()
