// バックエンドAPIのベースURL(アプリ内で唯一の定義。旧版は11ファイルに重複していた)
export const BASE_URL = 'https://matome.folks-chat.com';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildQuery(params: Record<string, string>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return '';
  }
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

export async function getJson(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}${buildQuery(params)}`);
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${path} failed (${res.status})`);
  }
  return res.json();
}

export async function postForm(
  path: string,
  form: Record<string, string>,
): Promise<{ ok: boolean; status: number }> {
  const body = Object.entries(form)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return { ok: res.ok, status: res.status };
}

export interface UploadFile {
  uri: string;
  fileName: string;
  mimeType: string;
}

export async function postMultipart(
  path: string,
  fields: Record<string, string>,
  file?: { field: string } & UploadFile,
): Promise<{ ok: boolean; status: number }> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  if (file) {
    // React NativeのFormDataはuri/name/typeを持つオブジェクトをファイルとして扱う
    form.append(file.field, {
      uri: file.uri,
      name: file.fileName,
      type: file.mimeType,
    } as unknown as Blob);
  }
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: form });
  return { ok: res.ok, status: res.status };
}

// 閲覧数インクリメント等のfire-and-forget用。失敗は握り潰す(旧版と同挙動)
export function postFireAndForget(path: string): void {
  fetch(`${BASE_URL}${path}`, { method: 'POST' }).catch(() => {
    /* no-op */
  });
}
