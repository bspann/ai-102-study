#!/usr/bin/env python3
"""Fix spacing issues in questions.json using word segmentation."""

import json
import re
from wordsegment import load, segment

# Load the word segmentation model
load()

def fix_text_spacing(text):
    """Fix spacing in text using word segmentation for concatenated words."""
    if not text:
        return text
    
    # Split into tokens (preserving newlines and punctuation)
    # We'll process each "word" that might be concatenated
    
    result = []
    # Split on whitespace and newlines, but keep track of them
    parts = re.split(r'(\s+)', text)
    
    for part in parts:
        if not part or part.isspace():
            result.append(part)
            continue
            
        # Check if this looks like concatenated words (long lowercase string)
        # Skip if it contains punctuation that shouldn't be split
        if re.match(r'^[A-Za-z]{15,}$', part) and not any(c in part for c in ['http', 'www', '.com', '.org']):
            # This might be concatenated words - try to segment
            segmented = segment(part.lower())
            if len(segmented) > 1:
                # Restore original capitalization for first word
                if part[0].isupper():
                    segmented[0] = segmented[0].capitalize()
                part = ' '.join(segmented)
        
        # Handle camelCase patterns (lowercase followed by uppercase)
        # e.g., "YouAre" -> "You Are"
        part = re.sub(r'([a-z])([A-Z])', r'\1 \2', part)
        
        # Handle patterns like "5steps" -> "5 steps"
        part = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', part)
        
        # Handle patterns like "step1" -> "step 1" (but not in API names)
        if not any(x in part.lower() for x in ['api', 'sdk', 'v1', 'v2', 'v3', 'id']):
            part = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', part)
        
        result.append(part)
    
    # Join and clean up multiple spaces
    text = ''.join(result)
    text = re.sub(r' +', ' ', text)
    
    # Fix punctuation spacing
    text = re.sub(r'\.([A-Z])', r'. \1', text)
    text = re.sub(r',([A-Za-z])', r', \1', text)
    text = re.sub(r':([A-Za-z])', r': \1', text)
    
    return text.strip()


def process_questions(input_path, output_path):
    """Process questions file and fix spacing."""
    with open(input_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    for q in questions:
        if 'question' in q and q['question']:
            q['question'] = fix_text_spacing(q['question'])
        
        if 'explanation' in q and q['explanation']:
            q['explanation'] = fix_text_spacing(q['explanation'])
        
        if 'answer' in q and q['answer']:
            q['answer'] = fix_text_spacing(q['answer'])
        
        if 'options' in q:
            for opt in q['options']:
                if 'text' in opt and opt['text']:
                    opt['text'] = fix_text_spacing(opt['text'])
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    
    print(f"Processed {len(questions)} questions")
    print(f"Saved to {output_path}")


if __name__ == '__main__':
    # Test the function first
    test_cases = [
        "Youaredeveloping thesmarte-commerce project.",
        "Youneedtodesigntheskillset",
        "Howshouldyoucomplete theskillsetdesigndiagram?",
        "NOTE:Eachcorrectselection isworthonepoint."
    ]
    
    print("Testing fix_text_spacing:")
    for test in test_cases:
        print(f"  Input:  {test}")
        print(f"  Output: {fix_text_spacing(test)}")
        print()
    
    # Now process the file
    process_questions('data/questions.json', 'data/questions_fixed.json')
