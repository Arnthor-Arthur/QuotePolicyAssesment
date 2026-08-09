import { isAllOf, isAnyOf } from './types/kb';
import type { Condition, SimpleCondition } from './types/kb';

export type EvaluationInput = Record<string, string | number>;

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

    switch (condition.operator) {
        case 'eq':
            return fieldValue === condition.value;
        case 'gt':
            return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue > condition.value;
        case 'gte':
            return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue >= condition.value;
        case 'lt':
            return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue < condition.value;
        case 'lte':
            return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue <= condition.value;
        case 'between':
            return (
                typeof fieldValue === 'number' &&
                condition.min !== undefined &&
                condition.max !== undefined &&
                fieldValue >= condition.min &&
                fieldValue <= condition.max
            );
        case 'outside_range':
            return (
                typeof fieldValue === 'number' &&
                condition.min !== undefined &&
                condition.max !== undefined &&
                (fieldValue < condition.min || fieldValue > condition.max)
            );
        case 'startsWith':
            return typeof fieldValue === 'string' && typeof condition.value === 'string' && fieldValue.startsWith(condition.value);
        default: {
            const unhandledOperator: never = condition.operator;
            throw new Error(`Unhandled condition operator: ${unhandledOperator}`);
        }
    }
}
