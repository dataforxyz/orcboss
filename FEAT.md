# FEAT: Ignore generated local dependency links

## ORCBoss scope

The root `.gitignore` already ignores dependency directories with `node_modules/`, but that pattern does not ignore a worktree's generated `node_modules` symlink. Replace it with `node_modules`, which matches both directories and symlinks.

The existing `.agent/` blanket rule also hid authored specifications, verification scripts, fixtures, and local media. Remove that broad rule; retain the existing `*.log` rule so generated log files stay ignored while other `.agent` content remains visible.

## Validation

- Confirm the current primary branch is `origin/main` and the feature starts from its current tip.
- Verify the canonical checkout has a `node_modules` directory and a separate feature worktree has a `node_modules` symlink to it.
- Use `git check-ignore` to verify both directory and symlink paths are ignored, log files are ignored, and authored `.agent` examples remain visible.

No dependency installation, build, deployment, or merge is part of this change.
