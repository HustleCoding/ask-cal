import fs from "fs";
import path from "path";

const SRC = "/home/ubuntu/calnewport";
const OUT = path.join(process.cwd(), "data");
fs.mkdirSync(OUT, { recursive: true });

const index = JSON.parse(fs.readFileSync(path.join(SRC, "index.json"), "utf8"));

const CHUNK_WORDS = 350;
const OVERLAP = 60;

const chunks = [];
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
  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP) {
    const piece = words.slice(i, i + CHUNK_WORDS).join(" ");
    chunks.push({
      id: chunks.length,
      title: post.title,
      url: post.url,
      date: post.date,
      text: piece,
    });
    if (i + CHUNK_WORDS >= words.length) break;
  }
}

fs.writeFileSync(path.join(OUT, "chunks.json"), JSON.stringify(chunks));
console.log(`Wrote ${chunks.length} chunks from ${index.length} posts`);
