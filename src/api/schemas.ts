import { z } from 'zod';

// サーバーは data: null(コメント0件)や配列内null要素(similar)を返す実績があるため、
// 境界(このファイル)ですべて吸収して以降のコードを非nullに保つ。

export const articleSchema = z.object({
  id: z.coerce.string(),
  titles: z.string(),
  url: z.string(),
  image: z.string(),
  sitetitle: z.string(),
  siteID: z.coerce.string(),
  publishedAt: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
});
export type Article = z.infer<typeof articleSchema>;

const nullableArticleArray = z
  .array(articleSchema.nullable())
  .nullish()
  .transform((arr) => (arr ?? []).filter((a): a is Article => a !== null));

export const articleListSchema = z.object({ data: nullableArticleArray });

export const articlePageSchema = z.object({
  data: nullableArticleArray,
  lastPublishedAt: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
});
export type ArticlePage = z.infer<typeof articlePageSchema>;

export const commentSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  image_url: z.string(),
  device_hash: z.string(),
  message: z.string(),
  updated_at: z.string(),
  created_at: z.string(),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentListSchema = z.object({
  data: z
    .array(commentSchema)
    .nullish()
    .transform((arr) => arr ?? []),
});

export const siteSchema = z.object({
  id: z.coerce.string(),
  titles: z.string(),
  url: z.string(),
  image: z.string(),
  last_updated_at: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
});
export type Site = z.infer<typeof siteSchema>;

export const siteListSchema = z.object({
  data: z
    .array(siteSchema)
    .nullish()
    .transform((arr) => arr ?? []),
});
