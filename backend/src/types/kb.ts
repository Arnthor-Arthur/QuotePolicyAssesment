export type ConditionOperator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'outside_range' | 'startsWith';

export interface SimpleCondition {
    field: string;
    operator: ConditionOperator;
    // `| undefined` (not just `?`) so Zod's `.optional()` output — which is `T | undefined`,
    // not true optionality — satisfies these under `exactOptionalPropertyTypes`.
    value?: string | number | undefined;
    min?: number | undefined;
    max?: number | undefined;
};

export interface AllOfCondition {
    allOf: Condition[];
    anyOf?: never;
};

export interface AnyOfCondition {
    anyOf: Condition[];
    allOf?: never;
};

export type CompoundCondition = AllOfCondition | AnyOfCondition;

export type Condition = SimpleCondition | CompoundCondition;

export function isAllOf(condition: Condition): condition is AllOfCondition {
    return 'allOf' in condition && Array.isArray(condition.allOf);
}

export function isAnyOf(condition: Condition): condition is AnyOfCondition {
    return 'anyOf' in condition && Array.isArray(condition.anyOf);
}

export function isSimpleCondition(condition: Condition): condition is SimpleCondition {
    return !isAllOf(condition) && !isAnyOf(condition);
}

export interface RiskBand {
    min: number;
    max: number;
    multiplier: number;
}

export interface Factor {
    id: string;
    description: string;
    condition: Condition;
    points: number;
    perOccurrence?: boolean | undefined;
}

export type RiskBandName = 'STANDARD' | 'ELEVATED' | 'HIGH_RISK';

export interface KnowledgeBase {
    version: string;
    basePremium: number;
    coverageLoadFactor: number;
    riskBands: Record<RiskBandName, RiskBand>;
    factors: Factor[];
}