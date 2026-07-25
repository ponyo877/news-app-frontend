import { parseFlutterPrefsXml } from '@/migration/legacyPrefs';

const SAMPLE_XML = `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="flutter.devicehash">0123456789abcdef0123456789abcdef01234567</string>
    <string name="flutter.Name">まとめ&amp;太郎</string>
    <string name="flutter.Icon">assets/images/icon/myimage_5.png</string>
    <boolean name="flutter.someFlag" value="true" />
</map>`;

describe('parseFlutterPrefsXml', () => {
  it('string要素をキーと値で抽出する', () => {
    const prefs = parseFlutterPrefsXml(SAMPLE_XML);
    expect(prefs['flutter.devicehash']).toBe('0123456789abcdef0123456789abcdef01234567');
    expect(prefs['flutter.Icon']).toBe('assets/images/icon/myimage_5.png');
  });

  it('XMLエンティティをデコードする', () => {
    const prefs = parseFlutterPrefsXml(SAMPLE_XML);
    expect(prefs['flutter.Name']).toBe('まとめ&太郎');
  });

  it('boolean等のstring以外・空文字・不正XMLは無視する', () => {
    const prefs = parseFlutterPrefsXml(SAMPLE_XML);
    expect(prefs['flutter.someFlag']).toBeUndefined();
    expect(parseFlutterPrefsXml('')).toEqual({});
    expect(parseFlutterPrefsXml('<map><string name="x"></string></map>')).toEqual({});
    expect(parseFlutterPrefsXml('not xml at all')).toEqual({});
  });
});
