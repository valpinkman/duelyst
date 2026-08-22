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
  `backfire` is the real lock-in
- [Folder reorg](REORG_AUDIT.md) — why `app/sdk` and `app/common` stayed where
  they are

Upstream's AWS deployment (Terraform, ECS, RDS, CloudFront) and its
documentation were removed on 2026-08-22; this fork runs on Coolify. `git log
-- terraform` has it if you need it back.
