import fs from "fs";
import path from "path";
import zlib from "zlib";

const SRC = "/home/ubuntu/calnewport";
const OUT = path.join(process.cwd(), "data");
fs.mkdirSync(OUT, { recursive: true });

const index = JSON.parse(fs.readFileSync(path.join(SRC, "index.json"), "utf8"));

const CHUNK_WORDS = 350;
const OVERLAP = 60;
const POD_CHUNK_WORDS = 500;

const chunks = [];

function addChunks(words, chunkWords, meta) {
  for (let i = 0; i < words.length; i += chunkWords - OVERLAP) {
    const piece = words.slice(i, i + chunkWords).join(" ");
    chunks.push({ id: chunks.length, ...meta, text: piece });
    if (i + chunkWords >= words.length) break;
  }
}

for (const post of index) {
  const raw = fs.readFileSync(path.join(SRC, "articles", post.file), "utf8");
  const body = raw.split("\n---\n").slice(1).join("\n---\n").trim();
  // strip markdown links to text, images, excess whitespace
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(" ");
  if (words.length < 30) continue;
  addChunks(words, CHUNK_WORDS, {
    title: post.title,
    url: post.url,
    date: post.date,
    type: "article",
  });
}
const articleChunks = chunks.length;

// Deep Questions podcast transcripts scraped from podscripts.co
const TRANSCRIPTS = path.join(SRC, "transcripts");
const MONTHS = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};
let episodes = 0;
for (const file of fs.readdirSync(TRANSCRIPTS).sort()) {
  if (!file.endsWith(".json")) continue;
  const ep = JSON.parse(fs.readFileSync(path.join(TRANSCRIPTS, file), "utf8"));
  const title = ep.title.replace(/^Deep Questions with Cal Newport\s*-\s*/, "").trim();
  const m = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(ep.date);
  const date = m ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}` : "";
  const words = ep.text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length < 2000) continue; // skip promos/trailers
  episodes++;
  addChunks(words, POD_CHUNK_WORDS, {
    title,
    url: ep.url,
    date,
    type: "podcast",
  });
}

const json = JSON.stringify(chunks);
fs.writeFileSync(path.join(OUT, "chunks.json.gz"), zlib.gzipSync(json, { level: 9 }));
const legacy = path.join(OUT, "chunks.json");
if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
console.log(
  `Wrote ${chunks.length} chunks (${articleChunks} from ${index.length} posts, ` +
    `${chunks.length - articleChunks} from ${episodes} podcast episodes), ` +
    `${(json.length / 1e6).toFixed(1)}MB raw`
);
