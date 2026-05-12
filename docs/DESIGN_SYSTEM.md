# AI 관상가 고양이 UI/UX Design System Prompt

이 문서는 `AI 관상가 고양이` UI/UX를 수정할 때 AI 모델이 계속 참고해야 하는 기준 문서다.
구현 전에 실제 화면을 Playwright로 검토하고, 이 문서의 원칙에 맞춰 문제 요약과 재구성 계획을 먼저 제안한다.

## Product / Design Context

- `AI 관상가 고양이`는 대학 도서관 부스에서 체험하는 관상/성향 기반 책 추천 서비스다.
- 사용자는 처음에는 "책 추천 서비스"보다 "고양이가 내 관상을 진지하게 보는 인터랙티브 체험"처럼 느껴야 한다.
- 최종 결과 후반부에서만 책 추천이 드러나야 한다.
- 시연 환경은 B2B 피칭과 현장 부스 모두를 고려한다.
- 기본 진입 인상은 대학 중앙도서관 담당자와 구매자가 신뢰할 수 있는 밝은 도서관 큐레이션 서비스여야 한다.
- B2B 검토 부담을 줄이기 위해, 생년월일 기반 해석은 내부 신호로만 사용하고 사용자 화면에서는 `사주`, `오행`, `물`, `불`, `나무`, `흙`, `금`, `기운` 같은 직접 표현을 노출하지 않는다.
- 생년월일 기반 해석은 `성향 리듬`, `내면 리듬`, `집중 스타일`, `관계 스타일`, `독서 큐레이션 신호`처럼 일반 사용자가 사주 기반이라고 바로 눈치채지 않는 언어로 번역한다.
- 다크한 라이브 스캔 정체성은 현장 참여자 체험용 `Live Face Scan / 몰입형 부스 모드`로 유지한다.
- UI는 가볍고 귀엽기만 한 서비스가 아니라, 라이브 카메라 분석실 같은 몰입감이 있어야 한다.
- 핵심 감성은 `Live Face Scan x 고양이 관상 상담소 x 도서관 큐레이션`이다.
- 기존 AI 얼평 서비스의 어두운 실시간 분석 HUD, 좌우 플로팅 카드, 카메라 중심 구성을 기준으로 삼는다.
- 단, 문구는 공격적 얼평이 아니라 유머러스하고 MZ스럽지만 존댓말인 고양이 상담 톤으로 간다.
- 재미는 비속어, 반말, 조롱, 거친 밈이 아니라 `정확해서 웃긴 관찰`, 생활감 있는 비유, 고양이 캐릭터의 정중한 코멘트에서 만든다.

## 2026-05-13 Booth Decisions

- 5/13 가천대학교 중앙도서관 PoC 부스에서는 `/`와 `/result`에 가천대학교 중앙도서관 공동 브랜딩을 노출한다. 제품명은 유지하되, 로고는 `Powered by` 성격의 신뢰 장치로 두고 화면의 주인공이 되게 하지 않는다.
- 사용자 화면에서 분석 주체가 필요하면 `야옹이` 또는 `AI 관상가 고양이`라고 부른다. `Gemini`, 모델명, 벤더명은 UI에 절대 노출하지 않는다.
- 사용자는 `/result` 5번째 `BOOK CURATION` 섹션에 도달하기 전까지 이 서비스가 책 추천 서비스라는 사실을 알지 못해야 한다.
- 입력 화면의 4지선다 `지금 나에게 가장 필요한 것은?`와 관심 분야 입력은 책 큐레이션을 정교화하기 위한 신호다. 얼굴 해석, 내면 해석, 케미 해석을 좌우하는 핵심 근거로 쓰지 않는다.
- 분석 직후 화면의 좌우 카드와 스트리밍 텍스트는 와우 포인트이므로 유지한다. 단, 그 내용은 `/result`의 상세 리포트와 동어반복되지 않는 티저/확정 신호 역할이어야 한다.
- `/result`의 각 섹션 헤드라인 아래 소개 문구는 너무 비어 보이면 안 된다. 모델 응답이 짧아도 화면에서는 최소 2문장, 가능하면 2~3개의 짧은 문장으로 보강한다.
- Impression score는 평균적으로 80점대 중반~90점대 초반이 자연스럽다. 정말 좋은 얼굴 신호는 90점대 후반이나 100점까지 나올 수 있어야 하지만, 100점은 매우 예외적인 신호로만 허용한다.
- UX 속도는 `분석 결과 먼저, 책 큐레이션은 뒤에서 비동기`가 기본 방향이다. 얼굴/내면/케미 리포트는 첫 와우에 필요하므로 1차 결과에 포함하고, 책 큐레이션은 final section 전까지 준비되면 된다.

