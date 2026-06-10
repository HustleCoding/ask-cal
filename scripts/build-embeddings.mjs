// Precomputes normalized embeddings for every chunk in data/chunks.json
// into data/embeddings.bin (Float32Array, row-major [numChunks x dim]).
// Usage: node scripts/build-embeddings.mjs
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";
const BATCH = 32;

const root = process.cwd();
const chunks = JSON.parse(
  zlib
    .gunzipSync(fs.readFileSync(path.join(root, "data", "chunks.json.gz")))
    .toString("utf8")
);

const extractor = await pipeline("feature-extraction", MODEL, {
  dtype: "fp32",
});

const dim = 384;
const out = new Float32Array(chunks.length * dim);

for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH);
  const texts = batch.map((c) => `${c.title}\n${c.text}`.slice(0, 2000));
  const result = await extractor(texts, { pooling: "mean", normalize: true });
  out.set(result.data, i * dim);
  process.stdout.write(`\r${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
}

fs.writeFileSync(path.join(root, "data", "embeddings.bin"), Buffer.from(out.buffer));
console.log(`\nWrote data/embeddings.bin (${chunks.length} x ${dim})`);
