import { expect, test } from "@playwright/test";

test("complete core product flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Practice saying it clearly." })).toBeVisible();

  await page.getByRole("button", { name: "Save onboarding" }).click();
  await expect(page.getByText("Onboarding saved")).toBeVisible();

  await page.getByRole("button", { name: "Update assessment" }).click();
  await expect(page.getByText("Assessment updated")).toBeVisible();

  await page.getByRole("button", { name: "Rewrite assertively" }).click();
  await expect(page.getByText("Rewrite ready")).toBeVisible();
  await expect(page.getByLabel("Structured feedback scores").first()).toContainText("Clarity");

  await page.getByRole("button", { name: "Run role-play" }).click();
  await expect(page.getByText("Role-play feedback ready")).toBeVisible();
  await expect(page.getByText("Voice role-play is currently disabled by feature flag.")).toBeVisible();

  await page.getByRole("button", { name: "Prepare export" }).click();
  await expect(page.getByText("Privacy export prepared")).toBeVisible();

  await page.getByRole("button", { name: "Queue deletion" }).click();
  await expect(page.getByText("Deletion request queued")).toBeVisible();
});
