#!/usr/bin/env python3
"""scenario.com でストア用の背景を生成して落とす。
日本語のコピーは描かせない(字形が崩れるため)。背景と装飾だけ作らせて、文字と実画面は後乗せする。"""
import base64, json, os, sys, time, urllib.request

API = "https://api.cloud.scenario.com/v1"
MODEL = "model_openai-gpt-image-2"
AUTH = base64.b64encode(
    f"{os.environ['SCENARIO_API_KEY']}:{os.environ['SCENARIO_API_SECRET']}".encode()
).decode()
OUT = sys.argv[1]


def req(method, path, body=None):
    r = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": "Basic " + AUTH, "Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(r, timeout=120) as res:
        return json.load(res)


def generate(name, prompt, width, height):
    dest = os.path.join(OUT, name + ".png")
    if os.path.exists(dest):
        print(f"  {name}: 既にあるのでスキップ")
        return dest
    job = req("POST", f"/generate/custom/{MODEL}",
              {"prompt": prompt, "width": width, "height": height, "numSamples": 1})["job"]
    jid = job["jobId"]
    print(f"  {name}: {jid} 投入 ({job['billing']['cuCost']}CU)", flush=True)
    for _ in range(120):
        time.sleep(5)
        j = req("GET", f"/jobs/{jid}")["job"]
        if j["status"] == "success":
            break
        if j["status"] in ("failure", "canceled"):
            print(f"  {name}: 失敗 {j.get('statusHistory')}")
            return None
    else:
        print(f"  {name}: タイムアウト")
        return None
    asset_id = j["metadata"]["assetIds"][0]
    url = req("GET", f"/assets/{asset_id}")["asset"]["url"]
    urllib.request.urlretrieve(url, dest)
    print(f"  {name}: 保存 {dest}", flush=True)
    return dest


# 新しいアイコン(コーラル〜ピーチのグラデーション)に合わせた明るい暖色で統一する。
# アプリ本体はダークテーマなので、明るい背景に置くと実画面が締まって見える。
COMMON = (
    "Soft premium marketing background for a mobile app store screenshot. "
    "Smooth warm gradient from pale peach #FCC3A8 at the top to coral orange #F5824E at the bottom, "
    "very smooth, subtle fine film grain, no banding. "
    "Generous completely empty space in the upper third for a text overlay, "
    "and empty space in the lower two thirds where a phone screen will be placed. "
    "Extremely minimal, calm, modern 2026 app store aesthetic. "
    "Absolutely no text, no letters, no numbers, no logos, no user interface, no phone, no device, no people."
)

SCENES = [
    ("01-listen",
     "Delicate concentric sound wave rings expanding softly outward from the lower center and fading, "
     "thin luminous white arcs, a gentle warm glow, floating light particles. " + COMMON),
    ("02-detect",
     "Several small glowing dots connected by very thin light threads, converging into one brighter point "
     "in the lower center, tiny sparks rising, a sense of many sources igniting the same topic. " + COMMON),
    ("03-clean",
     "Extremely minimal composition, one soft vertical column of white light in the center suggesting a clean "
     "reading surface, faint horizontal lines fading at the edges like settled text, calm and uncluttered. " + COMMON),
    ("04-sites",
     "An orderly grid of many small soft rounded translucent tiles receding into gentle depth, "
     "a few tiles glowing slightly brighter, a sense of abundance organized into one place. " + COMMON),
    ("05-ranking",
     "Three soft ascending columns of light of increasing height in the lower center, the tallest crowned with "
     "a gentle white glow, soft upward light streaks, a subtle sense of ranking and momentum. " + COMMON),
    ("06-foryou",
     "Soft concentric orbit rings of light gradually tightening toward a warm bright core in the lower center, "
     "delicate particle trails, intimate and personal. " + COMMON),
]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, prompt in SCENES:
        generate(name, prompt, 1024, 1536)
    generate(
        "feature-graphic",
        "Wide premium banner background for an app store feature graphic. "
        "Smooth warm gradient from pale peach #FCC3A8 on the left to coral orange #F5824E on the right, "
        "three soft white rounded speech bubble silhouettes of different sizes floating on the right side, "
        "very soft shadows, subtle fine film grain, generous empty space on the left for a text overlay, "
        "extremely minimal, modern 2026 aesthetic. "
        "Absolutely no text, no letters, no numbers, no logos, no user interface.",
        1536, 1024,
    )
    print("完了")
