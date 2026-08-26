# Contributing

## Releasing

Releases are automated from version tags. Before changing the version, complete the documented typecheck, focused/full tests, package-content validation, clean-install smoke, live trusted-local Boss smoke, and independent final review. Update `package.json`, the lockfile when present, and `CHANGELOG.md` together on `main`; verify `npm pack --dry-run --json` includes the bundled exact-commit Core runtime plus Boss setup/docs assets. Then push an annotated tag that exactly matches the package version:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The release workflow verifies that the tag points into `main`, runs typecheck and
tests, publishes the public npm package with trusted OIDC provenance, and creates
the GitHub Release. Existing npm versions and GitHub Releases are skipped safely
when a workflow is rerun.
