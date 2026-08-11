import { buildTtsScript, colorBucket } from '@/scraper/ttsScript';

describe('colorBucket', () => {
  it('近似色は同じバケットにまとまる(#ff0000と#cc0000は赤)', () => {
    expect(colorBucket('#ff0000')).toBe('red');
    expect(colorBucket('#cc0000')).toBe('red');
    expect(colorBucket('red')).toBe('red');
    expect(colorBucket('rgb(255, 30, 30)')).toBe('red');
  });

  it('青系・緑系を判別する', () => {
    expect(colorBucket('blue')).toBe('blue');
    expect(colorBucket('#0000cc')).toBe('blue');
    expect(colorBucket('green')).toBe('green');
  });

  it('無彩色(黒・グレー・白)はデフォルト(null)', () => {
    expect(colorBucket('black')).toBeNull();
    expect(colorBucket('#333333')).toBeNull();
    expect(colorBucket('white')).toBeNull();
    expect(colorBucket(null)).toBeNull();
    expect(colorBucket('not-a-color')).toBeNull();
  });
});

describe('buildTtsScript', () => {
  it('文字色ごとに読み手が変わる(黒=ナレーター0、色は出現順に1以降)', () => {
    const html = `
      <div>地の文です。スレのタイトルなど。</div>
      <div style="color: red">赤字の強調レスです。管理人のお気に入り。</div>
      <div><font color="blue">青字のレスです。別の話者になります。</font></div>
      <div style="color: #dd0000">これも赤系なので同じ声で読まれます。</div>
    `;
    const segments = buildTtsScript(html);
    expect(segments).toHaveLength(4);
    expect(segments[0]?.voiceIndex).toBe(0); // 地の文=ナレーター
    expect(segments[1]?.voiceIndex).toBe(1); // 赤=最初の色
    expect(segments[2]?.voiceIndex).toBe(2); // 青=2番目の色
    expect(segments[3]?.voiceIndex).toBe(1); // 近似赤=最初の色と同じ声
  });

  it('色のない記事は段落交互の2声に縮退する', () => {
    const html = `
      <p>最初の段落はそれなりに長い文章です。</p>
      <p>次の段落もそれなりに長い文章です。</p>
      <p>三つ目の段落もそれなりの文章です。</p>
    `;
    const segments = buildTtsScript(html);
    expect(segments.map((s) => s.voiceIndex)).toEqual([0, 1, 0]);
  });

  it('祖先の色を継承する(入れ子のspan)', () => {
    const html = `<div style="color: red"><span>入れ子でも赤の声になります。</span></div>`;
    const segments = buildTtsScript(html);
    expect(segments[0]?.voiceIndex).toBe(1);
  });

  it('URL・安価・大量の草を読まない', () => {
    const html = `<p>これは本文ですwwww >>123 https://example.com/x 続きの本文です。</p>`;
    const segments = buildTtsScript(html);
    expect(segments[0]?.text).toBe('これは本文です 続きの本文です。');
  });

  it('AA(記号率の高いブロック)をスキップする', () => {
    const html = `
      <p>普通の文章です。読み上げられます。</p>
      <p>┏━┓┏┳┓╋╋┃┃┗━┛╋╋┏┻┓┃┏━╋╋</p>
    `;
    const segments = buildTtsScript(html);
    expect(segments).toHaveLength(1);
  });

  it('script/styleの中身は読まない', () => {
    const html = `<style>body { color: red }</style><p>本文だけが読まれます。</p>`;
    const segments = buildTtsScript(html);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe('本文だけが読まれます。');
  });
});

// レスのメタ情報(番号・ハンドル・日時・ID)は読まない。
// これらは本文と別ノードで交互に並ぶため、読むと1レスごとに事務的な前置きが入る
describe('スレタイと書き込み本文だけを読む', () => {
  it('レスヘッダー(番号・名無し・日時・ID)を読み飛ばす', () => {
    const html = `
      <div>1 名前：</div>
      <div>名無しさん＠おーぷん</div>
      <div>[] 投稿日：26/07/23(木) 01:05:09 ID:D3WQ</div>
      <div>これは実際の書き込み本文です。</div>
    `;
    const segments = buildTtsScript(html);
    expect(segments.map((s) => s.text)).toEqual(['これは実際の書き込み本文です。']);
  });

  it('サイトごとに異なる名無しハンドルを読み飛ばす', () => {
    const html = `
      <p>1:</p>
      <p>風吹けば名無し</p>
      <p>2025/07/29(火) 12:12:28.03</p>
      <p>それでも動く名無し</p>
      <p>以下、ニュー速クオリティでお送りします</p>
      <p>名無しどんぶらこ</p>
      <p>1 名前：煮卵 ★：2026/07/25(土) 09:19:16.82 ID:tFFy/Iv59.net</p>
      <p>ちいかわの奴みたい</p>
    `;
    const segments = buildTtsScript(html);
    expect(segments.map((s) => s.text)).toEqual(['ちいかわの奴みたい']);
  });

  it('嫌儲系のコテハン(名前+地域+キャリア)を読み飛ばす', () => {
    const html = `
      <p>ピマリシン(福岡県) [ﾆﾀﾞ]</p>
      <p>ドナルド・マクドナルド(庭) [OM]</p>
      <p>すごいリアル</p>
    `;
    const segments = buildTtsScript(html);
    expect(segments.map((s) => s.text)).toEqual(['すごいリアル']);
  });

  it('記事のメタ情報(投稿者・投稿日時・コメント数)を読み飛ばす', () => {
    const html = `
      <h1>【悲報】「蕎麦」とかいう自炊最強のメシ</h1>
      <div>投稿者：ひまた</div>
      <div>2025/07/31 23:45</div>
      <div>コメント72</div>
      <div>0</div>
      <div>7月25</div>
      <p>それでも蕎麦は美味い。</p>
    `;
    const segments = buildTtsScript(html);
    expect(segments.map((s) => s.text)).toEqual([
      '【悲報】「蕎麦」とかいう自炊最強のメシ',
      'それでも蕎麦は美味い。',
    ]);
  });

  it('本文と同じノードに混ざった日時・IDだけを落として本文は残す', () => {
    const html = `<p>2026/07/25(土) 09:19:16.82 ID:tFFy/Iv59.net これが本文です。</p>`;
    const segments = buildTtsScript(html);
    expect(segments[0]?.text).toBe('これが本文です。');
  });

  it('日付や「名無し」に言及する本文は読む(メタ判定の誤爆防止)', () => {
    const long = '名無しさんたちの書き込みを読んでいると、2026年の日本の空気が伝わってくる。';
    const html = `<p>${long}</p>`;
    const segments = buildTtsScript(html);
    expect(segments.map((s) => s.text)).toEqual([long]);
  });
});
