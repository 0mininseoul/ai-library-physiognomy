# AI 관상가 고양이

AI 관상/사주 기반 도서 추천 MVP.

이 레포는 기존 AI Face Roasting 서비스를 보존하고, 대학 도서관 B2B 데모용으로 새로 분리한 프로젝트입니다.

## Project Status

- GitHub repo: `0mininseoul/ai-library-physiognomy`
- Vercel project: `ai-library-physiognomy`
  - GitHub repo connected
  - Production env configured: Supabase, Gemini, Naver, Data4Library, admin credentials
  - Development env configured: Supabase, Gemini, Naver, Data4Library, admin credentials
  - Preview env is not configured yet because Vercel CLI currently requires a non-production branch target for preview variables.
- Supabase project: `AI Library Physiognomy`
  - Project ref: `lubmjeylpppdnckljoiw`
  - Region: `ap-northeast-2`
  - URL: `https://lubmjeylpppdnckljoiw.supabase.co`

## Design

- [MVP design spec](docs/superpowers/specs/2026-05-08-library-physiognomy-mvp-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-08-ai-library-physiognomy-implementation.md)
- [Implementation plan Korean reader version](docs/superpowers/plans/2026-05-08-ai-library-physiognomy-implementation.ko.md)

## Run

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm lint
pnpm test
pnpm build
pnpm exec playwright test
```

## Book DB

```bash
pnpm books:fetch:naver
pnpm books:tag
pnpm books:import
```

The book import uses Naver Search API, Gemini, and Supabase service-role credentials from local environment variables.
