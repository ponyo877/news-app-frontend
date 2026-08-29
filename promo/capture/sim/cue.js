// Maestro の runScript から撮影オーケストレータ（cue-server.ts）へ合図を送る。
// EVENT は flow の env、CUE_URL は flow 先頭の env で渡す。copyTextFrom 直後ならルーム ID も添える。
var roomId = '';
try {
  if (typeof maestro !== 'undefined' && maestro.copiedText) roomId = String(maestro.copiedText);
} catch (e) {}
http.post(CUE_URL, {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ event: EVENT, roomId: roomId, t: Date.now() }),
});
