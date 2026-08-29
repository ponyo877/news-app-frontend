/**
 * Maestro のフロー（runScript の http.post）から合図を受ける小さな HTTP サーバ。
 *   POST /cue  {"event":"roomCreated","roomId":"ABC123","t":1700000000000}
 */
import { createServer, type Server } from 'node:http';

export interface Cue {
  event: string;
  roomId?: string;
  /** 受信時刻（サーバ側の壁時計）。 */
  t: number;
}

export interface CueServer {
  cues: Cue[];
  waitFor(event: string, timeoutMs: number): Promise<Cue>;
  close(): void;
}

export function startCueServer(port: number): Promise<CueServer> {
  const cues: Cue[] = [];
  const waiters: Array<(c: Cue) => void> = [];
  const server: Server = createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/cue') {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}') as Partial<Cue>;
        const cue: Cue = { event: String(parsed.event ?? ''), roomId: parsed.roomId || undefined, t: Date.now() };
        cues.push(cue);
        console.log(`[cue] ${cue.event}${cue.roomId ? ` room=${cue.roomId}` : ''}`);
        for (const w of waiters.splice(0)) w(cue);
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
      } catch {
        res.writeHead(400).end();
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        cues,
        waitFor(event, timeoutMs) {
          const found = cues.find((c) => c.event === event);
          if (found) return Promise.resolve(found);
          return new Promise((res, rej) => {
            const timer = setTimeout(() => rej(new Error(`timed out waiting for cue "${event}"`)), timeoutMs);
            const check = (c: Cue) => {
              if (c.event === event) {
                clearTimeout(timer);
                res(c);
              } else {
                waiters.push(check);
              }
            };
            waiters.push(check);
          });
        },
        close() {
          server.close();
        },
      });
    });
  });
}
