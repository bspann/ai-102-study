#!/usr/bin/env python3
"""Fix spacing issues in questions.json - aggressive word segmentation."""

import json
import re
from wordsegment import load, segment

load()

def segment_word(word):
    """Segment a potentially concatenated word."""
    # Don't segment short words, URLs, or technical terms
    if len(word) < 8:
        return word
    if any(x in word.lower() for x in ['http', 'www', '.com', '.org', 'azure', 'microsoft']):
        return word
    
    # Try segmentation
    parts = segment(word.lower())
    
    # Only use segmentation if it found multiple words
    if len(parts) <= 1:
        return word
    
    # Restore capitalization
    result = []
    pos = 0
    for p in parts:
        # Find this part in original word (case-insensitive)
        idx = word.lower().find(p, pos)
        if idx >= 0 and idx < len(word):
            # Use original capitalization
            original_part = word[idx:idx+len(p)]
            result.append(original_part)
            pos = idx + len(p)
        else:
            result.append(p)
    
    return ' '.join(result)


def fix_text(text):
    """Fix spacing in text."""
    if not text:
        return text
    
    # First, handle camelCase
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Now split into words and process each
    # Keep whitespace and punctuation separate
    tokens = re.findall(r'\S+|\s+', text)
    
    result = []
    for token in tokens:
        if token.isspace():
            result.append(token)
            continue
        
        # Strip punctuation from ends
        leading = ''
        trailing = ''
        word = token
        
        while word and not word[0].isalnum():
            leading += word[0]
            word = word[1:]
        while word and not word[-1].isalnum():
            trailing = word[-1] + trailing
            word = word[:-1]
        
        if word:
            # Check if word looks concatenated (mix of patterns)
            if len(word) >= 10 and word.isalpha():
                word = segment_word(word)
        
        result.append(leading + word + trailing)
    
    text = ''.join(result)
    
    # Fix punctuation spacing
    text = re.sub(r'\.([A-Z])', r'. \1', text)
    text = re.sub(r',([A-Za-z])', r', \1', text)
    text = re.sub(r':([A-Za-z])', r': \1', text)
    
    # Clean up multiple spaces
    text = re.sub(r' +', ' ', text)
    
    return text.strip()


def process_file(input_path, output_path):
    """Process the questions file."""
    with open(input_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    for q in questions:
        if 'question' in q:
            q['question'] = fix_text(q['question'])
        if 'explanation' in q:
            q['explanation'] = fix_text(q['explanation'])
        if 'answer' in q:
            q['answer'] = fix_text(q['answer'])
        if 'options' in q:
            for opt in q['options']:
                if 'text' in opt:
                    opt['text'] = fix_text(opt['text'])
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    
    print(f"Done! Processed {len(questions)} questions")


# Test first
tests = [
    "Youaredeveloping thesmarte-commerce project.",
    "Youneedtodesigntheskillsettoincludethecontents",
    "NOTE:Eachcorrectselection isworthonepoint.",
    "Howshouldyoucomplete theskillsetdesigndiagram?"
]

print("Testing:")
for t in tests:
    print(f"  IN:  {t}")
    print(f"  OUT: {fix_text(t)}")
    print()

# Process file
process_file('data/questions.json', 'data/questions_fixed.json')
