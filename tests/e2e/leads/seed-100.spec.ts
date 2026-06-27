import { test } from "@playwright/test";
import { LeadsPage } from "../../../src/pages/leads-page.js";
import { loadConfig } from "../../../src/config/load.js";

const TOTAL_RECORDS = 100;
const CONVERT_TO_DEAL_LIMIT = 50;

test.describe("Data Seeding Task", () => {
  test.use({ storageState: ".auth/crm.json" });

  test("Seed 100 leads, convert 50 to deals, and add activities", async ({ page }) => {
    // 0 means no time limit for the entire test
    test.setTimeout(0); 
    // 30 seconds max wait for any single UI element (prevents infinite hanging)
    page.setDefaultTimeout(30000);

    const config = loadConfig();
    const leadsPage = new LeadsPage(page);

    await leadsPage.open(config.CRM_BASE_URL);

    for (let i = 1; i <= TOTAL_RECORDS; i++) {
      const fixtureName = `Seeded Lead ${i} - ${Date.now()}`;
      
      try {
        console.log(`Processing Iteration ${i}/${TOTAL_RECORDS}: ${fixtureName}`);

        // 1. ADD LEAD
        await test.step(`Iteration ${i}: Add Lead`, async () => {
          await leadsPage.fillLead({
            name: fixtureName,
            company: `Seeded Corp ${i}`,
            mobile: `555000${i.toString().padStart(4, "0")}`,
            email: `seeded${i}@org.local`,
            value: (500 * i).toString()
          });
          const outcome = await leadsPage.saveLead();
          if (outcome.state !== "closed") {
             console.error(`Iter ${i} Save failed: ${outcome.validationMessages.join(", ")}`);
             await leadsPage.cancelDialog();
          }
        });

        // Search for the newly added lead to open detail view
        await leadsPage.search(fixtureName);
        const hasLead = await leadsPage.hasText(fixtureName);
        if (!hasLead) {
          console.error(`Iter ${i}: Lead not found after adding.`);
          await leadsPage.clearSearch();
          continue;
        }

        await leadsPage.openLeadDetail({ name: fixtureName, company: `Seeded Corp ${i}`, mobile: "", email: "" });

        // 2. ADD ACTIVITY / NOTE
        await test.step(`Iteration ${i}: Add Activity`, async () => {
           // Click Activity or Note tab
           const activityTab = page.locator("[role='tab']:has-text('Activity'), button:has-text('Activity'), [role='tab']:has-text('Note'), button:has-text('Note')").first();
           if (await activityTab.count() > 0 && await activityTab.isVisible()) {
              await activityTab.click();
              
              // Wait a bit for the tab to render
              await page.waitForTimeout(500);

              // Find a text area or input for the note
              const noteInput = page.locator('textarea, input[placeholder*="note" i], input[placeholder*="activity" i]').first();
              if (await noteInput.count() > 0) {
                 await noteInput.fill(`Seeded note for iteration ${i}. Follow up required.`);
                 const saveNoteBtn = page.getByRole("button", { name: /Save|Add Note|Post/i }).first();
                 if (await saveNoteBtn.count() > 0) await saveNoteBtn.click();
              }
           }
        });

        // 3. CONVERT TO DEAL (Only for first 50)
        if (i <= CONVERT_TO_DEAL_LIMIT) {
          await test.step(`Iteration ${i}: Convert to Deal`, async () => {
             const convertBtn = page.getByRole("button", { name: /Convert|Create Deal/i }).first();
             if (await convertBtn.count() > 0 && await convertBtn.isVisible()) {
                await convertBtn.click();
                
                // Assuming a dialog opens for conversion
                const convertDialog = page.getByRole("dialog");
                if (await convertDialog.count() > 0) {
                   // Might need to fill in deal name or just click save
                   const dealNameInput = convertDialog.getByRole("textbox", { name: /Deal Name/i }).first();
                   if (await dealNameInput.count() > 0) {
                      await dealNameInput.fill(`Seeded Deal ${i}`);
                   }
                   
                   const confirmConvert = convertDialog.getByRole("button", { name: /Convert|Save|Confirm/i }).first();
                   if (await confirmConvert.count() > 0) await confirmConvert.click();
                   
                   // Wait for dialog to close
                   await convertDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
                }
             }
          });
        }

        // Close drawer if it's open
        const closeBtn = page.locator("button[aria-label='Close'], button.close").first();
        if (await closeBtn.count() > 0 && await closeBtn.isVisible()) await closeBtn.click();
        
        // Ensure we are back on the Leads list by clearing search
        await leadsPage.clearSearch();
        await page.waitForTimeout(500); // small delay to let table refresh

      } catch (err: unknown) {
        console.error(`Iter ${i} Unhandled Exception: ${err instanceof Error ? err.message : String(err)}`);
        // Attempt to close dialog if open to recover state
        await leadsPage.cancelDialog();
        const closeBtn = page.locator("button[aria-label='Close'], button.close").first();
        if (await closeBtn.count() > 0) await closeBtn.click();
        await leadsPage.clearSearch();
      }
    }

    console.log("Seeding task completed.");
  });
});
