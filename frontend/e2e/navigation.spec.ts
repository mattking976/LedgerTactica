import { expect, test } from "@playwright/test";

test("navigates between the home and rosters pages", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Ledger Tactica" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Rosters" }).click();
  await expect(page).toHaveURL(/\/rosters$/);
  await expect(page.getByRole("heading", { name: "Rosters" })).toBeVisible();
  await expect(page.getByText("Roster management coming soon.")).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Ledger Tactica" }),
  ).toBeVisible();
});
