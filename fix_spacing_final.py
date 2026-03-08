#!/usr/bin/env python3
"""Final fix for spacing issues - handles more edge cases."""

import json
import re
from wordsegment import load, segment

load()

def segment_word(word):
    """Segment a word that might be concatenated."""
    if len(word) < 6:
        return word
    
    # Skip URLs and technical terms
    skip_patterns = ['http', 'www', '.com', '.org', 'azure', 'microsoft', 'api', 'sdk', 'json', 'xml', 'uri', 'url']
    if any(x in word.lower() for x in skip_patterns):
        return word
    
    parts = segment(word.lower())
    if len(parts) <= 1:
        return word
    
    # Restore original case
    result = []
    pos = 0
    for p in parts:
        # Find in original
        idx = word.lower().find(p, pos)
        if idx >= 0:
            orig = word[idx:idx+len(p)]
            result.append(orig)
            pos = idx + len(p)
        else:
            result.append(p)
    
    return ' '.join(result)


def fix_text(text):
    """Fix all spacing issues in text."""
    if not text:
        return text
    
    # Step 1: Handle camelCase first
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Step 2: Process each token
    tokens = re.findall(r'\S+|\s+', text)
    result = []
    
    for token in tokens:
        if token.isspace():
            result.append(token)
            continue
        
        # Handle hyphenated words specially
        if '-' in token:
            parts = token.split('-')
            fixed_parts = []
            for p in parts:
                if len(p) >= 6 and p.isalpha():
                    fixed_parts.append(segment_word(p))
                else:
                    fixed_parts.append(p)
            token = '-'.join(fixed_parts)
        else:
            # Strip leading/trailing punctuation
            leading = ''
            trailing = ''
            word = token
            
            while word and not word[0].isalnum():
                leading += word[0]
                word = word[1:]
            while word and not word[-1].isalnum():
                trailing = word[-1] + trailing
                word = word[:-1]
            
            # Segment if it looks concatenated
            if word and len(word) >= 6 and word.isalpha():
                word = segment_word(word)
            
            token = leading + word + trailing
        
        result.append(token)
    
    text = ''.join(result)
    
    # Step 3: Fix punctuation spacing
    text = re.sub(r'\.([A-Z])', r'. \1', text)
    text = re.sub(r',([A-Za-z])', r', \1', text)
    text = re.sub(r':([A-Za-z])', r': \1', text)
    text = re.sub(r'\)([A-Za-z])', r') \1', text)
    
    # Step 4: Clean up
    text = re.sub(r' +', ' ', text)
    
    return text.strip()


def process_file(input_path, output_path):
    """Process and fix the questions file."""
    with open(input_path, 'r') as f:
        questions = json.load(f)
    
    for q in questions:
        for key in ['question', 'explanation', 'answer']:
            if key in q and q[key]:
                q[key] = fix_text(q[key])
        
        if 'options' in q:
            for opt in q['options']:
                if 'text' in opt:
                    opt['text'] = fix_text(opt['text'])
    
    with open(output_path, 'w') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Fixed {len(questions)} questions -> {output_path}")


# Quick test
tests = [
    "thesmarte-commerce",
    "Eachcorrectselection", 
    "Toanswer,dragtheappropriate",
    "suchasimages"
]
print("Tests:")
for t in tests:
    print(f"  {t} -> {fix_text(t)}")

# Process
process_file('data/questions.json', 'data/questions_fixed.json')
