import { expect, test } from "@playwright/test";

test("entry page shows AI 관상가 고양이 flow", async ({ page }) => {
  await page.goto("/analyze");

  await expect(page.getByText("AI 관상가 고양이").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /관상 찍고/ })).toBeVisible();
  await expect(page.getByLabel("이름")).toBeVisible();
  await expect(page.getByLabel("학번")).toBeVisible();
  await expect(page.getByLabel("생년월일")).toBeVisible();
  await expect(page.getByLabel("선호 독서 카테고리")).toBeVisible();
});
