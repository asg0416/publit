import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('../..', import.meta.url).pathname;
const migrationsDir = join(projectRoot, 'supabase', 'migrations');
const migrationSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
  .join('\n')
  .toLowerCase();

const requiredTables = ['flames', 'flame_reactions', 'reports', 'topics', 'action_events'];

describe('Publit database privacy migration', () => {
  it('creates the required tables without raw coordinate columns', () => {
    for (const tableName of requiredTables) {
      assert.match(migrationSql, new RegExp(`create table\\s+(if not exists\\s+)?public\\.${tableName}\\b`));
    }

    assert.doesNotMatch(migrationSql, /\b(lat|latitude|lng|longitude|coordinates?|raw_location)\b/);
    assert.match(migrationSql, /\bgeohash\s+text\s+not null\b/);

    for (const column of ['character_key', 'character_emoji', 'region_code', 'display_scope']) {
      assert.match(migrationSql, new RegExp(`\\b${column}\\b`));
    }
  });

  it('enforces lifecycle, mood, category, reaction, report, topic, and strength constraints', () => {
    for (const value of ['live', 'ember', 'trace', 'extinguished', 'reported', 'hidden', 'expired']) {
      assert.match(migrationSql, new RegExp(`'${value}'`));
    }

    for (const value of ['politics', 'local', 'society', 'safety', 'daily', 'other']) {
      assert.match(migrationSql, new RegExp(`'${value}'`));
    }

    for (const value of ['quiet', 'curious', 'serious', 'want_talk']) {
      assert.match(migrationSql, new RegExp(`'${value}'`));
    }

    for (const value of ['similar', 'need_source', 'watching']) {
      assert.match(migrationSql, new RegExp(`'${value}'`));
    }

    assert.match(migrationSql, /self_strength\s+int\s+not null/);
    assert.match(migrationSql, /self_strength\s+in\s+\(1,\s*2,\s*3\)/);
  });

  it('enables RLS and keeps public clients away from direct table writes', () => {
    for (const tableName of requiredTables) {
      assert.match(migrationSql, new RegExp(`alter table public\\.${tableName}\\s+enable row level security`));
    }

    assert.match(migrationSql, /revoke\s+all\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+anon,\s*authenticated/);
    assert.doesNotMatch(migrationSql, /to\s+authenticated\s+using\s*\(\s*true\s*\)/);
    assert.doesNotMatch(migrationSql, /to\s+anon\s+using\s*\(\s*true\s*\)/);
    assert.doesNotMatch(migrationSql, /security\s+definer/);
  });

  it('adds privacy and lifecycle indexes used by Edge Functions', () => {
    for (const column of ['geohash', 'status', 'live_until', 'ember_until', 'trace_until', 'category', 'tag_normalized', 'device_hash']) {
      assert.match(migrationSql, new RegExp(`create index[^;]+flames[^;]+\\(${column}\\)`));
    }

    assert.match(migrationSql, /create unique index[^;]+flame_reactions[^;]+\(flame_id,\s*device_hash,\s*reaction_type\)/);
    assert.match(migrationSql, /create unique index[^;]+reports[^;]+\(flame_id,\s*device_hash,\s*reason\)/);
    assert.match(migrationSql, /create index[^;]+action_events[^;]+\(device_hash,\s*created_at\)/);
  });
});
