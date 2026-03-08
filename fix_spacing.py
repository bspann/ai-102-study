#!/usr/bin/env python3
"""Fix spacing issues in questions.json caused by PDF extraction."""

import json
import re

def fix_spacing(text):
    """Add missing spaces to text extracted from PDF."""
    if not text:
        return text
    
    # Common word boundaries that lost spaces
    # Pattern: lowercase followed by uppercase (e.g., "YouAre" → "You Are")
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Fix common patterns where space was lost before lowercase words
    common_words = [
        'the', 'to', 'a', 'an', 'of', 'in', 'is', 'are', 'was', 'were',
        'for', 'on', 'with', 'as', 'at', 'by', 'from', 'or', 'and', 'be',
        'this', 'that', 'which', 'when', 'where', 'how', 'what', 'who',
        'your', 'you', 'must', 'should', 'can', 'will', 'need', 'use',
        'each', 'all', 'any', 'not', 'if', 'but', 'so', 'than', 'then',
        'more', 'most', 'some', 'such', 'only', 'also', 'into', 'has',
        'have', 'using', 'used', 'being', 'been', 'following', 'between',
        'during', 'before', 'after', 'about', 'through', 'over', 'under'
    ]
    
    for word in common_words:
        # Fix patterns like "tothe" → "to the" and "ofthe" → "of the"
        pattern = r'([a-z])(' + word + r')([A-Z\s])'
        text = re.sub(pattern, r'\1 \2\3', text, flags=re.IGNORECASE)
        
        # Fix patterns like "searchthe" → "search the"
        pattern = r'([a-z]{2,})(' + word + r')([a-z])'
        text = re.sub(pattern, r'\1 \2 \3', text, flags=re.IGNORECASE)
    
    # Fix number followed by letter without space (e.g., "3steps" → "3 steps")
    text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)
    
    # Fix letter followed by number without space in some cases
    text = re.sub(r'([a-z])(\d)', r'\1 \2', text)
    
    # Fix periods not followed by space (e.g., "end.Start" → "end. Start")
    text = re.sub(r'\.([A-Z])', r'. \1', text)
    
    # Fix colons not followed by space
    text = re.sub(r':([A-Za-z])', r': \1', text)
    
    # Fix commas not followed by space
    text = re.sub(r',([A-Za-z])', r', \1', text)
    
    # Clean up multiple spaces
    text = re.sub(r' +', ' ', text)
    
    return text.strip()


def fix_questions_file(input_path, output_path):
    """Fix spacing in all text fields of questions.json."""
    with open(input_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    fixed_count = 0
    for q in questions:
        # Fix question text
        if 'question' in q and q['question']:
            original = q['question']
            q['question'] = fix_spacing(q['question'])
            if original != q['question']:
                fixed_count += 1
        
        # Fix explanation
        if 'explanation' in q and q['explanation']:
            q['explanation'] = fix_spacing(q['explanation'])
        
        # Fix answer
        if 'answer' in q and q['answer']:
            q['answer'] = fix_spacing(q['answer'])
        
        # Fix options
        if 'options' in q and q['options']:
            for opt in q['options']:
                if 'text' in opt and opt['text']:
                    opt['text'] = fix_spacing(opt['text'])
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    
    print(f"Fixed {fixed_count} questions")
    print(f"Output written to {output_path}")


if __name__ == '__main__':
    import sys
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'data/questions.json'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'data/questions_fixed.json'
    fix_questions_file(input_file, output_file)
