import fs from "fs";
import path from "path";

export type Chunk = {
  id: number;
  title: string;
  url: string;
  date: string;
  text: string;
};

type Indexed = {
  chunks: Chunk[];
  docTerms: Map<string, number>[];
  titleTerms: Set<string>[];
  docLengths: number[];
  avgDocLength: number;
  df: Map<string, number>;
};

let indexed: Indexed | null = null;

const STOP = new Set(
  "a an and are as at be but by for from has have i in is it its of on or that the this to was we were what when which who will with you your".split(
    " "
  )
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function load(): Indexed {
  if (indexed) return indexed;
  const file = path.join(process.cwd(), "data", "chunks.json");
  const chunks: Chunk[] = JSON.parse(fs.readFileSync(file, "utf8"));
  const docTerms: Map<string, number>[] = [];
  const titleTerms: Set<string>[] = [];
  const docLengths: number[] = [];
  const df = new Map<string, number>();
  for (const c of chunks) {
    const tokens = tokenize(`${c.title} ${c.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    docTerms.push(tf);
    titleTerms.push(new Set(tokenize(c.title)));
    docLengths.push(tokens.length);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;
  indexed = { chunks, docTerms, titleTerms, docLengths, avgDocLength, df };
  return indexed;
}

const K1 = 1.5;
const B = 0.75;
const TITLE_BOOST = 0.18;
const RECENCY_BOOST = 0.12;

export function search(query: string, topK = 8): Chunk[] {
  const { chunks, docTerms, titleTerms, docLengths, avgDocLength, df } = load();
  const qTokens = [...new Set(tokenize(query))];
  const n = chunks.length;
  const scores = new Float64Array(n);
  for (const term of qTokens) {
    const dfT = df.get(term);
    if (!dfT) continue;
    const idf = Math.log(1 + (n - dfT + 0.5) / (dfT + 0.5));
    for (let i = 0; i < n; i++) {
      const tf = docTerms[i].get(term);
      if (!tf) continue;
      scores[i] +=
        (idf * tf * (K1 + 1)) /
        (tf + K1 * (1 - B + (B * docLengths[i]) / avgDocLength));
    }
  }
  const nowYear = new Date().getFullYear();
  for (let i = 0; i < n; i++) {
    if (scores[i] <= 0) continue;
    let titleHits = 0;
    for (const term of qTokens) if (titleTerms[i].has(term)) titleHits++;
    const titleFactor =
      qTokens.length > 0 ? 1 + TITLE_BOOST * (titleHits / qTokens.length) : 1;
    const age = Math.max(0, nowYear - Number(chunks[i].date.slice(0, 4)));
    const recencyFactor = 1 + RECENCY_BOOST * Math.exp(-age / 8);
    scores[i] *= titleFactor * recencyFactor;
  }

  const order = Array.from({ length: n }, (_, i) => i)
    .filter((i) => scores[i] > 0)
    .sort((a, b) => scores[b] - scores[a]);

  const results: Chunk[] = [];
  const seenUrls = new Map<string, number>();
  for (const i of order) {
    const c = chunks[i];
    const perUrl = seenUrls.get(c.url) ?? 0;
    if (perUrl >= 2) continue;
    seenUrls.set(c.url, perUrl + 1);
    results.push(c);
    if (results.length >= topK) break;
  }
  return results;
}
