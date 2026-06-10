# Ask Cal

A RAG chatbot over Cal Newport's complete blog archive (calnewport.com, 2007–present, 1,117 articles) plus transcripts of 400+ Deep Questions podcast episodes. Ask anything about deep work, digital minimalism, study habits, or slow productivity and get answers grounded in his actual writing and speaking, with cited sources.

## How it works

- `scripts/scrape.py` — scrapes all posts via the WordPress REST API into markdown + `index.json`.
- `scripts/build-index.mjs` — chunks the articles (~350 words) and podcast transcripts (~500 words) into gzipped `data/chunks.json.gz`, each chunk tagged `article` or `podcast`.
- `scripts/build-embeddings.mjs` — precomputes MiniLM embeddings for every chunk into `data/embeddings.bin`.
- `src/lib/retrieval.ts` — hybrid in-memory search (BM25 + cosine similarity over the precomputed embeddings; essays weighted slightly above transcripts).
- `src/app/api/chat/route.ts` — retrieves the top chunks for the question, streams an answer from DeepSeek V4 Flash (via OpenRouter) using the AI SDK, and emits the source articles as citation parts.
- `src/app/page.tsx` — chat UI built with [AI Elements](https://ai-sdk.dev/elements) (shadcn/ui-based components: conversation, message, prompt input, sources).

## Setup

```bash
npm install
cp .env.example .env.local   # add your OpenRouter API key
npm run dev
```

## Environment variables

| Variable | Description |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key used for chat completions |
