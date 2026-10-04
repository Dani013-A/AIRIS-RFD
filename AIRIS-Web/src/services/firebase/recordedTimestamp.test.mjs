import assert from "node:assert/strict";
import test from "node:test";
import { recordedTimestamp } from "./recordedTimestamp.mjs";

test("uses recorded Firestore and ISO timestamps", () => {
  const instant = "2026-10-01T09:30:00.000Z";
  assert.equal(recordedTimestamp(instant), instant);
  assert.equal(recordedTimestamp({ toDate: () => new Date(instant) }), instant);
  assert.equal(recordedTimestamp({ seconds: Date.parse(instant) / 1000 }), instant);
});

test("never invents a date for absent or malformed activity data", () => {
  assert.equal(recordedTimestamp(undefined), undefined);
  assert.equal(recordedTimestamp(null), undefined);
  assert.equal(recordedTimestamp(""), undefined);
  assert.equal(recordedTimestamp("not a date"), undefined);
});
