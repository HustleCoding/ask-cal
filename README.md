# Ask Cal

A RAG chatbot over Cal Newport's complete blog archive (calnewport.com, 2007–present, 1,117 articles). Ask anything about deep work, digital minimalism, study habits, or slow productivity and get answers grounded in his actual writing, with cited source articles.

## How it works

- `scripts/scrape.py` — scrapes all posts via the WordPress REST API into markdown + `index.json`.
- `scripts/build-index.mjs` — chunks the articles (~350 words, overlapping) into `data/chunks.json`.
- `src/lib/retrieval.ts` — in-memory BM25 search over the chunks (no vector DB needed).
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
