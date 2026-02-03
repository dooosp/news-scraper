# news-scraper

8-source news aggregator with AI-powered scoring, link verification, and counter-perspective generation.

## What it does

1. **Collect**: Scrapes 8 news sources (AP, BBC, CNN, Guardian, Google, Naver, Sisain, Yonhap)
2. **Score**: Ranks articles by relevance and significance
3. **Verify**: Validates all links before delivery
4. **Counter**: Anti-Echo-Chamber module generates opposing viewpoints (Gemini)
5. **Deliver**: Email digest + PowerPoint summary

## Architecture

```
sources/ (8 scrapers)
  ├─ ap, bbc, cnn, guardian   (international)
  └─ google, naver, sisain, yonhap (korean)
       │
  main.js → scoring → link verification
       │
  ├─ Anti-Echo-Chamber (counter-perspectives)
  ├─ Email delivery (Nodemailer)
  └─ PowerPoint generation (pptxgenjs)
```

## Stack

- **Runtime**: Node.js
- **Scraping**: Cheerio, RSS Parser, iconv-lite
- **Delivery**: Nodemailer, pptxgenjs
- **AI**: Gemini API (Anti-Echo-Chamber only; `send:no-llm` mode available)

## Setup

```bash
cp .env.example .env   # Add GEMINI_API_KEY, EMAIL credentials
npm install
npm run fetch          # Collect news only
npm run send           # Collect + send email digest
npm run send:no-llm    # Send without AI counter-perspectives
```
