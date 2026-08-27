#!/usr/bin/env python3
"""scenario.com でストア用の装飾素材(透過PNG)とパノラマ背景を生成して落とす。

  python3 scripts/store/gen-props.py estimate            # 未生成ぶんを dryRun して合計CUを表示(課金なし)
  python3 scripts/store/gen-props.py props [--only NAME] # 装飾候補 → store-assets/props/candidates/NAME-{1,2}.png
  python3 scripts/store/gen-props.py panorama            # Gemini 4K の横長背景 → store-assets/bg/panorama-{play,ios}.png
  python3 scripts/store/gen-props.py cutout SRC [DEST]   # 任意PNGを Photoroom で透過化(3CU)

必要: SCENARIO_API_KEY / SCENARIO_API_SECRET(環境変数)、ImageMagick 7(透過判定)

方針(docs/ASO-SCREENSHOTS.md):
- 実画面と日本語は AI に描かせない。背景と装飾だけ作らせて、文字と実画面は合成時に後乗せする
- 装飾はアイコン(assets/app/design/icon-master.png)を参照画像にして質感を揃える
- 既にあるファイルは飛ばす(再生成したいときは消してから実行する)

API の要点(2026-08 実測):
- POST /v1/generate/custom/{modelId}。/v1/generate/txt2img は standalone model を受け付けず 400
- パラメータは numOutputs(numSamples は無効)。GPT Image 2 の width/height は 16 の倍数
- ?dryRun=true を付けると {"creativeUnitsCost": N} だけ返りジョブは作られない
- 単価: GPT Image 2 1024² 透過 = 12CU/枚、Gemini 3.1 Flash 4K = 28CU、Photoroom 背景除去 = 3CU
"""
import argparse
import base64
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.cloud.scenario.com/v1"
ROOT = pathlib.Path(__file__).resolve().parents[2]
PROPS = ROOT / "store-assets/props"
CAND = PROPS / "candidates"
BG = ROOT / "store-assets/bg"
CACHE = PROPS / ".scenario-cache.json"
ICON = ROOT / "assets/app/design/icon-master.png"

GPT = "model_openai-gpt-image-2"
GEMINI = "model_google-gemini-3-1-flash"
PHOTOROOM = "model_photoroom-background-removal"

# ---- 素材の定義 ---------------------------------------------------------------

COMMON = (
    " Isolated single object, centered, on a fully transparent background. "
    "Same matte-glossy white ceramic material and soft studio lighting as the reference icon, "
    "with faint warm peach reflections on the underside. "
    "Absolutely no text, no letters, no numbers, no logos, no user interface, no phone, no device, "
    "no people, no ground shadow, no background."
)

PROP_SPECS = [
    ("bubble-big",
     "One large glossy rounded 3D speech bubble seen from a slight three-quarter angle, "
     "smooth and plump, completely blank inside (no lines, no dots)." + COMMON),
    ("bubble-cluster",
     "Three glossy rounded 3D speech bubbles of different sizes floating in a loose overlapping cluster, "
     "all blank inside, arranged diagonally." + COMMON),
    ("sound-rings",
     "Concentric soft translucent white sound-wave rings expanding outward from the center like audio ripples, "
     "thin luminous arcs with a gentle glow, semi-transparent, airy." + COMMON),
    ("flame",
     "One soft rounded 3D flame shape with a smooth coral-orange to warm amber gradient, "
     "cute and friendly rather than realistic fire, with a small inner lighter flame." + COMMON),
    ("crown-sparkles",
     "One small glossy 3D crown in warm gold-amber with three or four soft four-point sparkles floating around it." + COMMON),
]

