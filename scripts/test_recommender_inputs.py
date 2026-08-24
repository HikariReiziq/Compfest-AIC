import requests
import json

url = 'http://localhost:8000/api/v1/recommend'

quizzes = [
    {'occasion': 'Formal', 'fit_preference': 'Slim Fit', 'color_mood': 'Jewel Tone / Sejuk'},
    {'occasion': 'Streetwear', 'fit_preference': 'Oversized / Boxy', 'color_mood': 'Neutral / Monokrom'},
    {'occasion': 'Sports / Outdoor', 'fit_preference': 'Regular Fit', 'color_mood': 'Bold / Vibrant'},
    {'occasion': 'Party', 'fit_preference': 'Layered / Textured', 'color_mood': 'Earth Tone'}
]

for sub in ['glasses', 'hats', 'shirts']:
    print(f"\n================== SUBCATEGORY: {sub} ==================")
    for q in quizzes:
        payload = {
            'subcategory': sub,
            'user_profile': {'undertone': 'Warm', 'face_shape': 'Oval', 'gender': 'male'},
            'quiz_answers': q
        }
        res = requests.post(url, json=payload)
        data = res.json()
        print(f"\nQuiz {q['occasion']} | {q['fit_preference']} | {q['color_mood']}:")
        for it in data.get('items', []):
            print(f"   Rank {it['rank']} ({it['archetype']}): {it['name']} [{it['base_colour']}] - {it['price_idr']} (score: {it['compatibility_score']}%)")
