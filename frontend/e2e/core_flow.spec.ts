import { test, expect } from '@playwright/test';

test.describe('End-to-End Interview Coach Flow', () => {
  test('Complete Candidate Journey: Login -> Analytics Dashboard -> Configure Interview -> Answer Question -> Rubric Feedback', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('http://127.0.0.1:5173/login');
    await expect(page.getByText('Welcome Back')).toBeVisible();

    // 2. Sign in as demo candidate
    await page.fill('input[type="email"]', 'candidate@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 3. Verify Dashboard Loads with Seeded Analytics
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible();
    await expect(page.getByText(/Practice Streak/i)).toBeVisible();
    await expect(page.getByText(/Score Trajectory Over Time/i)).toBeVisible();
    await expect(page.getByText(/Skill Mastery Profile/i)).toBeVisible();
    await expect(page.getByText(/Performance by Category/i)).toBeVisible();

    // 4. Click "Launch Mock Interview"
    await page.click('text=Launch Mock Interview');
    await page.waitForURL('**/session/new', { timeout: 8000 });
    await expect(page.getByText(/Configure Your Practice Session/i)).toBeVisible();

    // 5. Select 5 questions and Adaptive Pacing
    await page.click('text=5 Questions');
    await page.click('text=Begin Mock Interview');

    // 6. Active Interview Room
    await page.waitForURL(/.*session\/[0-9a-f-]+$/, { timeout: 10000 });
    await expect(page.getByText(/Question 1 of 5/i)).toBeVisible();
    await expect(page.getByText(/Written Response/i)).toBeVisible();

    // 7. Type structured answer into TextEditor
    const candidateAnswer = 
      "In a Hash Map, collisions happen when two different keys map to the same bucket index. " +
      "They are handled via Separate Chaining, where each bucket holds a linked list or red-black tree, " +
      "or via Open Addressing with linear or quadratic probing. When the load factor exceeds a threshold, " +
      "the table dynamically resizes to maintain O(1) average lookup time.";
    await page.fill('textarea', candidateAnswer);
    await expect(page.getByText(/words/i)).toBeVisible();

    // 8. Submit Answer for Evaluation
    await page.click('text=Submit for Evaluation');

    // 9. Verify Feedback Screen
    await page.waitForURL(/.*feedback\/[0-9a-f-]+$/, { timeout: 12000 });
    await expect(page.getByText(/Overall Score/i)).toBeVisible();
    await expect(page.getByText(/Rubric Dimensions/i)).toBeVisible();
    await expect(page.getByText(/Clarity & Structure/i)).toBeVisible();
    await expect(page.getByText(/Demonstrated Strengths/i)).toBeVisible();
    await expect(page.getByText(/Side-by-Side Comparison/i)).toBeVisible();
    await expect(page.getByText(/Exemplary Model Answer/i)).toBeVisible();

    // 10. Take screenshot of feedback screen
    await page.screenshot({ path: 'e2e-attempt-feedback.png', fullPage: true });

    // 11. Navigate back to dashboard and verify
    await page.click('text=Exit to Dashboard');
    await page.waitForURL('**/dashboard', { timeout: 8000 });
    await page.screenshot({ path: 'e2e-dashboard-with-analytics.png', fullPage: true });
    console.log('Playwright complete journey test passed and screenshots saved!');
  });
});
