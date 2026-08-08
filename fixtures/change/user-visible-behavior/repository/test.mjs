/* global process, console */

import assert from "node:assert";
import { formatErrorResponse } from "./index.mjs";

const mode = process.argv[2];

if (!mode || mode === "error-format") {
  const res = formatErrorResponse("ERR_SEAT_LIMIT", "Seat limit reached");
  assert.strictEqual(typeof res.error, "object", "error must be a structured object");
  assert.strictEqual(res.error.code, "ERR_SEAT_LIMIT", "error code must match");
  assert.strictEqual(res.error.message, "Seat limit reached", "error message must match");
}

if (!mode || mode === "timestamp-iso") {
  const res = formatErrorResponse("ERR_SEAT_LIMIT", "Seat limit reached");
  assert.ok(res.timestamp, "timestamp must be present");
  const parsed = new Date(res.timestamp);
  assert.ok(!isNaN(parsed.getTime()), "timestamp must be valid date");
  assert.strictEqual(res.timestamp, parsed.toISOString(), "timestamp must be ISO 8601 string");
}

console.log("User-visible behavior tests passed.");
