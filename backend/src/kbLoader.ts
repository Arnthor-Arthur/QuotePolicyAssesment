import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type {
    AllOfCondition,
    AnyOfCondition,
    Condition,
    ConditionOperator,
    Factor,
    KnowledgeBase,
    RiskBand,
} from './types/kb';

const conditionOperatorSchema: z.ZodType<ConditionOperator> = z.enum([
    'eq',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'outside_range',
    'startsWith',
]);

const simpleConditionSchema = z
    .object({
        field: z.string(),
        operator: conditionOperatorSchema,
        value: z.union([z.string(), z.number()]).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
    })
    .strict();

// allOf/anyOf reference Condition recursively, so the union must be built lazily.
const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
    z.union([simpleConditionSchema, allOfConditionSchema, anyOfConditionSchema]),
);

const allOfConditionSchema: z.ZodType<AllOfCondition> = z
    .object({
        allOf: z.array(conditionSchema).min(1),
    })
    .strict();

const anyOfConditionSchema: z.ZodType<AnyOfCondition> = z
    .object({
        anyOf: z.array(conditionSchema).min(1),
    })
    .strict();

const riskBandSchema: z.ZodType<RiskBand> = z
    .object({
        min: z.number(),
        max: z.number(),
        multiplier: z.number(),
    })
    .strict();

const riskBandsSchema = z
    .object({
        STANDARD: riskBandSchema,
        ELEVATED: riskBandSchema,
        HIGH_RISK: riskBandSchema,
    })
    .strict();

const factorSchema: z.ZodType<Factor> = z
    .object({
        id: z.string(),
        description: z.string(),
        condition: conditionSchema,
        points: z.number(),
        perOccurrence: z.boolean().optional(),
    })
    .strict();

const knowledgeBaseSchema: z.ZodType<KnowledgeBase> = z
    .object({
        version: z.string(),
        basePremium: z.number(),
        coverageLoadFactor: z.number(),
        riskBands: riskBandsSchema,
        factors: z.array(factorSchema),
    })
    .strict();

/** Validates an already-parsed value against the KB schema. Throws with the full Zod issue list on mismatch. */
export function parseKnowledgeBase(rawData: unknown): KnowledgeBase {
    const result = knowledgeBaseSchema.safeParse(rawData);
    if (!result.success) {
        // treeifyError (not prettifyError) is used deliberately: prettifyError collapses
        // the allOf/anyOf/simple union into an unhelpful "Invalid input", while treeifyError
        // keeps the per-field reason (e.g. which operator/key was invalid, and where).
        const tree = z.treeifyError(result.error);
        throw new Error(`Invalid risk-kb.json:\n${JSON.stringify(tree, null, 2)}`);
    }
    return result.data;
}

const DEFAULT_KB_PATH = join(__dirname, '../../kb/risk-kb.json');

/** Reads and validates the KB file from disk. Fails closed: any read, parse, or schema error throws. */
export function loadKnowledgeBase(filePath: string = DEFAULT_KB_PATH): KnowledgeBase {
    let raw: string;
    try {
        raw = readFileSync(filePath, 'utf-8');
    } catch (err) {
        throw new Error(`Failed to read KB file at ${filePath}: ${(err as Error).message}`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Failed to parse KB file at ${filePath} as JSON: ${(err as Error).message}`);
    }

    return parseKnowledgeBase(parsed);
}
