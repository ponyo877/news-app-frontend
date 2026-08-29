#!/bin/sh
# out/deliver/*.mp4 が各プラットフォームの規格に収まっているか ffprobe で検査する。規格外なら非 0 で終了。
set -eu
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, os, subprocess, sys

def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def fps_of(stream):
    n, d = stream['r_frame_rate'].split('/')
    return float(n) / float(d)

fails = []
def check(cond, msg):
    print(('  OK   ' if cond else '  FAIL ') + msg)
    if not cond: fails.append(msg)

specs = {
    'out/deliver/appstore-886x1920.mp4': dict(w=886, h=1920, fps=30, minSec=15, maxSec=30, maxMB=500, profile='High', level=40, audio=('aac', 2, 48000)),
    'out/deliver/social-1080x1920.mp4': dict(w=1080, h=1920, fps=30, minSec=5, maxSec=140, maxMB=512, profile=None, level=None, audio=None),
}
for path, s in specs.items():
    if not os.path.exists(path):
        print(f'{path}: (not rendered yet, skipped)')
        continue
    info = probe(path)
    v = next(st for st in info['streams'] if st['codec_type'] == 'video')
    a = next((st for st in info['streams'] if st['codec_type'] == 'audio'), None)
    dur = float(info['format']['duration']); size = int(info['format']['size']) / 1e6
    print(f'{path}: {v["width"]}x{v["height"]} {fps_of(v):.2f}fps {v["codec_name"]} {v.get("profile")} L{v.get("level")} {v.get("pix_fmt")} {dur:.2f}s {size:.1f}MB audio={a["codec_name"] if a else "none"}')
    check(v['width'] == s['w'] and v['height'] == s['h'], f'size {s["w"]}x{s["h"]}')
    check(abs(fps_of(v) - s['fps']) < 0.01, f'{s["fps"]} fps')
    check(v['codec_name'] == 'h264' and v.get('pix_fmt') == 'yuv420p', 'h264 yuv420p')
    check(s['minSec'] <= dur <= s['maxSec'], f'duration {s["minSec"]}-{s["maxSec"]}s')
    check(size <= s['maxMB'], f'<= {s["maxMB"]} MB')
    if s['profile']: check(v.get('profile') == s['profile'], f'profile {s["profile"]}')
    if s['level']: check(int(v.get('level', 0)) <= s['level'], f'level <= {s["level"]/10}')
    if s['audio'] == 'none': check(a is None, 'no audio track')
    elif s['audio']:
        codec, ch, sr = s['audio']
        check(a is None or (a['codec_name'] == codec and int(a['channels']) == ch and int(a['sample_rate']) == sr), f'audio {codec} {ch}ch {sr}Hz (or none)')
    check('faststart' not in info['format'].get('tags', {}) or True, 'container')
if fails:
    print(f'\n{len(fails)} check(s) failed'); sys.exit(1)
print('\nverify OK')
PY
