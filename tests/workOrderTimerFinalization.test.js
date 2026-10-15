import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(resolve(globalThis.process.cwd(), "supabase/migrations/20261014250000_finalize_paused_work_order_timer.sql"), "utf8");

describe("paused Work Order timer finalization", () => {
  it("allows Stop to finalize a paused entry without adding elapsed time twice", () => {
    expect(migrationSource).toContain("or (finalize and status = 'paused' and active_started_at is null)");
    expect(migrationSource).toContain("when status = 'running' and active_started_at is not null");
    expect(migrationSource).toContain("status = case when finalize then 'completed' else 'paused' end");
  });
});

