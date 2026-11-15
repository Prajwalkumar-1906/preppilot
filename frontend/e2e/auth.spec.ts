import { test, expect } from '@playwright/test';

test.describe('End-to-End Authentication & Question Bank Flow', () => {
  test('Candidate registers, views dashboard, and explores curated question bank', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('http://127.0.0.1:5173/login');
    await expect(page.getByText('Welcome Back')).toBeVisible();

    // 2. Click to Register
    await page.click('text=Create an account');
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByText('Create Candidate Profile')).toBeVisible();

    // 3. Fill in registration form
    const uniqueEmail = `fresher_p2_${Date.now()}@university.edu`;
    await page.fill('input[placeholder="Jane Doe"]', 'Morgan SDE');
    await page.fill('input[placeholder="jane@alumni.edu"]', uniqueEmail);
    await page.fill('input[placeholder="At least 6 characters"]', 'Password123!');
    await page.selectOption('select >> nth=0', 'SDE');
    await page.selectOption('select >> nth=1', 'fresher');

    // 4. Submit registration
    await page.click('button[type="submit"]');

    // 5. Verify redirect to Dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByText(/Welcome back, Morgan/i)).toBeVisible();
    await expect(page.getByText(/Curated Question Bank \(SDE\)/i)).toBeVisible();

    // 6. Verify questions are loaded in the bank explorer
    const questionCard = page.locator('text=How does a Hash Map handle collisions under the hood').first();
    await expect(questionCard).toBeVisible({ timeout: 5000 });

    // 7. Click question to expand rubric criteria
    await questionCard.click();
    await expect(page.getByText(/What the Evaluator Looks For:/i)).toBeVisible();

    // 8. Capture screenshot of Phase 2 dashboard with question bank
    await page.screenshot({ path: 'e2e-phase2-question-bank.png', fullPage: true });
    console.log('Phase 2 Playwright E2E verification screenshot saved successfully!');
  });
});
