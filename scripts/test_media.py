import urllib.request

url = 'http://localhost:3000/api/v1/whatsapp/media/773eaa53-0a41-45ad-a616-c45bf1cef2cf/AC228175CC67E68A7734D1F745E5DAA8.jpg'
try:
    res = urllib.request.urlopen(url)
    print("STATUS:", res.status)
    print("CONTENT TYPE:", res.headers.get('Content-Type'))
    print("SIZE:", len(res.read()))
except Exception as e:
    print("ERROR:", e)
