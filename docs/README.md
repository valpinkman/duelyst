# OpenDuelyst Documentation

## Running it

- [Quick Start Guide](QUICKSTART.md)
- [Duelyst Service Architecture](ARCHITECTURE.md)
- [Building and Testing Docker Images](DOCKER.md)
- [Deploying to Coolify](DEPLOY.md)
- [Contributing to OpenDuelyst](CONTRIBUTING.md)

## Modernization

The program that took this from the 2016 CoffeeScript dump to a pnpm/TypeScript
monorepo, and the decisions behind it.

- [Plan](MODERNIZATION_PLAN.md) — the checklist and decisions log
- [Log](MODERNIZATION_LOG.md) — what was done and what it cost to learn
- [Original audit](MODERNIZATION_AUDIT.md) — the analysis and dependency graph
- [Tooling](TOOLING.md) — turborepo, oxlint, oxfmt, the pnpm catalog

## Audits

- [Backbone](BACKBONE_AUDIT.md) — what Backbone actually does here, and why
  `backfire` was the real lock-in (replaced by `firebase_sync.ts`, #51)
- [Folder reorg](REORG_AUDIT.md) — the audit behind moving `app/sdk` and
  `app/common` out to `packages/`

Upstream's AWS deployment (Terraform, ECS, RDS, CloudFront) and its
documentation were removed on 2026-08-22; this fork runs on Coolify. `git log
-- terraform` has it if you need it back.
