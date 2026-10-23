"""
Stage 2 Classifier Training Script
Trains communicational intent and formality classifiers using scikit-learn.
Outputs reproducible evaluation metrics and saved model artifacts.
"""

import os
import json
import logging
from pathlib import Path
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, f1_score

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] %(message)s')
logger = logging.getLogger('train_classifier')

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / 'data' / 'classifier_training_data.json'
OUTPUT_DIR = BASE_DIR / 'models_cache' / 'joblib'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_PATH = BASE_DIR / 'data' / 'classifier_evaluation_report.json'

RANDOM_SEED = 42

def load_and_validate_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")
    
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    logger.info(f"Loaded {len(data)} raw samples from {DATA_PATH.name}")
    
    # Validation & Deduplication
    seen = set()
    cleaned = []
    for item in data:
        text = item.get('text', '').strip()
        intent = item.get('intent', '').strip()
        formality = item.get('formality', '').strip()
        
        if not text or not intent or not formality:
            continue
        
        key = text.lower()
        if key in seen:
            logger.warning(f"Duplicate entry found and omitted: {text[:40]}...")
            continue
        seen.add(key)
        cleaned.append({'text': text, 'intent': intent, 'formality': formality})
        
    logger.info(f"Retained {len(cleaned)} validated, deduplicated samples.")
    return cleaned

def train_and_evaluate():
    data = load_and_validate_data()
    texts = [d['text'] for d in data]
    intents = [d['intent'] for d in data]
    formalities = [d['formality'] for d in data]
    
    report = {
        'random_seed': RANDOM_SEED,
        'dataset_size': len(data),
        'intent_classes': sorted(list(set(intents))),
        'formality_classes': sorted(list(set(formalities))),
        'metrics': {}
    }
    
    # 1. Train Intent Classifier
    logger.info("Training Intent Classifier Pipeline...")
    intent_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ('clf', LogisticRegression(C=2.0, max_iter=1000, random_state=RANDOM_SEED))
    ])
    
    # Stratified K-Fold cross validation
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_SEED)
    intent_cv_scores = cross_val_score(intent_pipeline, texts, intents, cv=cv, scoring='accuracy')
    logger.info(f"Intent 3-Fold CV Accuracy: {intent_cv_scores.mean():.3f} (+/- {intent_cv_scores.std():.3f})")
    
    # Train / Test split for full classification report
    X_train_int, X_test_int, y_train_int, y_test_int = train_test_split(
        texts, intents, test_size=0.25, random_state=RANDOM_SEED, stratify=intents
    )
    intent_pipeline.fit(X_train_int, y_train_int)
    y_pred_int = intent_pipeline.predict(X_test_int)
    
    intent_acc = accuracy_score(y_test_int, y_pred_int)
    intent_f1 = f1_score(y_test_int, y_pred_int, average='macro', zero_division=0)
    intent_report = classification_report(y_test_int, y_pred_int, output_dict=True, zero_division=0)
    
    # Fit final pipeline on all data for deployment
    intent_pipeline.fit(texts, intents)
    intent_model_path = OUTPUT_DIR / 'intent_classifier.joblib'
    joblib.dump(intent_pipeline, intent_model_path)
    logger.info(f"Saved Intent Classifier to {intent_model_path}")

    # 2. Train Formality Classifier
    logger.info("Training Formality Classifier Pipeline...")
    formality_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ('clf', LogisticRegression(C=2.0, max_iter=1000, random_state=RANDOM_SEED))
    ])
    
    formality_cv_scores = cross_val_score(formality_pipeline, texts, formalities, cv=cv, scoring='accuracy')
    logger.info(f"Formality 3-Fold CV Accuracy: {formality_cv_scores.mean():.3f} (+/- {formality_cv_scores.std():.3f})")
    
    X_train_for, X_test_for, y_train_for, y_test_for = train_test_split(
        texts, formalities, test_size=0.25, random_state=RANDOM_SEED, stratify=formalities
    )
    formality_pipeline.fit(X_train_for, y_train_for)
    y_pred_for = formality_pipeline.predict(X_test_for)
    
    formality_acc = accuracy_score(y_test_for, y_pred_for)
    formality_f1 = f1_score(y_test_for, y_pred_for, average='macro', zero_division=0)
    formality_report = classification_report(y_test_for, y_pred_for, output_dict=True, zero_division=0)
    
    # Fit final pipeline on all data for deployment
    formality_pipeline.fit(texts, formalities)
    formality_model_path = OUTPUT_DIR / 'formality_classifier.joblib'
    joblib.dump(formality_pipeline, formality_model_path)
    logger.info(f"Saved Formality Classifier to {formality_model_path}")
    
    report['metrics'] = {
        'intent': {
            'cv_mean_accuracy': round(float(intent_cv_scores.mean()), 3),
            'cv_std_accuracy': round(float(intent_cv_scores.std()), 3),
            'test_accuracy': round(float(intent_acc), 3),
            'test_macro_f1': round(float(intent_f1), 3),
            'details': intent_report
        },
        'formality': {
            'cv_mean_accuracy': round(float(formality_cv_scores.mean()), 3),
            'cv_std_accuracy': round(float(formality_cv_scores.std()), 3),
            'test_accuracy': round(float(formality_acc), 3),
            'test_macro_f1': round(float(formality_f1), 3),
            'details': formality_report
        }
    }
    
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved training evaluation report to {REPORT_PATH}")
    print("Classifier training and evaluation successfully completed!")

if __name__ == '__main__':
    train_and_evaluate()
