import { expect, test } from "@playwright/test"

const OPERATOR_HOST = "prebroadcast.vercel.app"

test.describe("Marketing site", () => {
  test("home hero and integrations strip", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /spend money safely/i })).toBeVisible()
    await expect(page.getByText("Execution infrastructure")).toBeVisible()
    await expect(page.getByRole("heading", { name: /Failure Lab/i })).toBeVisible()
  })

  test("hero mode tabs switch telemetry", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("tab", { name: "ATTACK" }).click()
    await expect(page.getByText("DENY")).toBeVisible()
    await page.getByRole("tab", { name: "FAILURE" }).click()
    await expect(page.getByText("UNKNOWN")).toBeVisible()
  })

  test("failure lab run attack does not crash", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Run attack" }).click()
    await expect(page.getByText(/financial failure classes exposed/i)).toBeVisible({
      timeout: 8000,
    })
    await expect(page.getByText(/Application error/i)).toHaveCount(0)
  })

  test("attack page loads", async ({ page }) => {
    await page.goto("/attack")
    await expect(page.getByRole("heading", { name: /six financial failures/i })).toBeVisible()
  })

  test("sample receipt and copy proof", async ({ page }) => {
    await page.goto("/r/demo")
    await expect(page.getByText(/EVIDENCE VALID/i)).toBeVisible()
    await page.getByRole("button", { name: /Copy proof/i }).click()
    await expect(page.getByRole("button", { name: /Copied/i })).toBeVisible()
  })

  test("ecosystems CDP links to operator", async ({ page }) => {
    await page.goto("/ecosystems")
    const cdp = page.getByRole("link", { name: /Open operator console/i })
    await expect(cdp).toHaveAttribute("href", new RegExp(OPERATOR_HOST))
    await expect(cdp).toHaveAttribute("target", "_blank")
  })

  test("header evidence route", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Evidence", exact: true }).click()
    await expect(page).toHaveURL(/\/r\/demo/)
  })
})

test.describe("Operator (public auth)", () => {
  test("login page matches Railguard brand", async ({ page }) => {
    await page.goto(`https://${OPERATOR_HOST}/login`)
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible()
    await expect(page.getByText(/Not unlimited money/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /Marketing site/i })).toBeVisible()
  })
})
