# Orc Boss

Orc Boss is the trusted-local Boss workflow and cross-harness Agent Intercom Orchestrator for independent coding agents. Different agents build, challenge, and re-check each other's work so "done" gets verified instead of taken on faith.

## The Basic Loop

1. The manager defines the task, evidence, limits, and worker ownership.
2. A builder implements the task and claims it is finished.
3. A challenger tries to prove that it is not finished.
4. The builder fixes the objection or proves it wrong.
5. The manager repeats the exchange while it is still improving the work.
6. The manager verifies the evidence and either finishes or starts another bounded assignment/review pass.

The builder saying `done` starts the review. It does not end the run. Using different models and harnesses for the builder and the challenger creates more possible answers and makes instant self-agreement less likely.

## Start Here

- [Orc Boss Installation and Onboarding](docs/boss-installation.md) — required stack, preview/apply setup, role preferences, diagnostics, and first-run smoke.
- [Creating and Supervising Worker Agents](docs/creating-and-supervising-worker-agents.md) — installation, harness restrictions, aliases, worker setup, permissions, evidence, and cleanup.
- [Example Manager Prompt](docs/example-manager-prompt.md) — a reusable prompt for a Pi manager supervising builders, challengers, and proof advisors.
- [Trusted-local Boss V1](docs/boss-trusted-local-v1.md) — current behavior, evidence boundary, concurrency, handles, and proof lifecycle.
- [I Got Tired of AI Saying It Was Done When It Wasn't](docs/why-cross-harness-orchestration.md) — how the idea started.
- [Delegated managers](docs/delegated-managers.md) — bounded, incarnation-bound hierarchical delegation for explicitly authorized Pi coworkers.

## Install

**Requires Linux with a working systemd user manager.** (No macOS/Windows support.)

### 1. Install Pi

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
# or
curl -fsSL https://pi.dev/install.sh | sh
```

### 2. Install Orc Boss and its dependencies

Ordinary cross-harness fleet use (`agent_fleet`) needs only two packages:

```bash
pi install npm:@dataforxyz/agent-intercom-pi
pi install npm:@dataforxyz/orcboss
```

| Extension | Purpose |
|---|---|
| [`@dataforxyz/agent-intercom-pi`](https://github.com/dataforxyz/agent-intercom-pi) | Intercom control plane so coworkers can message the manager |
| [`@dataforxyz/orcboss`](https://github.com/dataforxyz/orcboss) | This package — `agent_fleet` and `boss` tools |

**Trusted-local `boss` runs also need two more.** Don't hand-install these piecemeal — run `agent-intercom-boss-setup --plan` after step 2 and it will print the exact missing-resource commands (it also confirms the `pi-extensions` entry actually exposes the `pi-ralph-wiggum/index.ts` entrypoint, which a plain install does not guarantee). See [Orc Boss Installation](docs/boss-installation.md).

| Extension | Purpose |
|---|---|
| `pi-ralph-wiggum/index.ts` from [`dataforxyz/pi-extensions`](https://github.com/dataforxyz/pi-extensions) | Bounded iterative dev loops |
| [`dataforxyz/pi-return-on`](https://github.com/dataforxyz/pi-return-on) | Condition watchers/timers |

To install the harness adapters for spawning Codex, Claude, or OpenCode coworkers, see the [worker guide](docs/creating-and-supervising-worker-agents.md#install-the-adapters).

### Using the latest development version from Git instead of npm

`agent-intercom-pi` and `orcboss` can each be pinned to Git instead of the last npm release:

```bash
pi install git:github.com/dataforxyz/agent-intercom-pi
pi install git:github.com/dataforxyz/orcboss
```

Pin to a specific tag with `pi install git:github.com/dataforxyz/orcboss@vX.Y.Z`. Dirty or explicitly pinned Git installs are never replaced automatically by `agent_fleet({ action: "update" })`.

For a one-run test without installing anything, from a clone of this repo:

```bash
pi -e ./src/index.ts
```

### 3. Reload and verify

Restart Pi, or run `/reload` in every already-open Pi session, then confirm:

```bash
pi list
```

```typescript
agent_fleet({ action: "doctor" })
agent_fleet({ action: "versions" })
agent_fleet({ action: "capabilities" })
```

You should also have `/agents`, `/agents-new`, `/agents-config`, `/agents-models`, and `/agents-cleanup` — see the [worker guide](docs/creating-and-supervising-worker-agents.md) for what each does. To check and update the whole adapter family without clobbering Git installs, use `agent_fleet({ action: "update" })` (preview) and `agent_fleet({ action: "update", execute: true })` (apply); see the worker guide for details on what `versions` and `update` report.

## Trusted-local Boss runs

After installing the stack above, onboard once with `agent-intercom-boss-setup --plan` / `--apply` (role model/effort choices, preview-first, never overwrites unrelated Pi settings), reload Pi, then check `/boss doctor`. Full walkthrough: [Orc Boss installation](docs/boss-installation.md).

**Boss teams are Pi-only** (Manager, Worker, Scout, Adversary all run as Pi peers, for an exact shared team contract); ordinary `agent_fleet` coworkers can still be Pi, Codex, Claude, or OpenCode.

A top-level Pi Controller creates and manages concurrent logical Boss teams through the LLM-callable `boss` tool. `doctor` and `plan` are read-only. Every persisted run gets a deterministic handle such as `boss-k3m7...` that later commands accept in place of the exact run ID.

```typescript
boss({ action: "plan" })
boss({ action: "doctor" })
boss({ action: "create", goal: "Implement and verify the requested feature" })
boss({ action: "create", goal: "Implement in the assigned worktree", requirements: { worktree: "write", edit: true } })
boss({ action: "status", bossRunId: "<handle-or-exact-run-id>" })
boss({ action: "approve", bossRunId: "<handle-or-exact-run-id>", note: "Reviewed evidence is sufficient" })
boss({ action: "reject", bossRunId: "<handle-or-exact-run-id>", note: "Missing required smoke evidence" })
```
`pause`, `resume`, `proof`, and `cancel` are also available. The interactive `/boss` command remains available for direct user control.

**TRUSTED LOCAL MODE — same-user agents and local files are trusted; evidence is advisory, not tamper-proof.**

Coworkers launch in transient systemd user services (`KillMode=control-group`) with a leased, owned lifecycle, and built-in roles get named permission profiles (`review-readonly`, `builder-restricted`, or opt-in `trusted`), with optional `bwrap`-based hardening. See [Creating and Supervising Worker Agents](docs/creating-and-supervising-worker-agents.md) for the full lifecycle and permission-profile details, and [Trusted-local Boss V1](docs/boss-trusted-local-v1.md) for the requirements contract, capability-report shape, and evidence/readiness semantics.

See [`examples/orchestrator-config.json`](examples/orchestrator-config.json) and the bundled Agent Skill for the current API and limitations.

## Agent Intercom Harnesses

| Harness | Repository | Current best use |
|---|---|---|
| Pi | [`agent-intercom-pi`](https://github.com/dataforxyz/agent-intercom-pi) | Primary manager and proof advisor |
| OpenCode | [`agent-intercom-opencode`](https://github.com/dataforxyz/agent-intercom-opencode) | Primary manager with opt-in fleet tools, or persistent worker |
| Codex | [`agent-intercom-codex`](https://github.com/dataforxyz/agent-intercom-codex) | Wakeable builder through `coi` |
| Claude Code | [`agent-intercom-claude`](https://github.com/dataforxyz/agent-intercom-claude) | Wakeable challenger or worker through `cci` |

The [worker guide](docs/creating-and-supervising-worker-agents.md#install-the-adapters) contains the complete installation instructions for all four harnesses, including enabling OpenCode as the primary manager.

### OpenCode as primary manager

Pi and OpenCode share the same worker store and lifecycle implementation, so OpenCode can run the fleet too, via an opt-in native tool that shells out to the packaged `agent-intercom-fleet` CLI (Pi keeps richer native menus/footer; OpenCode gets the same ownership operations as tools):

```bash
npm install -g @dataforxyz/orcboss

OPENCODE_INTERCOM_FLEET=1 \
OPENCODE_INTERCOM_NAME=opencode-manager \
OPENCODE_INTERCOM_SESSION_ID=opencode-manager \
opencode
```

Only the chosen primary OpenCode manager should receive `OPENCODE_INTERCOM_FLEET=1`. See [`examples/opencode-manager-env.sh`](examples/opencode-manager-env.sh) for a reusable launcher.

## Origin and Thanks

The Agent Intercom family grew from [Nico Bailon's original `pi-intercom`](https://github.com/nicobailon/pi-intercom). Thank you to Nico and the original contributors for creating the foundation this work builds on.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the release process.

## License

Agent Intercom Orchestrator is licensed under the [GNU Affero General Public
License v3.0 or later](LICENSE) (`AGPL-3.0-or-later`). If you modify this
software and make the modified version available to users over a network, the
AGPL requires you to offer those users the corresponding source code. Versions
already published under MIT remain available under their original terms. See
[LICENSE_TRANSITION.md](LICENSE_TRANSITION.md) for the exact commit and tag boundary.