## Non-Negotiable Design Rules

- PC-first is the current implementation priority. Optimize and inspect `1440x900` first for the booth/demo flow.
- Mobile fit is a later hardening pass; do not let mobile constraints weaken the PC booth experience in this round.
- Until mobile is explicitly designed, mobile visitors should be routed to a dedicated PC-only 안내 page rather than seeing a broken camera/result experience.
- Preserve the live webcam as the primary visual surface on the analyze flow.
- Do not replace the live camera experience with generic cards, landing pages, or SaaS-style panels.
- Before scan starts, do not show face mesh, dots, scan lines, or invasive overlays on the user's face.
- During scan/analyzing, face tracking overlays may appear, but they must feel intentional, lightweight, and not medically diagnostic.
- Result page must not repeat the exact same left/right floating-card layout used during analysis.
- Result page should feel like a staged reveal/report experience, not a dashboard wall of text.
- Do not use generic AI sparkle icons or decorative symbols that feel like AI slop.
- Do not use `처방`, `처방전`, `학생`, direct `연애` wording, or `근거 더 보기` in user-facing UI.
- Do not expose direct fortune-telling taxonomy in user-facing UI: avoid `사주`, `오행`, `물`, `불`, `나무`, `흙`, `금`, `기운`, `우세 오행`, `일간`, `월주`, and similar words.
- If deterministic birth-date calculations are used internally, translate them into non-occult product language such as `내면 리듬`, `성향 리듬`, `몰입 방식`, `관계 스타일`, `회복/추진/정리/탐색 성향`.
- If relationship compatibility is shown, describe it as `관계 궁합`, `케미`, `잘 맞는 사람`, or `함께하기 좋은 흐름`.
- Never mention `Gemini`, model names, provider names, or API internals in user-facing copy. The visible analyst is `야옹이`.
- Use `더보기` rather than `근거 더 보기`.
- Avoid skin evaluation. Do not score or comment on skin quality.
- All Korean copy must use polite speech. No 반말.
- Do not use profanity, hostile roast language, or casual male-community meme slang. Keep the tone polite and funny.
- User name should use `~님`, not `학생`.
- The result headline must stay on one line where possible.

## Color And Visual Direction

- Keep the live scan-room design language, but support light and dark themes through shared tokens.
- The visual theme is `Library Curation x Apple Glassmorphism x Cat Observatory`.
- Default theme is light for B2B buyer, library staff, admin, lookup, and result surfaces.
- Dark theme remains available for immersive booth mode and scan/analyzing stages.
- Do not build two unrelated UIs. Use CSS variables and theme tokens so light/dark share the same spacing, radius, typography, and component grammar.
- The current token source is the provided 21st.dev warm paper theme, adapted to this product rather than copied as a dashboard style.
- Primary light surfaces should use warm paper white, soft clay gray, ink text, and terracotta accents that match the real orange neko assets.
- Primary dark scan surfaces should use warm charcoal, near-black clay, terracotta focus accents, and translucent glass.
- Keep `Pretendard Variable` and the existing Apple glassmorphism system. The palette may change; the product should not become a plain shadcn/dashboard preview.
- Glass panels should feel like Apple-style frosted glass: precise, layered, softly blurred, and intentionally lit.
- Glass effects must be refined and functional, never gimmicky, noisy, or over-styled.
- The palette should stay constrained to three major color families:
  1. Library paper: `#faf9f5`, `#ede9de`, and soft warm gray for default surfaces, public-institution calm, and readable reports.
  2. Ink and glass: `#3d3929`, warm charcoal, translucent glass, precise borders, and dark scan-room depth.
  3. Neko terracotta: `#c96442` in light and `#d97757` in dark for status, focus, progress, and primary action.
