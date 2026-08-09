import { isAllOf, isAnyOf } from './types/kb';
import type { Condition, ConditionOperator, SimpleCondition } from './types/kb';

export type EvaluationInput = Record<string, string | number>;

type OperatorFn = (fieldValue: string | number, condition: SimpleCondition) => boolean;

// Record<ConditionOperator, ...> (a complete mapped type, not an index signature) means
// TypeScript itself rejects this object if a new operator is ever added to the union
// without a matching entry here — the same exhaustiveness guarantee the old switch's
// `default: never` case gave, just enforced one line closer to the type definition.
const OPERATORS: Record<ConditionOperator, OperatorFn> = {
    eq: (fieldValue, condition) => fieldValue === condition.value,
    gt: (fieldValue, condition) =>
        typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue > condition.value,
    gte: (fieldValue, condition) =>
        typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue >= condition.value,
    lt: (fieldValue, condition) =>
        typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue < condition.value,
    lte: (fieldValue, condition) =>
        typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue <= condition.value,
    between: (fieldValue, condition) =>
        typeof fieldValue === 'number' &&
        condition.min !== undefined &&
        condition.max !== undefined &&
        fieldValue >= condition.min &&
        fieldValue <= condition.max,
    outside_range: (fieldValue, condition) =>
        typeof fieldValue === 'number' &&
        condition.min !== undefined &&
        condition.max !== undefined &&
        (fieldValue < condition.min || fieldValue > condition.max),
    startsWith: (fieldValue, condition) =>
        typeof fieldValue === 'string' && typeof condition.value === 'string' && fieldValue.startsWith(condition.value),
};

export function evaluateCondition(condition: Condition, input: EvaluationInput): boolean {
    if (isAllOf(condition)) {
        return condition.allOf.every((sub) => evaluateCondition(sub, input));
    }
    if (isAnyOf(condition)) {
        return condition.anyOf.some((sub) => evaluateCondition(sub, input));
    }
    return evaluateSimpleCondition(condition, input);
}

function evaluateSimpleCondition(condition: SimpleCondition, input: EvaluationInput): boolean {
    const fieldValue = input[condition.field];
    if (fieldValue === undefined) {
        return false;
    }

    // Bypassing the type system (e.g. a malformed KB that skipped Zod validation) is the
    // only way to reach a missing entry here — guarded explicitly so it still fails with
    // a clear message instead of a generic "not a function" TypeError.
    const operatorFn = OPERATORS[condition.operator];
    if (!operatorFn) {
        throw new Error(`Unhandled condition operator: ${condition.operator}`);
    }
    return operatorFn(fieldValue, condition);
}
