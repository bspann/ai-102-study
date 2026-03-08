#!/usr/bin/env python3
"""Final spacing fix with explicit common patterns."""

import json
import re
from wordsegment import load, segment

load()

# Explicit patterns for common concatenations
PATTERNS = [
    # Common prefixes
    (r'\b(To)(answer)', r'\1 \2'),
    (r'\b(To)(the)', r'\1 \2'),
    (r'\b(In)(the)', r'\1 \2'),
    (r'\b(In)(a)', r'\1 \2'),
    (r'\b(Of)(the)', r'\1 \2'),
    (r'\b(Of)(a)', r'\1 \2'),
    (r'\b(For)(the)', r'\1 \2'),
    (r'\b(For)(each)', r'\1 \2'),
    (r'\b(As)(a)', r'\1 \2'),
    (r'\b(As)(the)', r'\1 \2'),
    (r'\b(On)(the)', r'\1 \2'),
    (r'\b(By)(the)', r'\1 \2'),
    (r'\b(At)(the)', r'\1 \2'),
    (r'\b(Or)(the)', r'\1 \2'),
    (r'\b(If)(the)', r'\1 \2'),
    (r'\b(Is)(the)', r'\1 \2'),
    (r'\b(Is)(a)', r'\1 \2'),
    
    # drag the appropriate
    (r'(drag)(the)', r'\1 \2'),
    (r'(the)(appropriate)', r'\1 \2'),
    (r'(select)(the)', r'\1 \2'),
    (r'(move)(the)', r'\1 \2'),
    (r'(from)(the)', r'\1 \2'),
    (r'(into)(the)', r'\1 \2'),
    (r'(using)(the)', r'\1 \2'),
    (r'(with)(the)', r'\1 \2'),
    (r'(that)(can)', r'\1 \2'),
    (r'(that)(the)', r'\1 \2'),
    (r'(that)(is)', r'\1 \2'),
    (r'(that)(are)', r'\1 \2'),
    (r'(such)(as)', r'\1 \2'),
    (r'(more)(than)', r'\1 \2'),
    (r'(not)(at)', r'\1 \2'),
    (r'(at)(all)', r'\1 \2'),
    
    # Common verbs + articles
    (r'(need)(to)', r'\1 \2'),
    (r'(to)(drag)', r'\1 \2'),
    (r'(want)(to)', r'\1 \2'),
    (r'(able)(to)', r'\1 \2'),
    (r'(used)(to)', r'\1 \2'),
    (r'(have)(to)', r'\1 \2'),
    
    # Questions
    (r'(which)(of)', r'\1 \2'),
    (r'(each)(of)', r'\1 \2'),
    (r'(one)(of)', r'\1 \2'),
    (r'(all)(of)', r'\1 \2'),
    (r'(any)(of)', r'\1 \2'),
    (r'(some)(of)', r'\1 \2'),
    
    # Azure specific
    (r'(Azure)(the)', r'\1 \2'),
    (r'(the)(Azure)', r'\1 \2'),
    (r'(an)(Azure)', r'\1 \2'),
]

def apply_patterns(text):
    """Apply all pattern fixes."""
    for pattern, replacement in PATTERNS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def segment_word(word):
    """Segment a potentially concatenated word."""
    if len(word) < 8:
        return word
    
    lower = word.lower()
    if any(x in lower for x in ['http', 'www', 'azure', 'api', 'sdk', 'url', 'uri', 'json', 'xml', 'microsoft']):
        return word
    
    parts = segment(lower)
    if len(parts) <= 1:
        return word
    
    # Reconstruct with original case
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
    """Complete text fixing."""
    if not text:
        return text
    
    # Step 1: camelCase
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Step 2: Apply explicit patterns
    text = apply_patterns(text)
    
    # Step 3: Process tokens
    tokens = re.split(r'(\s+)', text)
    result = []
    
    for token in tokens:
        if not token or token.isspace():
            result.append(token)
            continue
        
        # Handle hyphenated
        if '-' in token and not token.startswith('http'):
            parts = token.split('-')
            fixed = []
            for p in parts:
                if len(p) >= 8 and p.isalpha():
                    fixed.append(segment_word(p))
                else:
                    fixed.append(p)
            result.append('-'.join(fixed))
            continue
        
        # Extract punctuation
        pre = post = ''
        while token and not token[0].isalnum():
            pre += token[0]
            token = token[1:]
        while token and not token[-1].isalnum():
            post = token[-1] + post
            token = token[:-1]
        
        if token and len(token) >= 8 and token.isalpha():
            token = segment_word(token)
        
        result.append(pre + token + post)
    
    text = ''.join(result)
    
    # Step 4: Apply patterns again (catch nested)
    text = apply_patterns(text)
    
    # Step 5: Punctuation
    text = re.sub(r'\.([A-Za-z])', r'. \1', text)
    text = re.sub(r',([A-Za-z])', r', \1', text)
    text = re.sub(r':([A-Za-z])', r': \1', text)
    text = re.sub(r'\)([A-Za-z])', r') \1', text)
    
    # Clean up
    text = re.sub(r' +', ' ', text)
    
    return text.strip()


# Test
tests = [
    "Toanswer,dragtheappropriate",
    "Youmayneedtodragthesplitbar",
    "suchasimages",
    "Eachcorrectselection"
]
print("Tests:")
for t in tests:
    print(f"  {t} -> {fix_text(t)}")

# Process file  
with open('data/questions_backup.json', 'r') as f:
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

print("\n✅ Fixed 379 questions")
