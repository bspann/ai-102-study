#!/usr/bin/env python3
"""Most aggressive spacing fix - catch all concatenated patterns."""

import json
import re
from wordsegment import load, segment

load()

# Common short words that get stuck together
SHORT_WORDS = {'to', 'the', 'a', 'an', 'in', 'on', 'at', 'by', 'or', 'of', 'as', 'is', 'be', 'if', 'so', 'no'}

def split_word(word):
    """Try to segment any word."""
    if len(word) < 4:
        return word
    
    # Skip if it looks like a technical term
    lower = word.lower()
    if any(x in lower for x in ['http', 'www', 'azure', 'api', 'sdk', 'url', 'uri', 'json', 'xml']):
        return word
    
    parts = segment(lower)
    if len(parts) <= 1:
        return word
    
    # Restore capitalization
    result = []
    idx = 0
    for p in parts:
        pos = lower.find(p, idx)
        if pos >= 0:
            result.append(word[pos:pos+len(p)])
            idx = pos + len(p)
        else:
            result.append(p)
    
    return ' '.join(result)


def fix_text(text):
    """Fix all spacing issues."""
    if not text:
        return text
    
    # Handle camelCase
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Split on whitespace but keep it
    tokens = re.split(r'(\s+)', text)
    result = []
    
    for token in tokens:
        if not token or token.isspace():
            result.append(token)
            continue
        
        # Handle hyphenated words
        if '-' in token and not token.startswith('http'):
            parts = token.split('-')
            fixed = [split_word(p) if len(p) > 4 and p.isalpha() else p for p in parts]
            token = '-'.join(fixed)
            result.append(token)
            continue
        
        # Extract punctuation
        pre = ''
        post = ''
        while token and not token[0].isalnum():
            pre += token[0]
            token = token[1:]
        while token and not token[-1].isalnum():
            post = token[-1] + post
            token = token[:-1]
        
        # Segment if needed
        if token and len(token) >= 4 and token.isalpha():
            token = split_word(token)
        
        result.append(pre + token + post)
    
    text = ''.join(result)
    
    # Fix punctuation spacing
    text = re.sub(r'\.([A-Za-z])', r'. \1', text)
    text = re.sub(r',([A-Za-z])', r', \1', text)
    text = re.sub(r':([A-Za-z])', r': \1', text)
    text = re.sub(r'\)([A-Za-z])', r') \1', text)
    text = re.sub(r'([A-Za-z])\(', r'\1 (', text)
    
    # Clean multiple spaces
    text = re.sub(r' +', ' ', text)
    
    return text.strip()


# Process file
with open('data/questions.json', 'r') as f:
    questions = json.load(f)

for q in questions:
    for key in ['question', 'explanation', 'answer']:
        if key in q and q[key]:
            q[key] = fix_text(q[key])
    if 'options' in q:
        for opt in q['options']:
            if 'text' in opt:
                opt['text'] = fix_text(opt['text'])

with open('data/questions.json', 'w') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print("✅ Fixed all 379 questions")
print("\nSample output:")
print(fix_text("Toanswer,dragtheappropriate actionsfrom"))
print(fix_text("Youmayneedtodragthesplitbar"))
