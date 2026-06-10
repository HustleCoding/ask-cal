import json, os, re, time, html
import requests
from html2text import HTML2Text

BASE = "https://calnewport.com/wp-json/wp/v2/posts"
OUT = "/home/ubuntu/calnewport"
os.makedirs(f"{OUT}/articles", exist_ok=True)

h = HTML2Text()
h.ignore_links = False
h.body_width = 0

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (archive script)"

posts = []
page = 1
while True:
    r = session.get(BASE, params={"per_page": 100, "page": page, "orderby": "date", "order": "asc"})
    if r.status_code == 400:
        break
    r.raise_for_status()
    batch = r.json()
    if not batch:
        break
    posts.extend(batch)
    print(f"page {page}: {len(batch)} posts (total {len(posts)})")
    page += 1
    time.sleep(0.5)

index = []
for p in posts:
    date = p["date"][:10]
    slug = p["slug"][:80]
    title = html.unescape(p["title"]["rendered"])
    year = date[:4]
    os.makedirs(f"{OUT}/articles/{year}", exist_ok=True)
    md = h.handle(p["content"]["rendered"])
    fname = f"{year}/{date}-{slug}.md"
    with open(f"{OUT}/articles/{fname}", "w") as f:
        f.write(f"# {title}\n\nDate: {date}\nURL: {p['link']}\n\n---\n\n{md}")
    index.append({"date": date, "title": title, "url": p["link"], "file": fname})

with open(f"{OUT}/index.json", "w") as f:
    json.dump(index, f, indent=2)
print(f"DONE: {len(index)} articles saved")
