import { expect, test } from "@playwright/test";

test("entry page shows AI 관상가 고양이 flow", async ({ page }) => {
  await page.goto("/analyze");

  await expect(page.getByText("AI 관상가 고양이").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /야옹이가 관상 봐드립니다/ })).toBeVisible();
  await expect(page.getByLabel("이름")).toBeVisible();
  await expect(page.getByLabel("학번(또는 사번)")).toBeVisible();
  await expect(page.getByLabel("생년월일")).toBeVisible();
  await expect(page.getByLabel("선호 카테고리")).toBeVisible();
  await expect(page.getByRole("button", { name: /내 관상 분석하기/ })).toBeVisible();
});
