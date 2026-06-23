import { expect, test } from "@playwright/test";
import { LeadsPage } from "../../../src/pages/leads-page.js";

test("LeadsPage opens detail from a row-scoped target when duplicate text exists", async ({ page }) => {
  await page.setContent(`
    <button>Add Lead</button>
    <button aria-label="Open search">Search</button>
    <button>Filter</button>
    <table>
      <thead><tr><th></th><th>Company Name</th><th>Name</th><th>Mobile</th><th>Email</th></tr></thead>
      <tbody>
        <tr><td><input type="checkbox" /></td><td><button>QA Company</button><span>QA Company</span></td><td>QA Person</td><td>9000000000</td><td>qa@example.com</td></tr>
      </tbody>
    </table>
    <script>
      document.querySelector("button").addEventListener("click", () => {});
      document.querySelector("td button").addEventListener("click", () => {
        document.body.insertAdjacentHTML("beforeend", "<section>Details History Activity Note</section>");
      });
    </script>
  `);
  const leads = new LeadsPage(page);

  await leads.openLeadDetail({
    name: "QA Person",
    company: "QA Company",
    mobile: "9000000000",
    email: "qa@example.com"
  });

  await expect(page.getByText("Details History Activity Note")).toBeVisible();
});

test("LeadsPage reports validation when Save leaves the drawer open", async ({ page }) => {
  await page.setContent(`
    <button>Add Lead</button>
    <button aria-label="Open search">Search</button>
    <button>Filter</button>
    <table><tbody><tr><td>row</td></tr></tbody></table>
    <div role="dialog">
      <label class="text-red-500">Business Name is required</label>
      <button>Save</button>
    </div>
  `);
  const leads = new LeadsPage(page);

  await leads.clickSaveLead();
  const outcome = await leads.observeSaveOutcome(100);

  expect(outcome.state).toBe("validation-visible");
  expect(outcome.validationMessages.join(" ")).toContain("Business Name is required");
});