- Do not add new accent families unless there is a true semantic exception.
- Avoid mint/teal accents, bright purple, loud blue, startup gradients, rainbow accents, yellow-heavy highlights, and toy-like pastel themes.
- If a warm cat label is needed, keep it extremely small and subordinate; it must not become a fourth dominant palette.
- Use subtle borders, low-opacity fills, controlled blur, and scanline texture only where it supports the live-analysis atmosphere.
- The UI must feel premium, technical, and playful through copy, hierarchy, and motion, not through excessive decoration.
- Every surface should feel intentionally designed. Avoid arbitrary opacity values, random glow, mismatched border colors, or effects that look AI-generated.
- Liquid glass buttons should use the local lightweight `.liquid-glass-button` treatment. Do not paste heavy displacement-map button demos or add new visual dependencies unless the interaction truly needs them.

## Typography

- Use `Pretendard Variable` throughout the entire product.
- Do not mix in other fonts unless explicitly approved.
- Korean headings should be bold, compact, and readable from booth distance.
- Headings should use strong weight and tight but not cramped line-height.
- Body text must be short enough to scan quickly.
- Body copy should use consistent weight and opacity. Avoid randomly faded text that hurts readability.
- Avoid long paragraph blocks on the main visible surface.
- Detailed analysis can exist, but keep the visible result surface concise. Use `더보기` only when the extra layer clearly adds value; do not add collapsible panels just to house duplicate copy.
- Copy should sound like a sharp but polite cat consultant:
  - witty
  - concise
  - observant
  - MZ-friendly
  - never insulting
  - never childish
- Avoid translationese, generic AI report phrasing, filler compliments, and vague motivational copy.
- Typography should feel designed, not generated: consistent scale, consistent weight logic, no awkward line breaks, no oversized text inside compact controls.

## Layout And Composition

- UI must be systemically consistent across entry, analyzing, result, lookup, and admin pages.
- Components that serve the same role should share the same visual grammar: radius, border, blur, text weight, spacing, and CTA treatment.
- Avoid mixing unrelated card styles, button styles, icon styles, or panel densities on the same page.
- Do not rely on decorative clutter to make a screen feel designed. Use hierarchy, spacing, glass layering, and motion discipline.
- If something feels like a generic AI-generated UI, simplify it and realign it to the three-color Apple glass HUD system.

### Theme Model

- `:root` is the light theme.
- `[data-theme="dark"]`, `.theme-dark`, and `.dark` provide the dark theme.
- User-selected theme is stored in `localStorage` under `ai-library-theme`.
- Do not force `[data-theme="dark"]` inside scan/analyzing if the user entered in light theme. The analysis stage may use dark HUD overlays, but the selected theme remains authoritative.
- `prefers-color-scheme` may be referenced, but B2B default entry must remain light unless the user explicitly toggles dark.
- Admin, lookup, and result pages should read as light, reliable operating surfaces by default.

### Current Core Tokens

- Light: `--background #faf9f5`, `--foreground #3d3929`, `--card #faf9f5`, `--muted #ede9de`, `--accent #e9e6dc`, `--primary #c96442`, `--ring #c96442`, `--border #dad9d4`.
- Dark: `--background #262624`, `--foreground #c3c0b6`, `--card #262624`, `--muted #1b1b19`, `--accent #1a1915`, `--primary #d97757`, `--ring #d97757`, `--border #3e3e38`.
- Existing semantic aliases such as `--accent-info-rgb`, `--bg-card-rgb`, and `--text-primary-rgb` must map back to those core tokens so old components inherit the new palette without one-off overrides.

### Analyze Entry Page

- Live camera is full-screen background.
- Form appears as a right-side glass modal on desktop.
- On mobile, form must fit cleanly with safe-area handling.
- The form sequence is:
  1. 이름
  2. 학번(또는 사번)
  3. 성별
  4. 생년월일
  5. 평소 끌리는 관심 분야
  6. 지금 나에게 가장 필요한 것은?
  7. 개인정보처리방침 및 이용약관 동의
