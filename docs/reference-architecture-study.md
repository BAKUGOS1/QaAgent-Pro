# Human-QA Reference Architecture Study

Reviewed on 20 June 2026. All repositories are reference-only; no source code was copied.

| Reference | Revision reviewed | License/use | Adopted concept |
|---|---|---|---|
| BAKUGOS1/QaAgent | `679a1815c249d5436cdeeb6fa2ffe026dce38e70` | MIT, architecture inspiration | Local Playwright execution, safety gates, evidence-rich Excel output |
| Microsoft Playwright | `11797b0336d50ab0d8bc554f53fcd8d4aab8438e` | Apache-2.0 | Project dependencies, storage state, role/label locators, web-first assertions, traces |
| Agentic QE Fleet | `e664f3ec4514bdfc96bc25af9d078e2890eaa5d9` | MIT | Specialized QE responsibilities, risk scoring, evidence-based quality gates |
| Test Automation Skills & Agents | `e32b29ed23fe5d299eb2ff3641200d091d88b421` | MIT | Test constitution, explore-plan-execute-review workflow, ISTQB heuristics and bug quality |
| TestZeus Hercules | `59d313af9d26d188fd0513f289f333cbeb2c742d` | AGPL-3.0, concept-only | Human-readable Given/When/Then mission shape; no code or implementation copied |
| GUITester / GUITestBench | arXiv `2601.04500v1` | Research concept | Separate planning/execution from defect verification; distinguish application defects from execution slips |

## QaAgent-Pro interpretation

“Human-like QA” does not mean unrestricted clicking. It means:

1. Start with a mission and explicit risks.
2. Apply experience-based heuristics such as boundaries, interruptions, state transitions, and data variation.
3. Execute only deterministic supported actions.
4. Preserve an interaction timeline and multi-oracle evidence.
5. Verify suspected defects independently from task execution.
6. Attribute failure to application, automation, environment, product ambiguity, or insufficient evidence.
7. Make a release recommendation with confidence and residual-risk disclosure.

## Role boundaries

| Role | May do | Must not do |
|---|---|---|
| Mission Planner | Expand a charter into test intents | Operate the browser |
| Risk Analyst | Score likelihood and impact; prioritize intents | Change expected results |
| Executor | Run enumerated Playwright actions and capture evidence | Invent steps or classify defects |
| Defect Verifier | Compare oracles, replay evidence, attribute failures | Hide execution errors as product bugs |
| Release Judge | Apply quality gates and report residual risk | Override safety policy |

The roles are TypeScript services, not external AI agents. Their outputs are deterministic and unit-tested.
