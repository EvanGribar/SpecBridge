/* global process, console */

import assert from "node:assert";
import { Workspace } from "./index.mjs";

const mode = process.argv[2];

if (!mode || mode === "seat-limit") {
  const ws = new Workspace("starter");
  ws.members = ["m1", "m2", "m3", "m4", "m5"];
  ws.usageCount = 5;
  const res = ws.invite("m6");
  assert.strictEqual(res.success, false, "Invitation beyond 5 seats must be rejected");
}

if (!mode || mode === "failed-invite-rollback") {
  const ws = new Workspace("starter");
  ws.members = ["m1", "m2", "m3", "m4", "m5"];
  ws.usageCount = 5;
  const initialUsage = ws.usageCount;
  ws.invite("m6");
  assert.strictEqual(ws.usageCount, initialUsage, "Failed invitation must not increment usage count");
}

console.log("State invariant tests passed.");
