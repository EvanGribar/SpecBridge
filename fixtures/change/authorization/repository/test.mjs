/* global process, console */

import assert from "node:assert";
import { inviteMember } from "./index.mjs";

const mode = process.argv[2];

if (!mode || mode === "auth-role") {
  const admin = { id: "u1", role: "admin" };
  const res = inviteMember(admin, "user@example.com");
  assert.strictEqual(res.status, 200, "Admin should be able to invite member");
}

if (!mode || mode === "auth-forbidden") {
  const member = { id: "u2", role: "member" };
  const res = inviteMember(member, "user@example.com");
  assert.strictEqual(res.status, 403, "Non-admin member must receive 403 Forbidden");
}

console.log("Authorization tests passed.");
