import { expect, test } from "@playwright/test"

test.describe("Marketing site", () => {
  test("home hero, stories and proof tiles", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: /spend it right/i })).toBeVisible()
    await page.getByRole("tab", { name: "Going over budget" }).click()
    await expect(page.getByText(/Budget held/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /View tx/i }).first()).toBeVisible()
  })

  test("demo page runs the failure lab", async ({ page }) => {
    await page.goto("/demo")
    await page.getByRole("button", { name: "Simulate attack" }).click()
    await expect(page.getByText(/financial failure classes exposed/i)).toBeVisible({
      timeout: 8000,
    })
    await expect(page.getByText(/Application error/i)).toHaveCount(0)
  })

  test("old routes redirect", async ({ page }) => {
    await page.goto("/attack")
    await expect(page).toHaveURL(/\/demo$/)
    await page.goto("/ecosystems")
    await expect(page).toHaveURL(/\/proof$/)
    await page.goto("/r/demo")
    await expect(page).toHaveURL(/\/demo#receipt$/)
  })

  test("proof index lists rails honestly", async ({ page }) => {
    await page.goto("/proof")
    await expect(page.getByRole("heading", { name: /labelled honestly/i })).toBeVisible()
    await expect(page.getByText("Sandbox live")).toBeVisible()
  })

  test("stellar public proof page", async ({ page }) => {
    await page.goto("/proof/stellar-testnet")
    await expect(page.getByRole("heading", { name: /Verified testnet settlement/i })).toBeVisible()
    await expect(page.getByText("CONFIRMED").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: /Soroban policy contract/i })).toBeVisible()
  })

  test("metal proof page", async ({ page }) => {
    await page.goto("/proof/metal-testnet")
    await expect(page.getByRole("heading", { name: /limits that hold/i })).toBeVisible()
  })
})
