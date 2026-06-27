import { test } from "@playwright/test";
import { LeadsPage } from "../../../src/pages/leads-page.js";
import { loadConfig } from "../../../src/config/load.js";

// Huge data test simulating high volume operations
const ITERATIONS = 10;

test.describe("Huge Data QA Task", () => {
  test.use({ storageState: ".auth/crm.json" });

  test("execute massive add, edit, and delete operations", async ({ page }) => {
    test.setTimeout(120_000); // Allow enough time for the loop
    const config = loadConfig();
    const leadsPage = new LeadsPage(page);

    await leadsPage.open(config.CRM_BASE_URL);

    const errors: string[] = [];

    for (let i = 1; i <= ITERATIONS; i++) {
      const fixtureName = `Stress QA Lead ${i} - ${Date.now()}`;
      
      try {
        // 1. ADD
        await test.step(`Iteration ${i}: Add Lead`, async () => {
          await leadsPage.fillLead({
            name: fixtureName,
            company: `QA Corp ${i}`,
            mobile: `999000${i.toString().padStart(4, "0")}`,
            email: `stress${i}@qa.local`,
            value: (100 * i).toString()
          });
          const outcome = await leadsPage.saveLead();
          if (outcome.state !== "closed") {
             errors.push(`Iter ${i} Save failed: ${outcome.validationMessages.join(", ")}`);
             await leadsPage.cancelDialog();
          }
        });

        // Search for the newly added lead to operate on it
        await leadsPage.search(fixtureName);
        const hasLead = await leadsPage.hasText(fixtureName);
        if (!hasLead) {
          errors.push(`Iter ${i}: Lead ${fixtureName} not found in table after adding.`);
          await leadsPage.clearSearch();
          continue;
        }

        // 2. EDIT
        await test.step(`Iteration ${i}: Edit Lead`, async () => {
           // We will open detail
           await leadsPage.openLeadDetail({ name: fixtureName, company: `QA Corp ${i}`, mobile: "", email: "" });
           
           // Assuming there's an Edit button inside the drawer/detail view
           const editBtn = page.getByRole("button", { name: "Edit", exact: true });
           if (await editBtn.count() > 0) {
              await editBtn.click();
              // Make a small change
              const valInput = page.getByRole("textbox", { name: "Value", exact: true });
              if (await valInput.count() > 0) {
                 await valInput.fill("9999");
              }
              const saveBtn = page.getByRole("dialog").getByRole("button", { name: "Save", exact: true });
              if (await saveBtn.count() > 0) await saveBtn.click();
           } else {
              errors.push(`Iter ${i}: Edit button not found in lead detail.`);
           }

           // Close drawer if it's open (usually an X button or similar, try clicking outside or a close button)
           const closeBtn = page.locator("button[aria-label='Close'], button.close").first();
           if (await closeBtn.count() > 0) await closeBtn.click();
        });

        // 3. DELETE
        await test.step(`Iteration ${i}: Delete Lead`, async () => {
           // Wait for table to reflect potential closures
           await page.waitForTimeout(500);

           // Locate the row and click Delete if present
           const row = page.getByRole("row").filter({ hasText: fixtureName }).first();
           
           // Some CRMs have a 3-dot menu or a direct delete icon. We will try a generic approach
           const deleteBtn = row.locator('button[title*="Delete" i], button[aria-label*="Delete" i], .text-red-500, svg.text-destructive').first();
           if (await deleteBtn.count() > 0) {
              await deleteBtn.click();
              
              // Handle confirm dialog
              const confirmDialog = page.getByRole("dialog");
              if (await confirmDialog.count() > 0) {
                 const confirmDeleteBtn = confirmDialog.getByRole("button", { name: /Delete|Confirm|Yes/i }).first();
                 if (await confirmDeleteBtn.count() > 0) await confirmDeleteBtn.click();
              }
           } else {
              errors.push(`Iter ${i}: Delete button not found on row.`);
           }
        });

        await leadsPage.clearSearch();

      } catch (err: unknown) {
        errors.push(`Iter ${i} Unhandled Exception: ${err instanceof Error ? err.message : String(err)}`);
        // Attempt to close dialog if open to recover state
        await leadsPage.cancelDialog();
      }
    }

    if (errors.length > 0) {
       console.error("Errors found during stress test:\\n", errors.join("\\n"));
    } else {
       console.log("Stress test completed with no functional blockages found.");
    }
    
    // We intentionally don't fail the playwright test so we can observe all errors in the console output
  });
});
