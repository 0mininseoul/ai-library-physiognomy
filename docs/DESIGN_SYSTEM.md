# AI 관상가 고양이 UI/UX Design System Prompt

이 문서는 `AI 관상가 고양이` UI/UX를 수정할 때 AI 모델이 계속 참고해야 하는 기준 문서다.
구현 전에 실제 화면을 Playwright로 검토하고, 이 문서의 원칙에 맞춰 문제 요약과 재구성 계획을 먼저 제안한다.

## Product / Design Context

- `AI 관상가 고양이`는 대학 도서관 부스에서 체험하는 관상/사주 기반 책 추천 서비스다.
- 사용자는 처음에는 "책 추천 서비스"보다 "고양이가 내 관상을 진지하게 보는 인터랙티브 체험"처럼 느껴야 한다.
- 최종 결과 후반부에서만 책 추천이 드러나야 한다.
- 시연 환경은 B2B 피칭과 현장 부스 모두를 고려한다.
- 기본 진입 인상은 대학 중앙도서관 담당자와 구매자가 신뢰할 수 있는 밝은 도서관 큐레이션 서비스여야 한다.
- 다크한 라이브 스캔 정체성은 학생 현장 체험용 `Live Face Scan / 몰입형 부스 모드`로 유지한다.
- UI는 가볍고 귀엽기만 한 서비스가 아니라, 라이브 카메라 분석실 같은 몰입감이 있어야 한다.
- 핵심 감성은 `Live Face Scan x 고양이 관상 상담소 x 도서관 큐레이션`이다.
- 기존 AI 얼평 서비스의 어두운 실시간 분석 HUD, 좌우 플로팅 카드, 카메라 중심 구성을 기준으로 삼는다.
- 단, 문구는 공격적 얼평이 아니라 유머러스하고 MZ스럽지만 존댓말인 고양이 상담 톤으로 간다.

## Non-Negotiable Design Rules

- PC-first is the current implementation priority. Optimize and inspect `1440x900` first for the booth/demo flow.
- Mobile fit is a later hardening pass; do not let mobile constraints weaken the PC booth experience in this round.
- Preserve the live webcam as the primary visual surface on the analyze flow.
- Do not replace the live camera experience with generic cards, landing pages, or SaaS-style panels.
- Before scan starts, do not show face mesh, dots, scan lines, or invasive overlays on the user's face.
- During scan/analyzing, face tracking overlays may appear, but they must feel intentional, lightweight, and not medically diagnostic.
- Result page must not repeat the exact same left/right floating-card layout used during analysis.
- Result page should feel like a staged reveal/report experience, not a dashboard wall of text.
- Do not use generic AI sparkle icons or decorative symbols that feel like AI slop.
- Do not use `처방`, `처방전`, `학생`, direct `연애` wording, or `근거 더 보기` in user-facing UI.
- If relationship compatibility is shown, describe it as `관계 궁합`, `케미`, `잘 맞는 사람`, or `함께하기 좋은 흐름`.
- Use `더보기` rather than `근거 더 보기`.
- Avoid skin evaluation. Do not score or comment on skin quality.
- All Korean copy must use polite speech. No 반말.
- User name should use `~님`, not `학생`.
- The result headline must stay on one line where possible.

## Color And Visual Direction

- Keep the live scan-room design language, but support light and dark themes through shared tokens.
- The visual theme is `Library Curation x Apple Glassmorphism x Cat Observatory`.
- Default theme is light for B2B buyer, library staff, admin, lookup, and result surfaces.
- Dark theme remains available for immersive student booth mode and scan/analyzing stages.
- Do not build two unrelated UIs. Use CSS variables and theme tokens so light/dark share the same spacing, radius, typography, and component grammar.
- Primary light surfaces should use warm white, soft gray, ink text, and muted teal accents.
- Primary dark scan surfaces should use black, near-black, and translucent glass.
- Glass panels should feel like Apple-style frosted glass: precise, layered, softly blurred, and intentionally lit.
- Glass effects must be refined and functional, never gimmicky, noisy, or over-styled.
- The palette should stay constrained to three major color families:
  1. Library paper: warm white / soft gray for default surfaces, public-institution calm, and readable reports.
  2. Ink and glass: near-black text, translucent glass, precise borders, and dark scan-room depth.
  3. Muted scan mint: teal/mint for status, focus, progress, and primary action. In light theme it must feel muted and credible, not neon.
- Do not add new accent families unless there is a true semantic exception.
- Avoid bright purple, loud blue, startup gradients, rainbow accents, orange-heavy palettes, yellow-heavy highlights, and toy-like pastel themes.
- If a warm cat label is needed, keep it extremely small and subordinate; it must not become a fourth dominant palette.
- Use subtle borders, low-opacity fills, controlled blur, and scanline texture only where it supports the live-analysis atmosphere.
- The UI must feel premium, technical, and playful through copy, hierarchy, and motion, not through excessive decoration.
- Every surface should feel intentionally designed. Avoid arbitrary opacity values, random glow, mismatched border colors, or effects that look AI-generated.

## Typography

- Use `Pretendard Variable` throughout the entire product.
- Do not mix in other fonts unless explicitly approved.
- Korean headings should be bold, compact, and readable from booth distance.
- Headings should use strong weight and tight but not cramped line-height.
- Body text must be short enough to scan quickly.
- Body copy should use consistent weight and opacity. Avoid randomly faded text that hurts readability.
- Avoid long paragraph blocks on the main visible surface.
- Detailed analysis can exist, but should be progressively revealed or placed behind `더보기`.
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
- `[data-theme="dark"]` and `.theme-dark` provide the dark theme.
- User-selected theme is stored in `localStorage`.
- The app may force dark theme only inside the scan/analyzing stage, because that is an immersive booth mode.
- `prefers-color-scheme` may be referenced, but B2B default entry must remain light unless the user explicitly toggles dark.
- Admin, lookup, and result pages should read as light, reliable operating surfaces by default.

### Analyze Entry Page

- Live camera is full-screen background.
- Form appears as a right-side glass modal on desktop.
- On mobile, form must fit cleanly with safe-area handling.
- The form sequence is:
  1. 이름
  2. 학번(또는 사번)
  3. 성별
  4. 생년월일
  5. 선호하는 책 카테고리
  6. 개인정보처리방침 및 이용약관 동의
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
- Cards need face-point connector lines where relevant, similar to the original AI 얼평 service.
- The final assessment card appears bottom-center after the staged card reveal.

### Result Page

- Must be visually distinct from the analyzing screen.
- Do not reuse the same left/right floating analysis-card structure as the main result layout.
- Prefer a staged section-based report:
  1. Main type reveal
  2. Face signal summary
  3. Impression/index summary
  4. Saju/five-elements summary
  5. Relationship compatibility
  6. Book recommendations
- The user should not be forced to read dense text walls.
- Each section should have one clear message and one optional detail layer.
- Details should be collapsed by default if they are long, but the collapsed state must not hide the main value.
- Use `더보기` for expanded detail.
- Face image on result page should be clean. No white landmark dots or face markers.
- If face image is older than 24 hours, show the existing 24-hour deletion message clearly.
- Book recommendation cards must include book thumbnails.
- Book cards must link to the relevant Naver book page for MVP.

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