PANORAMA_PROMPT = (
    "Wide seamless marketing background meant to be cut into three side-by-side app store screenshots. "
    "Smooth warm gradient from pale peach #FCC3A8 at the top to coral orange #F5824E at the bottom, very smooth, "
    "subtle fine film grain, no banding. Floating glossy white 3D speech bubbles in exactly the same matte-glossy "
    "ceramic material as the reference icon, a few soft translucent sound-wave rings and one small soft coral flame, "
    "scattered sparsely only near the left and right edges and along the top band. "
    "The center of each of the three vertical thirds must stay completely empty because a phone will be placed there. "
    "Very soft shadows, extremely minimal, calm, modern 2026 app store aesthetic. "
    "Absolutely no text, no letters, no numbers, no logos, no user interface, no phone, no device, no people."
)

# ---- API --------------------------------------------------------------------


def auth():
    try:
        key, secret = os.environ["SCENARIO_API_KEY"], os.environ["SCENARIO_API_SECRET"]
    except KeyError:
        sys.exit("SCENARIO_API_KEY / SCENARIO_API_SECRET を環境変数に設定してください")
    return base64.b64encode(f"{key}:{secret}".encode()).decode()


def req(method, path, body=None, query=""):
    r = urllib.request.Request(
        API + path + query,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Basic " + auth(), "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(r, timeout=180) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path}{query} → HTTP {e.code}: {e.read().decode(errors='replace')[:500]}")


def load_cache():
    return json.loads(CACHE.read_text()) if CACHE.exists() else {}


def save_cache(c):
    PROPS.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(c, indent=1, ensure_ascii=False) + "\n")


def upload(path: pathlib.Path, name: str) -> str:
    """画像を asset として上げて asset id を返す。同名は1回だけ上げてキャッシュする。"""
    cache = load_cache()
    key = f"asset:{name}:{int(path.stat().st_mtime)}"
    if key in cache:
        return cache[key]
    b64 = base64.b64encode(path.read_bytes()).decode()
    res = req("POST", "/assets", {"image": "data:image/png;base64," + b64, "name": name})
    asset = res.get("asset") or res
    asset_id = asset.get("id") or asset.get("assetId")
    if not asset_id:
        sys.exit(f"upload の応答に asset id が無い: {json.dumps(res)[:300]}")
    cache[key] = asset_id
    save_cache(cache)
    print(f"  upload {name}: {asset_id}")
    return asset_id


def dry_run(model, body) -> int:
    res = req("POST", f"/generate/custom/{model}", body, "?dryRun=true")
    return int(res.get("creativeUnitsCost", res.get("job", {}).get("billing", {}).get("cuCost", -1)))


def run_job(model, body, label) -> list:
    """ジョブを投げて完了まで待ち、生成された asset id の配列を返す。"""
    job = req("POST", f"/generate/custom/{model}", body)["job"]
    jid = job["jobId"]
    print(f"  {label}: {jid} 投入 ({job.get('billing', {}).get('cuCost', '?')}CU)", flush=True)
    for _ in range(180):
        time.sleep(5)
        j = req("GET", f"/jobs/{jid}")["job"]
        if j["status"] == "success":
            return j["metadata"]["assetIds"]
        if j["status"] in ("failure", "failed", "canceled"):
            sys.exit(f"  {label}: 失敗 {j.get('statusHistory') or j.get('error')}")
    sys.exit(f"  {label}: タイムアウト")


def download(asset_id, dest: pathlib.Path):
    url = req("GET", f"/assets/{asset_id}")["asset"]["url"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)
    print(f"  保存 {dest.relative_to(ROOT)}", flush=True)


