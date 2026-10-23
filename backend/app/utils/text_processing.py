import re
from typing import List, Dict, Any, Set

# Regex patterns for high-precision extraction
URL_PATTERN = re.compile(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w\.-]*', re.IGNORECASE)
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

# Numbers: currency ($100, €50, £1,000.50), percentages (15%, 3.5 percent), integers, decimals, fractions
NUMBER_PATTERN = re.compile(
    r'(?:[\$€£¥₹]\s*[\d,]+(?:\.\d+)?)|'               # Currency
    r'(?:\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|percent|USD|EUR|GBP|k|M|B)?\b)|' # Quantities & percentages
    r'(?:\b(?:first|second|third|fourth|fifth|one|two|three|four|five|six|seven|eight|nine|ten)\b)', # Common word numbers
    re.IGNORECASE
)

# Date expressions: YYYY-MM-DD, DD/MM/YYYY, Month DD, YYYY, Days of week, quarters
DATE_PATTERN = re.compile(
    r'(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?\b)|'
    r'(?:\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{4})?\b)|'
    r'(?:\b\d{4}-\d{2}-\d{2}\b)|'
    r'(?:\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)|'
    r'(?:\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)|'
    r'(?:\bQ[1-4](?:\s+\d{4})?\b)|'
    r'(?:\b(?:tomorrow|yesterday|today|next week|end of week|end of month|Q[1-4])\b)',
    re.IGNORECASE
)

NEGATION_TERMS = {
    'not', 'no', 'never', 'none', 'neither', 'nor', 'hardly', 'scarcely', 'barely',
    "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot", "couldn't",
    "shouldn't", "mustn't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't"
}

OBLIGATION_TERMS = {
    'must', 'shall', 'required', 'mandatory', 'obligation', 'obligated', 'compulsory',
    'have to', 'has to', 'need to', 'crucial', 'essential'
}

DISCRETIONARY_TERMS = {
    'may', 'might', 'optional', 'discretionary', 'can', 'could', 'suggested', 'recommended'
}

COMMON_STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'so', 'because',
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'than', 'too', 'very', 'can', 'will', 'just',
    'should', 'now', 'we', 'you', 'they', 'it', 'he', 'she', 'i',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'please', 'also', 'all', 'our', 'your', 'my', 'their', 'his', 'her'
}

def split_sentences(text: str) -> List[str]:
    """Splits text into sentences using punctuation boundaries."""
    if not text or not text.strip():
        return []
    # Match sentence boundaries (period, question mark, exclamation mark followed by whitespace or end)
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]

def tokenize_words(text: str) -> List[str]:
    """Extracts words from text preserving contractions and alphanumeric tokens."""
    if not text:
        return []
    return re.findall(r"\b[\w'-]+\b", text)

def extract_entities(text: str) -> List[str]:
    """
    Extracts potential named entities (names, organizations, places, acronyms)
    using case patterns, title case sequences, and non-sentence-initial capitalized tokens.
    """
    if not text:
        return []
    
    sentences = split_sentences(text)
    entities = []
    
    for sentence in sentences:
        words = sentence.split()
        if not words:
            continue
        
        # Candidate sequence tracking
        current_seq = []
        for i, word in enumerate(words):
            # Clean punctuation from edges
            clean_w = re.sub(r'^[^\w]+|[^\w]+$', '', word)
            if not clean_w:
                continue
                
            # Treat uppercase acronyms (like CEO, GDPR, AWS, NASA) as entities anywhere
            if clean_w.isupper() and len(clean_w) >= 2:
                current_seq.append(clean_w)
                continue
            
            # Capitalized word (Titlecase)
            if clean_w[0].isupper() and not clean_w.isupper():
                # If first word in sentence, only consider if it's followed by another titlecased word
                # or is a known proper pattern
                if i == 0:
                    current_seq.append(clean_w)
                else:
                    current_seq.append(clean_w)
            else:
                if current_seq:
                    if len(current_seq) > 1 or (len(current_seq) == 1 and current_seq[0] != words[0].strip('.,!?;:')):
                        entities.append(' '.join(current_seq))
                    elif len(current_seq) == 1 and (current_seq[0].isupper() and len(current_seq[0]) >= 2):
                        entities.append(current_seq[0])
                    current_seq = []
        
        if current_seq:
            if len(current_seq) > 1 or (len(current_seq) == 1 and current_seq[0] != words[0].strip('.,!?;:')):
                entities.append(' '.join(current_seq))
            elif len(current_seq) == 1 and (current_seq[0].isupper() and len(current_seq[0]) >= 2):
                entities.append(current_seq[0])
                
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for ent in entities:
        ent_clean = ent.strip('.,;:')
        if (
            ent_clean and
            ent_clean.lower() not in seen and
            len(ent_clean) > 1 and
            ent_clean.lower() not in COMMON_STOPWORDS
        ):
            seen.add(ent_clean.lower())
            deduped.append(ent_clean)
    return deduped

