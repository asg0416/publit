import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('../..', import.meta.url).pathname;

const requiredFiles = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'HARNESS.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/design-docs/index.md',
  'docs/design-docs/core-beliefs.md',
  'docs/exec-plans/active/publit-mvp.md',
  'docs/exec-plans/completed/index.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/generated/db-schema.md',
  'docs/product-specs/index.md',
  'docs/product-specs/new-user-onboarding.md',
  'docs/references/design-system-reference-llms.txt',
  'docs/references/nixpacks-llms.txt',
  'docs/references/uv-llms.txt',
];

describe('Publit canonical docs and agent operating structure', () => {
  it('keeps the agent and docs structure expected by harness engineering', () => {
    for (const file of requiredFiles) {
      assert.equal(existsSync(join(projectRoot, file)), true, `${file} is missing`);
    }
  });

  it('puts non-negotiable safety constraints where future agents will read them first', () => {
    const agents = readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8');
    const security = readFileSync(join(projectRoot, 'docs/SECURITY.md'), 'utf8');
    const architecture = readFileSync(join(projectRoot, 'ARCHITECTURE.md'), 'utf8');

    for (const text of [agents, security, architecture]) {
      assert.match(text, /지도 API|map sdk/i);
      assert.match(text, /raw lat\/lng|raw latitude|raw coordinates/i);
      assert.match(text, /service role/i);
      assert.match(text, /harness/i);
    }
  });

  it('tracks active execution as a harness-first plan, not an informal todo list', () => {
    const plan = readFileSync(join(projectRoot, 'docs/exec-plans/active/publit-mvp.md'), 'utf8');

    assert.match(plan, /MVP/);
    assert.match(plan, /Red/);
    assert.match(plan, /Green/);
    assert.match(plan, /Verify/);
    assert.match(plan, /privacy/i);
    assert.match(plan, /lifecycle/i);
  });
});
