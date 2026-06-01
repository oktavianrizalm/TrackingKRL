import urllib.request
import json

query = """
[out:json];
way["railway"="subway"](-6.4, 106.7, -6.1, 106.9);
out geom;
"""

req = urllib.request.Request(
    'https://overpass.kumi.systems/api/interpreter',
    data=f"data={urllib.parse.quote(query)}".encode('utf-8'),
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        
        if not data.get('elements'):
            print("No elements found!")
        else:
            print(f"Found {len(data['elements'])} subway ways!")
            
            with open('d:/side/Commuter Tracking/overpass-subway.json', 'w') as f:
                json.dump(data, f)
            print("Saved to overpass-subway.json")
except Exception as e:
    print(f"Error: {e}")
