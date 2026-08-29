/**
 * 撮影前に「映るもの」を確認する。日間ランキングの上位と、いま祭りのクラスタの題名を表示する。
 *   npm run precheck
 * 祭りが 0 件ならヘッダーの 🔥 が出ず flow.yaml が失敗するので撮らない。
 * 映したくない題名があれば、アプリの NG ワード/サイト非表示で正規に間引いてから撮る。
 */
const API = 'https://matome.folks-chat.com';
const RECS = 'https://matome-recs.ponyo877.workers.dev';

interface Article {
  id: string;
  titles: string;
  sitetitle: string;
}

async function main(): Promise<void> {
  const popular = (await (await fetch(`${API}/v1/article/view/popular/daily`)).json()) as { data: Article[] };
  console.log('日間ランキング(S1 で映る。1 位をタップする):');
  popular.data.slice(0, 8).forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}. ${a.titles}  [${a.sitetitle}]`));

  type Cluster = { siteCount: number; articles: Article[] };
  const matsuri = (await (await fetch(`${RECS}/recs/matsuri`)).json()) as Cluster[] | Record<string, unknown>;
  const clusters: Cluster[] = Array.isArray(matsuri)
    ? matsuri
    : ((['items', 'data', 'clusters', 'groups'].map((k) => (matsuri as Record<string, unknown>)[k]).find(Array.isArray) as Cluster[] | undefined) ?? []);
  console.log(`\n祭り: ${clusters.length} クラスタ(S3 で一覧が映り、1 件目を S4 で開く)`);
  clusters.slice(0, 6).forEach((c, i) => {
    const a = c.articles[0];
    console.log(`  ${i + 1}. ${c.siteCount} サイト: ${a?.titles ?? '?'}  [${a?.sitetitle ?? '?'}]`);
  });
  if (clusters.length === 0) {
    console.error('\n祭りが 0 件。🔥 が出ないので撮影できない(時間を置く)');
    process.exit(1);
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
