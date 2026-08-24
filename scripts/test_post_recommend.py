import urllib.request
import json

req_body = {
    "subcategory": "shirts",
    "user_profile": {
        "gender": "male",
        "skin_tone": "Tan",
        "monk_tone": "MST-06",
        "undertone": "Warm",
        "face_shape": "Oval"
    },
    "quiz_answers": {
        "occasion": "Casual",
        "color_mood": "Earth Tone"
    }
}

req = urllib.request.Request(
    "http://localhost:8000/api/v1/recommend",
    data=json.dumps(req_body).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read())
        print(f"Subcategory: {data.get('subcategory')}")
        print(f"Primary Auto Attached: {data.get('primary_auto_attached_item', {}).get('name')}")
        print(f"Color: {data.get('primary_auto_attached_item', {}).get('base_colour')}")
        print("\nTop Items:")
        for it in data.get("items", []):
            print(f"- [{it.get('rank')}] {it.get('archetype_title')}: {it.get('name')} ({it.get('base_colour')} - {it.get('hex_colour')})")
            print(f"  Score: {it.get('compatibility_score')}% | Reason: {it.get('stylist_reason')}")
except Exception as e:
    print(f"Error: {e}")