def extract_numbers(text: str) -> List[str]:
    """Extracts numerical quantities, percentages, and currencies."""
    if not text:
        return []
    matches = NUMBER_PATTERN.findall(text)
    # Deduplicate while preserving order
    seen = set()
    result = []
    for m in matches:
        clean = m.strip().lower()
        if clean and clean not in seen:
            seen.add(clean)
            result.append(m.strip())
    return result

def extract_dates(text: str) -> List[str]:
    """Extracts date strings and temporal expressions."""
    if not text:
        return []
    matches = DATE_PATTERN.findall(text)
    seen = set()
    result = []
    for m in matches:
        clean = m.strip().lower()
        if clean and clean not in seen:
            seen.add(clean)
            result.append(m.strip())
    return result

def extract_contact_info(text: str) -> Dict[str, List[str]]:
    """Extracts URLs and emails from text."""
    urls = URL_PATTERN.findall(text)
    emails = EMAIL_PATTERN.findall(text)
    return {
        'urls': list(set(urls)),
        'emails': list(set(emails))
    }

def detect_negations(text: str) -> List[str]:
    """Finds negation words used in text."""
    tokens = [w.lower() for w in tokenize_words(text)]
    return [w for w in tokens if w in NEGATION_TERMS]

def detect_obligations(text: str) -> Dict[str, List[str]]:
    """Detects obligations and discretionary phrases."""
    text_lower = text.lower()
    obligations = [term for term in OBLIGATION_TERMS if term in text_lower]
    discretionary = [term for term in DISCRETIONARY_TERMS if term in text_lower]
    return {
        'obligations': list(set(obligations)),
        'discretionary': list(set(discretionary))
    }

def compute_text_stats(text: str) -> Dict[str, Any]:
    """Computes text metrics including word, sentence, character counts and readability."""
    words = tokenize_words(text)
    sentences = split_sentences(text)
    char_count = len(text)
    word_count = len(words)
    sentence_count = max(1, len(sentences))
    
    avg_sentence_len = round(word_count / sentence_count, 1) if word_count > 0 else 0
    avg_word_len = round(sum(len(w) for w in words) / word_count, 1) if word_count > 0 else 0
    
    # Coleman-Liau Readability Index: 0.0588 * L - 0.296 * S - 15.8
    # L = average number of letters per 100 words, S = average number of sentences per 100 words
    if word_count > 0:
        letters = sum(len(w) for w in words if w.isalnum())
        L = (letters / word_count) * 100
        S = (sentence_count / word_count) * 100
        coleman_liau = round(0.0588 * L - 0.296 * S - 15.8, 1)
        coleman_liau = max(1.0, min(18.0, coleman_liau))
    else:
        coleman_liau = 0.0
        
    return {
        'character_count': char_count,
        'word_count': word_count,
        'sentence_count': len(sentences),
        'avg_sentence_length': avg_sentence_len,
        'avg_word_length': avg_word_len,
        'readability_grade': coleman_liau
    }