- Keep one obvious primary CTA: `내 관상 분석하기`.
- Remove unnecessary helper labels such as visible `년도/월/일` if the selects are self-explanatory.
- Field labels and inputs need disciplined spacing; avoid cramped label-to-field gaps.

### Cat Mascot

- The cat should feel like a real `cat gatekeeper` presence, not a sticker mascot.
- Use real cat motion/cutout assets when possible.
- Cat appears on entry as a playful atmospheric element.
- Cat should not cover form fields or critical CTA.
- Cat should not appear during intensive analysis if it distracts from the scan HUD.
- Cat edges must be clean; avoid visible green/black/white chroma artifacts.
- No native video controls should appear.

### Analyzing Screen

- Keep the live face centered.
- Show top-center status text with character:
  - `야옹이가 관상 좌표를 유심히 보고 있어요`
- If the face is off-center, show a concise top-center correction message.
- Left/right analysis cards should fill the vertical rhythm without clipping.
- Each card should have its own progress motion during scan.
- After analysis completes, cards should reveal one by one.
- Text should stream character-by-character at a readable pace.
- Do not instantly dump long paragraphs.
- Completed analysis cards should be limited to roughly 8 cards plus final assessment. If content exceeds one screen, the left/right columns should auto-scroll instead of clipping text or overlapping the final card.
- Analysis copy should be short by design, not hard-truncated with visible ellipsis.
- Analysis completed copy may be witty, but must stay polite. No 욕설, 반말, or insulting roast phrasing.
- Do not mention books, borrowing, recommendations, shelf, call number, or library location inside the analysis HUD. Book curation appears only in the final result section.
- Cards need face-point connector lines where relevant, similar to the original AI 얼평 service.
- The final assessment card appears bottom-center after the staged card reveal.
- In light mode, analysis HUD/status surfaces should remain token-based glass panels. Do not mix hardcoded black HUD cards into a light analysis stage unless the whole stage is intentionally dark.

### Result Page

- Must be visually distinct from the analyzing screen.
- Do not reuse the same left/right floating analysis-card structure as the main result layout.
- Prefer a staged section-based report:
  1. Main type reveal
  2. Face signal + impression score summary, merged so facial geometry and score cards do not repeat each other
  3. Inner style summary with only the strongest tendency and one useful support tendency, without direct saju/five-elements labels
  4. One best relationship/chemistry match, not a list of several plausible types
  5. Book recommendations as the final payoff
- The user should not be forced to read dense text walls.
- Each section should have one clear message. Optional detail is allowed only when it does not create repeated copy or layout instability.
- The short copy under each section heading must render as at least two readable sentences. If the model provides only one line, add deterministic fallback lines for visual density.
- Avoid long `더보기` blocks in the result page. If a section reads well without expansion, show the useful content directly and remove the toggle.
- `첫인상 키워드` and `야옹이 코멘트` are UI slots for future model-generated copy. Until the API schema is extended, use concise deterministic fallback copy derived from face scores and keywords.
- Face image on result page should be clean. No white landmark dots or face markers.
- If face image is older than 24 hours, show the existing 24-hour deletion message clearly.
- Book recommendation cards must include book thumbnails.
- Book cards must link to the relevant Naver book page for MVP.
- The final book section should read like library curation, not an ecommerce grid: one featured book card with cover/reason/action/location, plus up to two supporting recommendations.
- Featured recommendation should not default to the most famous or bestseller-like title. The representative book should be the strongest personal fit. Obvious bestseller candidates may appear as supporting books only when genuinely relevant.
- Bestseller-like titles need an explicit fit advantage before they can appear as the featured recommendation. Personal fit, library curation value, and specificity beat popularity.
- Book recommendation trust copy should explain `왜 이 책인지`, `읽기 좋은 순간`, and `도서관 위치` in separated blocks.
- Shared previews should use `/og-image.png` as the 1200x630 Open Graph image and keep the 512x512 cat logo for favicon/apple icon surfaces.
- Shared preview descriptions should describe the product as an `AI 도서 큐레이션 서비스`, not a generic campus curation tool.
- Mobile visitors should see a compact PC-only notice that fits in one visible mobile viewport, with the PC URL and copy action immediately available.

### Result Card Composition

