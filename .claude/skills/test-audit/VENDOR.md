# Vendored from openclaw

This skill is adapted from the `test-audit` skill in
[openclaw/openclaw](https://github.com/openclaw/openclaw) (MIT).

- Origin:
  <https://github.com/openclaw/openclaw/blob/eb1b48c58b61dec3cc273587d44e4f9a7eaa29f9/.agents/skills/test-audit/SKILL.md>
- Commit: `eb1b48c58b61dec3cc273587d44e4f9a7eaa29f9`
- Files taken: `SKILL.md`, `CAMPAIGN.md`
- License: [LICENSE](LICENSE) is OpenClaw's MIT copyright and permission
  notice, copied from that commit. It covers the portions of this directory
  taken from OpenClaw.

Adapted to this repository: taken via the adapted copy in the
[cdk-terrain](https://github.com/open-constructs/cdk-terrain) monorepo, then
rewritten for this action. `SKILL.md` and `CAMPAIGN.md` keep openclaw's
method and value bar; this repo's test tiers and CI routing, contracts worth
retaining, campaign lanes, and npm, Vitest, and Biome commands replace the
openclaw- and monorepo-specific ones. `TIERS.md` comes from cdk-terrain,
not openclaw, and is rewritten for this repo.
