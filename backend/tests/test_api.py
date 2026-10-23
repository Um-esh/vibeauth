import pytest

def test_api_health(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['status'] == 'healthy'
    assert 'device' in data

def test_api_models(client):
    res = client.get('/api/models')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'generation_model_loaded' in data

def test_api_analyze(client):
    res = client.post('/api/analyze', json={
        'text': 'Please submit the Q3 financial report to Sarah by Friday October 30.'
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'source_analysis' in data
    assert 'classification' in data['source_analysis']

def test_api_rewrite_executive(client):
    res = client.post('/api/rewrite', json={
        'text': 'We must submit the Q3 financial report to Sarah by Friday October 30 at 5:00 PM with the $450,000 revised budget.',
        'persona': 'executive',
        'attributes': {'conciseness': 5, 'formality': 4}
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'rewritten_text' in data
    assert len(data['rewritten_text']) > 0
    assert 'diff' in data
    assert 'preservation_report' in data

def test_api_rewrite_all_personas(client):
    for persona in ['peer', 'legal', 'casual']:
        res = client.post('/api/rewrite', json={
            'text': 'The meeting has been rescheduled to tomorrow at 2 PM.',
            'persona': persona
        })
        assert res.status_code == 200
        data = res.get_json()['data']
        assert data['persona'] == persona
        assert len(data['rewritten_text']) > 0

def test_api_rewrite_validation_errors(client):
    # Empty text
    res = client.post('/api/rewrite', json={
        'text': '   ',
        'persona': 'executive'
    })
    assert res.status_code == 422

    # Invalid persona
    res = client.post('/api/rewrite', json={
        'text': 'Valid text',
        'persona': 'pirate_captain'
    })
    assert res.status_code == 422

def test_api_history_workflow(client):
    # Perform a rewrite to populate history
    res = client.post('/api/rewrite', json={
        'text': 'Sarah approved the $50k invoice yesterday.',
        'persona': 'peer',
        'save_to_history': True
    })
    assert res.status_code == 200
    item_id = res.get_json()['data']['history_id']
    assert item_id is not None

    # Retrieve history list
    list_res = client.get('/api/history')
    assert list_res.status_code == 200
    items = list_res.get_json()['data']
    assert len(items) >= 1

    # Retrieve individual item
    get_res = client.get(f'/api/history/{item_id}')
    assert get_res.status_code == 200
    assert get_res.get_json()['data']['id'] == item_id

    # Delete single item
    del_res = client.delete(f'/api/history/{item_id}')
    assert del_res.status_code == 200

    # Clear all history
    clear_res = client.delete('/api/history?confirm=true')
    assert clear_res.status_code == 200

def test_api_languages(client):
    res = client.get('/api/languages')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'es' in data
    assert 'fr' in data

def test_api_translate(client):
    res = client.post('/api/translate', json={
        'text': 'Good morning team',
        'target_lang': 'es'
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'translated_text' in data
    assert len(data['translated_text']) > 0

