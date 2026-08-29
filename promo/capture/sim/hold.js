// Maestro には sleep が無いので、MS ミリ秒だけ待つ（画面の演出を見せる間）。
var end = Date.now() + Number(MS);
while (Date.now() < end) {}
