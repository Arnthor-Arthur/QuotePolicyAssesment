## Architecture

The system splits into three independent layers: an Angular 17 standalone frontend, a Node.js Lambda-style handler, and risk-kb.json as the single source of truth for scoring.
The handler is deliberately thin with Zod validation, then delegation to kbLoader, riskEngine, and premiumCalculator, each independently unit-tested.
No layer calls an external service; scoring is fully deterministic and offline.

## KB design

The core design goal was a scoring engine with zero factor-specific code.
Conditions are represented recursively: a SimpleCondition (field, operator, value/min/max) or a CompoundCondition (allOf/anyOf arrays of conditions).
The evaluator resolves operators through a registry (Record<Operator, fn>) rather than a switch statement, so adding an operator or a factor is a data change, not a logic change.
This was proven by implementing a real compound factor ("Flat AND value > £500k") and a postcode-prefix factor ("EX"/"PL" flood zones) purely as KB entries.

Postcode is treated as a UK format (regex-validated, not geocoded) since the brief's £ pricing and postcode-area examples are UK-specific; only the area prefix is inspected, keeping the engine simple and offline.

## What I'd improve with more time

KB versioning is currently a single active file with a version string echoed in responses.
In production I'd store KB snapshots (S3 or a small table) keyed by version with a Zod-validated schema gate on load, so the Lambda can pin a specific KB version per request, support rollback.
I would make a full audit trail of which rules produced a historical quote without ever requiring an engine redeploy.