def is_opaque(png: pathlib.Path) -> bool:
    out = subprocess.run(["magick", "identify", "-format", "%[opaque]", str(png)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return out.lower() == "true"


# ---- コマンド ---------------------------------------------------------------


def gpt_body(prompt, icon_id, n=2):
    return {"prompt": prompt, "width": 1024, "height": 1024, "numOutputs": n,
            "quality": "auto", "background": "transparent", "referenceImages": [icon_id]}


def photoroom_body(asset_id):
    return {"image": asset_id, "backgroundColor": "", "hdBackgroundRemoval": True}


def gemini_body(prompt, icon_id, aspect):
    return {"prompt": prompt, "aspectRatio": aspect, "resolution": "4K", "numOutputs": 1,
            "referenceImages": [icon_id]}


def pending_props(only=None):
    for name, prompt in PROP_SPECS:
        if only and name not in only:
            continue
        if (PROPS / f"{name}.png").exists():
            print(f"  {name}: 採用済み(props/{name}.png)なのでスキップ")
            continue
        if (CAND / f"{name}-1.png").exists():
            print(f"  {name}: 候補あり(candidates/{name}-1.png)なのでスキップ")
            continue
        yield name, prompt


def cmd_estimate(args):
    icon_id = upload(ICON, "icon-master")
    total = 0
    print("装飾:")
    for name, prompt in pending_props(args.only):
        cu = dry_run(GPT, gpt_body(prompt, icon_id))
        print(f"  {name}: {cu}CU (2候補)")
        total += cu
    print("パノラマ:")
    for tag, aspect in (("play", "16:9"), ("ios", "3:2")):
        if (BG / f"panorama-{tag}.png").exists():
            print(f"  {tag}: あるのでスキップ")
            continue
        cu = dry_run(GEMINI, gemini_body(PANORAMA_PROMPT, icon_id, aspect))
        print(f"  {tag}({aspect}, 4K): {cu}CU + 透過化 3CU")
        total += cu + 3
    print(f"合計(目安): {total}CU  ※透過化が要る候補は +3CU/枚")


def cutout(src: pathlib.Path, dest: pathlib.Path):
    aid = upload(src, src.name)
    ids = run_job(PHOTOROOM, photoroom_body(aid), f"cutout {src.name}")
    download(ids[0], dest)


def cmd_props(args):
    icon_id = upload(ICON, "icon-master")
    CAND.mkdir(parents=True, exist_ok=True)
    for name, prompt in pending_props(args.only):
        ids = run_job(GPT, gpt_body(prompt, icon_id), name)
        for i, aid in enumerate(ids, 1):
            dest = CAND / f"{name}-{i}.png"
            download(aid, dest)
            if is_opaque(dest):
                print(f"  {dest.name}: 透過になっていないので Photoroom で抜く")
                cutout(dest, dest)
    print("完了。candidates/ を見て採用するものを props/NAME.png にコピーしてください")


def cmd_panorama(args):
    icon_id = upload(ICON, "icon-master")
    for tag, aspect in (("play", "16:9"), ("ios", "3:2")):
        dest = BG / f"panorama-{tag}.png"
        if dest.exists():
            print(f"  {tag}: あるのでスキップ")
            continue
        raw = BG / f"panorama-{tag}-raw.png"
        if not raw.exists():
            ids = run_job(GEMINI, gemini_body(PANORAMA_PROMPT, icon_id, aspect), f"panorama-{tag}")
            download(ids[0], raw)
        if args.opaque:
            raw.replace(dest)
        else:
            cutout(raw, dest)
    print("完了")


def cmd_cutout(args):
    src = pathlib.Path(args.src)
    dest = pathlib.Path(args.dest) if args.dest else src.with_name(src.stem + "-cut.png")
    cutout(src, dest)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("estimate"); e.add_argument("--only", nargs="*"); e.set_defaults(fn=cmd_estimate)
    g = sub.add_parser("props"); g.add_argument("--only", nargs="*"); g.set_defaults(fn=cmd_props)
    n = sub.add_parser("panorama"); n.add_argument("--opaque", action="store_true",
                                                   help="透過化せず生成画像をそのまま背景にする"); n.set_defaults(fn=cmd_panorama)
    c = sub.add_parser("cutout"); c.add_argument("src"); c.add_argument("dest", nargs="?"); c.set_defaults(fn=cmd_cutout)
    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
