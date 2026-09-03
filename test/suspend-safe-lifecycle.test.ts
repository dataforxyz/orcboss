import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SUSPEND_SAFE_LIFECYCLE_FEATURE, WorkerStore } from "../src/store.ts";
import { cleanupReason } from "../src/workers.ts";

test("worker lifecycle budgets exclude system suspend while terminal retention remains wall-clock based", async () => {
  const root = await mkdtemp(join(tmpdir(), "worker-store-suspend-safe-"));
  let wallAt = 1_000;
  let monotonicAt = 5_000;
  let bootId = "00000000-0000-0000-0000-000000000001";
  const store = new WorkerStore(join(root, "workers.json"), {
    now: () => wallAt,
    monotonicNow: () => monotonicAt,
    bootId: () => bootId,
  });
  try {
    await store.mutate((state) => {
      state.workers.push({
        id: "live-worker",
        runId: "live-run",
        harness: "pi",
        backend: "systemd",
        role: "advisor",
        task: "keep working",
        cwd: "/tmp",
        state: "ready",
        owned: true,
        managerSessionId: "manager",
        createdAt: wallAt,
        updatedAt: wallAt,
        leaseExpiresAt: 111_000,
        lastWorkerActivityAt: 1_000,
        idleDeadlineAt: 121_000,
        checkpointDeadlineAt: 131_000,
        checkpointLastAttemptAt: 500,
      });
      state.workers.push({
        id: "boss-paused-worker",
        runId: "boss-paused-run",
        harness: "pi",
        backend: "systemd",
        role: "advisor",
        task: "explicitly paused",
        cwd: "/tmp",
        state: "ready",
        owned: true,
        managerSessionId: "manager",
        createdAt: wallAt,
        updatedAt: wallAt,
        leaseExpiresAt: 8_640_000_000_000_000 - 1,
        lastWorkerActivityAt: 1_000,
        idleDeadlineAt: 8_640_000_000_000_000 - 1,
        checkpointDeadlineAt: 8_640_000_000_000_000 - 1,
        checkpointLastAttemptAt: 8_640_000_000_000_000 - 1,
      });
      state.workers.push({
        id: "stopped-worker",
        runId: "stopped-run",
        harness: "pi",
        backend: "systemd",
        role: "advisor",
        task: "already done",
        cwd: "/tmp",
        state: "stopped",
        owned: true,
        managerSessionId: "manager",
        createdAt: wallAt,
        updatedAt: wallAt,
        leaseExpiresAt: 11_000,
        checkpointDeadlineAt: 31_000,
        stoppedAt: wallAt,
      });
    });

    // A legacy/reboot baseline is observational for one pass before it can
    // compare a full awake interval.
    wallAt += 60_000;
    monotonicAt += 60_000;
    const established = await store.mutateConditionallyWithSnapshot((state) => ({ value: state.lifecycleClock?.baselineOnly, changed: false }));
    assert.equal(established.value, undefined);

    // One second of actual execution and one hour asleep: CLOCK_MONOTONIC
    // advances only for the former, so the one-hour wall-clock gap is rebased.
    wallAt += 3_601_000;
    monotonicAt += 1_000;
    const afterWake = await store.mutateConditionallyWithSnapshot((state) => ({
      value: structuredClone(state.workers),
      changed: false,
    }));
    const live = afterWake.value.find((worker) => worker.id === "live-worker")!;
    const paused = afterWake.value.find((worker) => worker.id === "boss-paused-worker")!;
    const stopped = afterWake.value.find((worker) => worker.id === "stopped-worker")!;

    assert.equal(live.lastWorkerActivityAt, 3_601_000);
    assert.equal(live.leaseExpiresAt, 3_711_000);
    assert.equal(live.idleDeadlineAt, 3_721_000);
    assert.equal(live.checkpointDeadlineAt, 3_731_000);
    assert.equal(live.checkpointLastAttemptAt, 3_600_500);
    assert.equal(cleanupReason(live, wallAt), undefined, "sleep must not consume checkpoint grace");
    assert.equal(paused.lastWorkerActivityAt, 1_000, "Boss pause fences must remain untouched");
    assert.equal(paused.leaseExpiresAt, 8_640_000_000_000_000 - 1);
    assert.equal(paused.idleDeadlineAt, 8_640_000_000_000_000 - 1);
    assert.equal(paused.checkpointDeadlineAt, 8_640_000_000_000_000 - 1);
    assert.equal(paused.checkpointLastAttemptAt, 8_640_000_000_000_000 - 1);
    assert.equal(stopped.checkpointDeadlineAt, 31_000, "terminal retention remains based on wall time");
    assert.ok(afterWake.state.activeFeatures?.includes(SUSPEND_SAFE_LIFECYCLE_FEATURE));

    wallAt += 70_000;
    monotonicAt += 70_000;
    const afterGrace = await store.mutateConditionallyWithSnapshot((state) => ({
      value: cleanupReason(state.workers.find((worker) => worker.id === "live-worker")!, wallAt),
      changed: false,
    }));
    assert.match(afterGrace.value ?? "", /checkpoint grace expired/);

    bootId = "00000000-0000-0000-0000-000000000002";
    wallAt += 3_600_000;
    monotonicAt += 1_000;
    const afterBootChange = await store.mutateConditionallyWithSnapshot((state) => ({
      value: state.workers.find((worker) => worker.id === "live-worker")!.checkpointDeadlineAt,
      changed: false,
    }));
    assert.equal(afterBootChange.value, 3_731_000, "a reboot must not invent a suspend duration from incomparable clocks");
    assert.equal(afterBootChange.state.lifecycleClock?.baselineOnly, true, "the first post-reboot cleanup must only establish a baseline");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