- Do not force equal-height cards by vertically centering all content.
- If two cards need equal height, keep the main content top-aligned and fill the lower area with useful supporting blocks.
- For the first result section, the headline summary owns the `관상 총평` content.
- The TYPE card owns only type identity: type label, type chips, type description, and compact supporting blocks.
- Avoid repeating exact sentences between the headline summary, type card, detail panels, and later sections.
- Section navigation buttons must have visible breathing room from the main cards. They should feel like page controls, not card controls.
- Card reveal motion should be slower than a micro-interaction: use a noticeable upward reveal distance and a soft easing curve so the staged report feels intentional.
- `FACE REVEAL` owns broad 관상 총평. `FACE SIGNAL` owns measurable face signals only.
- Visible impression scores should use calibrated app scores, not raw model guesses. Strong signals should normally land in the mid-80s to low-90s; exceptional signals may reach the high-90s or 100, but 100 must remain rare and defensible.
- `INNER STYLE` should not show percentages or gauges. Use two readable cards instead: strongest tendency and one support tendency.
- `CHEMI MATCH` should show one best-matching person type only. Multiple plausible types reduce trust.

## Interaction And UX Principles

- Prefer guided, low-friction flow.
- The user should understand what to do without explanatory blocks.
- Motion should create a staged reveal, not delay the user unnecessarily.
- Text streaming must be slow enough to feel intentional and readable.
- Do not auto-advance so fast that users cannot read the section.
- If automatic section progression exists, provide visible progress and allow manual control.
- Respect reduced-motion users.
- Avoid repeated messages across entry, analysis, and result.
- Keep CTA hierarchy obvious:
  - entry: analyze
  - analyzing complete: go to result
  - result: next section / book link / 다시 분석하기

## Implementation Rules

- Before editing a page, inspect the actual page in Playwright using recent real Supabase result data when possible.
- When the user requests a review/plan, provide:
  1. 문제 요약
  2. 재구성 계획
- When the user explicitly approves implementation, execute the approved full scope without repeatedly asking for confirmation.
- If the user asks to review section by section, stop after each section and wait for approval.
- After implementation, re-check with Playwright and report only:
  1. 구현
  2. 재검수 결과
  3. 남은 리스크
- Do not touch unrelated files.
- Keep changes cohesive with the current AI 관상가 고양이 live-camera system.
- Avoid one-off CSS hacks when a systemic layout/token fix is more appropriate.
- Do not force shadcn/ui aesthetics into this product unless fully adapted to the existing scan-room language.

### Parallel Work Boundaries

- Parallel UI work is allowed only when file ownership is separated.
- Current result-page terminal owns:
  - `src/components/pages/ResultPage.tsx`
  - result-page-only docs/tests if needed
- `/` and `/analyze` terminal may own:
  - `src/components/analyze/AnalyzePage.tsx`
  - `src/components/theme/ThemeToggle.tsx` only if needed for entry-page behavior
- `/lookup` terminal may own:
  - `src/components/pages/LookupPage.tsx`
- `/admindata` terminal may own:
  - `src/components/admin/AdminDashboard.tsx`
- Shared system files require coordination before editing:
  - `src/app/globals.css`
  - `tailwind.config.ts`
  - `docs/DESIGN_SYSTEM.md`
  - `src/app/layout.tsx`
  - `src/components/brand/*`
- Do not run broad formatting across files owned by another terminal.
- Before each terminal starts, run `git status --short` and inspect the target page in Playwright at `1440x900`.

## UI Review Checklist

During UI review, always check:

- hierarchy
- spacing
- typography
- CTA emphasis
- mobile fit
- desktop booth fit
- safe area
- overflow / clipping
- camera visibility
- form readability
- text streaming pace
- face overlay comfort
- cat asset cleanliness
- Korean copy quality
- polite speech consistency
- result page scanability
- book thumbnail/link integrity

## Default Aesthetic Target

- cinematic
- live-camera first
- Apple glassmorphism
- dark glass HUD
- three-color palette discipline
- Pretendard Variable
- playful but precise
- cat consultant character
- MZ Korean copy
- polished booth demo
- not generic AI SaaS
- not cute-only
- not text-wall report
- intentionally designed, not AI-generated
