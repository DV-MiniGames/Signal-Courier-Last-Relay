---
name: game-production-baseline
description: Set up or run a reusable small-game production workflow from product framing and role assignment through a playable vertical slice, content and feel passes, playtesting, release media, and retrospective. Use when starting a new game, turning a prototype into a managed project, or deciding the next production phase.
---

# Game Production Baseline

Build evidence in playable increments. Preserve the user's genre, platform, engine, budget, and release intent; this skill supplies a process, not a game concept.

## Start

1. For an existing repository, inspect guidance, Git state, build, project records, and available tools. For a repository that does not exist yet, inspect the intended parent path, parent Git boundary, remote-name conflicts, and tool access before creating it.
2. If a harness or template repository was copied, determine whether the user intends a new product repository. When that intent is explicit, resolve the copied repository's exact path, remove only its `.git` metadata, initialize a new repository, and preserve required harness files and attribution.
3. Create one tracked task with an observable outcome, explicit non-goals, completion conditions, and verification plan. Keep one active production task per executor.
4. Classify the request with one primary phase and any prerequisite phases: `bootstrap`, `preproduction`, `vertical-slice`, `content`, `feel`, `playtest`, `release`, or `retrospective`. Read the relevant sections in [production-loop.md](references/production-loop.md).

## Coordinate roles

Use the minimum roles needed for the current risk. The coordinator owns scope, integration, evidence, and the final gate; specialist agents advise or implement within bounded deliverables. Read [roles.md](references/roles.md) before delegating or defining handoffs.

Run independent work in parallel only when outputs do not edit the same files and can be reviewed separately. Do not use role count as a progress measure.

## Execute

- Lock the player promise, core loop, failure state, target session length, platform, input, and exclusions before selecting tools or assets.
- Choose engine and libraries from project constraints. Record a reversible decision when the choice changes build, deployment, authoring, or test strategy.
- Prove the riskiest player action in the smallest playable vertical slice before adding content breadth.
- Separate simulation rules from rendering, input, audio, persistence, and platform adapters where the chosen stack permits it.
- Treat level design, feedback, sound, onboarding, accessibility, and performance as gameplay work with measurable acceptance conditions.
- Prefer project-owned or procedural core identity assets. Use external assets only after verifying source, license, redistribution, modification, attribution, and stored-file identity.
- Keep public copy factual: state what the player does, how to run it, controls, current scope, and known limits. Avoid generated-sounding slogans and abstract promotional filler.

## Verify and decide

Use the evidence ladder in [verification.md](references/verification.md). A build or unit test alone does not prove that a game plays correctly.

At every phase gate choose exactly one:

- `Pass`: evidence supports the phase claim; continue.
- `Repair`: keep the concept and fix a bounded defect.
- `Reframe`: change a product or technical assumption and record the decision.
- `Stop`: the expected value no longer justifies further work.

Do not mark human comprehension, fun, challenge, or replay intent as proven by automated agents. Record those as pending until an uncoached player test is completed.

## Learn and package

After a verified task:

1. Record result, evidence, remaining risk, and follow-up.
2. Store one-off observations in the task, durable project facts in bounded memory, consequential choices in decisions, and repeated procedures in skills.
3. Read [lessons.md](references/lessons.md) when diagnosing level flow, audiovisual capture, public presentation, or process rework.
4. For a new repository, use `scripts/bootstrap-game-workspace.ps1 -Target <repository>` to copy the starter workspace without overwriting existing files. Replace all placeholders and remove unused templates.

## Completion contract

- The requested playable or documentary artifact exists.
- Automated checks appropriate to the stack pass.
- Gameplay changes have input, state, visual, and error evidence; audio changes add audible or measured evidence.
- A clean production build succeeds and third-party assets are accounted for.
- The minimum task record, risks, and next action are current. Update boards, memory, and decisions when the repository uses those layers.
- The result is committed on a valid work branch when repository workflow calls for a commit.
