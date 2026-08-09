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
