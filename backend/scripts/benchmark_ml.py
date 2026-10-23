"""
Repeatable ML Evaluation and Latency Benchmark Script.
Evaluates:
- Persona transformation inference latency (ms)
- Peak memory consumption
- Factual entity preservation rate
- Numerical and date preservation rate
- Semantic similarity scores (SentenceTransformer dense embeddings)
- Lexical word-change rate
"""

import sys
import os
import json
import time
import tracemalloc
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.services.rewrite_service import RewriteService

BENCHMARK_SAMPLES = [
    {
        'id': 'sample_1_executive_brief',
        'text': 'We must submit the Q3 financial report to Sarah by Friday October 30 at 5:00 PM with the $450,000 revised budget. The unexpected database migration caused a 15% delay, but all core deliverables will remain intact.',
        'target_persona': 'executive',
        'attributes': {'conciseness': 5, 'formality': 4, 'friendliness': 2}
    },
    {
        'id': 'sample_2_compliance_notice',
        'text': 'Pursuant to updated GDPR guidelines, all developers must encrypt production credentials at rest. Do not commit .env files to public repositories. All vendor keys will expire automatically after 90 days on November 15.',
        'target_persona': 'legal',
        'attributes': {'conciseness': 3, 'formality': 5, 'technical_depth': 4}
    },
    {
        'id': 'sample_3_peer_sync',
        'text': 'Hey everyone, the core team decided to migrate our analytics storage from MongoDB to PostgreSQL by next Tuesday. Please test your query endpoints in staging and report any latency regression in the Slack channel.',
        'target_persona': 'peer',
        'attributes': {'friendliness': 5, 'conciseness': 3, 'formality': 2}
    },
    {
        'id': 'sample_4_casual_event',
        'text': 'Good news team! Leadership approved our Q4 internal hackathon for December 12. First prize is $1,500 and free tacos for everybody who participates. Make sure you register your squad by December 5.',
        'target_persona': 'casual',
        'attributes': {'energy': 5, 'friendliness': 5, 'formality': 1}
    }
]

def run_benchmark():
    print("=" * 70)
    print(" Running Instant Persona & Communication Transformer Benchmark")
    print("=" * 70)
    
    tracemalloc.start()
    
    results = []
    latencies = []
    similarities = []
    word_change_pcts = []
    entity_rates = []
    number_rates = []
    
    for item in BENCHMARK_SAMPLES:
        sample_id = item['id']
        text = item['text']
        persona = item['target_persona']
        attrs = item['attributes']
        
        print(f"\nEvaluating '{sample_id}' -> Persona: {persona.upper()}...")
        start_t = time.perf_counter()
        
        output = RewriteService.execute_pipeline(
            text=text,
            persona=persona,
            attributes=attrs,
            enable_controlled_regeneration=True
        )
        
        elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
        latencies.append(elapsed_ms)
        
        preservation = output['preservation_report']
        sim_score = preservation['semantic_similarity']['similarity_score']
        similarities.append(sim_score)
        
        diff = output['diff']
        word_change = diff['words_changed_percent']
        word_change_pcts.append(word_change)
        
        ent_rate = preservation['entity_check']['preservation_rate']
        num_rate = preservation['number_check']['preservation_rate']
        entity_rates.append(ent_rate)
        number_rates.append(num_rate)
        
        print(f"  Inference Latency:     {elapsed_ms} ms")
        print(f"  Semantic Similarity:   {sim_score}")
        print(f"  Word Change Rate:      {word_change}%")
        print(f"  Entity Preserved Rate: {round(ent_rate * 100)}%")
        print(f"  Number Preserved Rate: {round(num_rate * 100)}%")
        print(f"  Preservation Passed:   {preservation['passed']} (Risk: {preservation['risk_level']})")
        print(f"  Rewritten Output:      {output['rewritten_text'][:100]}...")
        
        results.append({
            'sample_id': sample_id,
            'persona': persona,
            'latency_ms': elapsed_ms,
            'semantic_similarity': sim_score,
            'words_changed_percent': word_change,
            'entity_preservation_rate': ent_rate,
            'number_preservation_rate': num_rate,
            'validation_passed': preservation['passed'],
            'risk_level': preservation['risk_level'],
            'original_text': text,
            'rewritten_text': output['rewritten_text']
        })
        
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    peak_mb = round(peak_mem / (1024 * 1024), 2)
    
    summary = {
        'total_evaluated_samples': len(BENCHMARK_SAMPLES),
        'average_latency_ms': round(sum(latencies) / len(latencies), 1),
        'min_latency_ms': min(latencies),
        'max_latency_ms': max(latencies),
        'average_semantic_similarity': round(sum(similarities) / len(similarities), 3),
        'average_words_changed_percent': round(sum(word_change_pcts) / len(word_change_pcts), 1),
        'average_entity_preservation_rate': round(sum(entity_rates) / len(entity_rates), 3),
        'average_number_preservation_rate': round(sum(number_rates) / len(number_rates), 3),
        'peak_memory_mb': peak_mb,
        'results': results
    }
    
    out_path = Path(__file__).resolve().parent.parent / 'data' / 'ml_benchmark_report.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
        
    print("\n" + "=" * 70)
    print(" BENCHMARK COMPLETED")
    print(f" Average Latency:           {summary['average_latency_ms']} ms")
    print(f" Average Semantic Sim:      {summary['average_semantic_similarity']}")
    print(f" Average Entity Preserved:  {round(summary['average_entity_preservation_rate'] * 100)}%")
    print(f" Average Numbers Preserved: {round(summary['average_number_preservation_rate'] * 100)}%")
    print(f" Peak Memory Overhead:      {peak_mb} MB")
    print(f" Report Saved To:           {out_path}")
    print("=" * 70)

if __name__ == '__main__':
    run_benchmark()
