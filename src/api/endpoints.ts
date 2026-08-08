import { getJson, postForm, postMultipart, postFireAndForget, UploadFile } from '@/api/client';
import {
  Article,
  ArticlePage,
  Comment,
  Site,
  articleListSchema,
  articlePageSchema,
  articleSchema,
  commentListSchema,
  siteListSchema,
} from '@/api/schemas';

export type RankingPeriod = 'daily' | 'weekly' | 'monthly';

// GET /v1/article — lastPublishedAtカーソル型ページング、skipIDsはブロック中サイトのCSV
export async function fetchArticles(
  lastPublishedAt: string,
  skipIds: readonly string[],
): Promise<ArticlePage> {
  const json = await getJson('/v1/article', {
    lastPublishedAt,
    skipIDs: skipIds.join(','),
  });
  return articlePageSchema.parse(json);
}

export async function fetchPopular(period: RankingPeriod): Promise<Article[]> {
  const json = await getJson(`/v1/article/view/popular/${period}`);
  return articleListSchema.parse(json).data;
}

export async function searchArticles(keyword: string): Promise<Article[]> {
  const json = await getJson('/v1/article/search', { keyword });
  return articleListSchema.parse(json).data;
}

// GET /v1/article/meta/:id — ディープリンク着地時のID→記事メタ復元(通知dataと同キー体系)
export async function fetchArticleMeta(articleId: string): Promise<Article> {
  const json = await getJson(`/v1/article/meta/${articleId}`);
  return articleSchema.parse(json);
}

// 閲覧数インクリメント(fire-and-forget、旧版と同挙動)
export function incrementView(articleId: string): void {
  postFireAndForget(`/v1/article/view/${articleId}`);
}

export async function fetchSites(): Promise<Site[]> {
  const json = await getJson('/v1/site');
  return siteListSchema.parse(json).data;
}

export async function fetchComments(articleId: string): Promise<Comment[]> {
  const json = await getJson(`/v1/comment/${articleId}`);
  return commentListSchema.parse(json).data;
}

// statusを素通しし、呼び出し側(usePostComment)がエラー種別を判定する
export async function postComment(
  articleId: string,
  message: string,
  devicehash: string,
): Promise<{ ok: boolean; status: number }> {
  return postForm(`/v1/comment/${articleId}`, { message, devicehash });
}

export interface PostDeviceTokenParams {
  expotoken: string;
  devicehash: string;
  platform: string;
  digest: boolean;
}

// POST /v1/user/token — プッシュ通知トークンの登録・設定更新(同一トークンはupsert)
export async function postDeviceToken({
  expotoken,
  devicehash,
  platform,
  digest,
}: PostDeviceTokenParams): Promise<boolean> {
  const res = await postForm('/v1/user/token', {
    expotoken,
    devicehash,
    platform,
    digest: String(digest),
  });
  return res.ok;
}

export interface PostUserParams {
  devicehash: string;
  name?: string;
  avatar?: UploadFile;
}

// POST /v1/user — 初回登録(name+avatar)・名前変更(name)・アイコン変更(avatar)を兼ねる
export async function postUser({ devicehash, name, avatar }: PostUserParams): Promise<boolean> {
  const fields: Record<string, string> = { devicehash };
  if (name !== undefined) {
    fields.name = name;
  }
  const res = await postMultipart('/v1/user', fields, avatar && { field: 'avatar', ...avatar });
  return res.ok;
}
