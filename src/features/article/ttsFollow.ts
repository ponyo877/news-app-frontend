import { TTS_ANCHOR_ATTR, TTS_CURRENT_ATTR } from '@/scraper/ttsScript';

// 読み上げ位置にWebViewを追従させる注入スクリプト。
//
// 座標計算ではなくscrollIntoViewを使う。iOSは文字サイズをCSS zoomで変えており
// (fontScale.ts参照)、座標だとzoom倍率の補正が必要になるため。
// injectJavaScriptの評価結果に使うため末尾true必須(RN WebViewの作法)

// 直前のハイライトを外して該当セグメントへ移し、画面中央へスクロールする。
// アンカーが無い(採番されなかった)場合は何もしない
export function ttsFollowScript(index: number): string {
  return `(function(){
  var prev=document.querySelector('[${TTS_CURRENT_ATTR}]');
  if(prev){prev.removeAttribute('${TTS_CURRENT_ATTR}');}
  var el=document.querySelector('[${TTS_ANCHOR_ATTR}="${index}"]');
  if(el){
    el.setAttribute('${TTS_CURRENT_ATTR}','');
    el.scrollIntoView({behavior:'smooth',block:'center'});
  }
})();true;`;
}

// ハイライトを全解除する(読み上げを閉じたとき)
export function ttsClearScript(): string {
  return `(function(){
  var el=document.querySelector('[${TTS_CURRENT_ATTR}]');
  if(el){el.removeAttribute('${TTS_CURRENT_ATTR}');}
})();true;`;
}
