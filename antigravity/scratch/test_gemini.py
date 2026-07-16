import urllib.request
import json
import ssl

API_KEY = "AIzaSyCAQMKIgfAY-cxACt-_7e-ESVXn3HO6udo" # From config.php

def test_model(model_name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": "Hello, respond with 'Success'."}]}]
    }
    
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    
    # Ignore SSL verification if there are cert issues
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"[{model_name}] HTTP Code: {status}")
            print(f"[{model_name}] Response: {body[:300]}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e else ""
        print(f"[{model_name}] Error HTTP Code: {e.code}")
        print(f"[{model_name}] Error Body: {body}")
        return False
    except Exception as e:
        print(f"[{model_name}] Error: {e}")
        return False

print("Testing different model IDs...")
test_model("gemini-2.5-flash")
test_model("gemini-1.5-flash")
test_model("gemini-2.0-flash")
test_model("gemini-3.5-flash")
