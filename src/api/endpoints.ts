import { getJson, postForm, postMultipart, postFireAndForget, UploadFile } from '@/api/client';
import {
  Article,
  ArticlePage,
  Comment,
  Site,
  articleListSchema,
  articlePageSchema,
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

export async function fetchSimilar(articleId: string): Promise<Article[]> {
  const json = await getJson(`/v1/article/similar/${articleId}`);
  return articleListSchema.parse(json).data;
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

// 非200は旧版どおり「不適切な表現」扱いにするため ok を返す
export async function postComment(
  articleId: string,
  message: string,
  devicehash: string,
): Promise<{ ok: boolean }> {
  const res = await postForm(`/v1/comment/${articleId}`, { message, devicehash });
  return { ok: res.ok };
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
