import fs from "fs";
import path from "path";
import zlib from "zlib";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

export type Chunk = {
  id: number;
  title: string;
  url: string;
  date: string;
  type: "article" | "podcast";
  text: string;
};

export type SearchResult = Chunk & { excerpt: string };

type Indexed = {
  chunks: Chunk[];
  docTerms: Map<string, number>[];
  titleTerms: Set<string>[];
  docLengths: number[];
  avgDocLength: number;
  df: Map<string, number>;
  embeddings: Float32Array | null;
  dim: number;
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
  const file = path.join(process.cwd(), "data", "chunks.json.gz");
  const chunks: Chunk[] = JSON.parse(
    zlib.gunzipSync(fs.readFileSync(file)).toString("utf8")
  );
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

  const dim = 384;
  let embeddings: Float32Array | null = null;
  const embFile = path.join(process.cwd(), "data", "embeddings.bin");
  if (fs.existsSync(embFile)) {
    const buf = fs.readFileSync(embFile);
    const arr = new Float32Array(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    );
    if (arr.length === chunks.length * dim) embeddings = arr;
  }

  indexed = { chunks, docTerms, titleTerms, docLengths, avgDocLength, df, embeddings, dim };
  return indexed;
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function createExtractor(): Promise<FeatureExtractionPipeline> {
  const { pipeline, env } = await import("@huggingface/transformers");
  const bundledCache = path.join(
    process.cwd(),
    "node_modules",
    "@huggingface",
    "transformers",
    ".cache"
  );
  if (fs.existsSync(path.join(bundledCache, "Xenova/all-MiniLM-L6-v2/config.json"))) {
    env.localModelPath = bundledCache;
    env.allowLocalModels = true;
  }
  env.cacheDir = "/tmp/transformers-cache";
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "fp32",
  });
}

async function embedQuery(text: string, dim: number): Promise<Float32Array | null> {
  try {
    extractorPromise ??= createExtractor();
    const extractor = await extractorPromise;
    const result = await extractor(text.slice(0, 2000), {
      pooling: "mean",
      normalize: true,
    });
    const data = result.data as Float32Array;
    return data.length === dim ? data : null;
  } catch {
    return null;
  }
}

function pickExcerpt(text: string, qTokens: string[]): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let best = sentences[0] ?? "";
  let bestHits = -1;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    let hits = 0;
    for (const t of qTokens) if (lower.includes(t)) hits++;
    if (hits > bestHits && s.trim().length > 40) {
      bestHits = hits;
      best = s;
    }
  }
  const trimmed = best.trim().replace(/\s+/g, " ");
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
}

const K1 = 1.5;
const B = 0.75;
const TITLE_BOOST = 0.18;
const RECENCY_BOOST = 0.12;
const SEMANTIC_WEIGHT = 0.55;
// Essays are edited prose; transcripts are rambly speech. Favor essays on ties.
const PODCAST_FACTOR = 0.92;

export async function search(query: string, topK = 8): Promise<SearchResult[]> {
  const { chunks, docTerms, titleTerms, docLengths, avgDocLength, df, embeddings, dim } =
    load();
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
  // Blend normalized BM25 with cosine similarity when embeddings exist.
  const qVec = embeddings ? await embedQuery(query, dim) : null;
  if (embeddings && qVec) {
    let maxBm25 = 0;
    for (let i = 0; i < n; i++) if (scores[i] > maxBm25) maxBm25 = scores[i];
    for (let i = 0; i < n; i++) {
      let dot = 0;
      const off = i * dim;
      for (let d = 0; d < dim; d++) dot += embeddings[off + d] * qVec[d];
      const cosine = Math.max(0, dot);
      const bm25 = maxBm25 > 0 ? scores[i] / maxBm25 : 0;
      scores[i] = (1 - SEMANTIC_WEIGHT) * bm25 + SEMANTIC_WEIGHT * cosine;
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
    const typeFactor = chunks[i].type === "podcast" ? PODCAST_FACTOR : 1;
    scores[i] *= titleFactor * recencyFactor * typeFactor;
  }

  const order = Array.from({ length: n }, (_, i) => i)
    .filter((i) => scores[i] > 0)
    .sort((a, b) => scores[b] - scores[a]);

  const results: SearchResult[] = [];
  const seenUrls = new Map<string, number>();
  for (const i of order) {
    const c = chunks[i];
    const perUrl = seenUrls.get(c.url) ?? 0;
    if (perUrl >= 2) continue;
    seenUrls.set(c.url, perUrl + 1);
    results.push({ ...c, excerpt: pickExcerpt(c.text, qTokens) });
    if (results.length >= topK) break;
  }
  return results;
}
