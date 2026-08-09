**asked:** based on kb/risk-kb.json file evaluate type define in backend/src/type/kb.ts

**generated:** comparison between file against type define: missed some interface

**what i changed and why**: add the missing interface to avoid error when loading KB file or doing calculation

**asked:** Implement backend/src/kbLoader.ts that loads and validates risk-kb.json against a Zod schema derived from the KB types, fails loudly on malformed KB.

**generated:** backend/src/kbLoader.ts file containing zod schema and validation for JSON structure against the zod schema

**what i changed and why:** update on type/kb to add undefined possibilties to optionnal value to avoid friction when validating the file

**asked:** Implement backend/src/conditionEvaluator.ts This is a pure function evaluateCondition(condition, input): boolean that handles all operators plus allOf/anyOf recursion, with no knowledge of specific factor ids. Write Jest tests for the evaluator covering every operator, a nested allOf, and a nested anyOf.

**generated:** backend/src/conditionEvaluator containing two method:
- evaluateCondition to check what's type of condition (allof|anyof|simple)
- evaluateSimpleCondition to check what type of operator is in the condition