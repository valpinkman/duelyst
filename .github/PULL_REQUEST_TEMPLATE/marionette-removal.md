<!--
Marionette/jQuery removal milestone. Rules: docs/BACKBONE_REMOVAL_PLAN.md §11.
Base branch MUST be `marionette-removal`, never `main`.
-->

Closes #

<!-- EXACTLY ONE issue, or none if this is one of several PRs for a single issue.
     A PR must never close more than one issue. -->

## What this changes

<!-- The end-to-end behaviour, not a layer-by-layer walkthrough. -->

## Acceptance criteria

<!-- Copy the checklist from the issue. Tick what is met.
     Anything NOT met stays unticked with a one-line reason. Do not silently narrow scope. -->

- [ ] ...

## Test evidence

<!-- Pick the row that matches this change (§11.3) and delete the rest. -->

- [ ] **Analysis only** — no runtime change; the deliverable is a doc diff
- [ ] **Build/tooling** — negative test included: the check demonstrably fails when it should
- [ ] **Screen tour green** — `pnpm test:e2e`
- [ ] **Component test** added (vitest + happy-dom): render, Backbone binding, teardown
- [ ] **No screen changed** — for data-layer work, that is the assertion
- [ ] **Dependency gone** from `VENDOR_FILES` and `package.json`

### Hand-tested

<!-- Required for anything the tour cannot reach: drag-and-drop gestures, real-money shop flows,
     animation correctness, booster-pack opening, seeded inventory.
     If you could not hand-test, say so and leave this PR as a DRAFT for a human.
     Do NOT tick a criterion you did not verify. -->

- [ ] n/a — fully covered by the tour

## Gates

- [ ] `pnpm build`
- [ ] `pnpm test:unit`
- [ ] `pnpm typecheck` (CI gate, must stay at zero)
- [ ] `pnpm lint` · `pnpm format:check`
- [ ] `pnpm check:undefined-names` (required after any codemod)

## Checklist

- [ ] Base branch is `marionette-removal`
- [ ] Branch named `mr/<issue>-<slug>`
- [ ] Rebased onto `marionette-removal` (not merged into)
- [ ] One commit per logical step
- [ ] Closes at most one issue
