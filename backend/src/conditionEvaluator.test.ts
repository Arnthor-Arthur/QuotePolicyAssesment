import { evaluateCondition } from './conditionEvaluator';
import type { Condition, SimpleCondition } from './types/kb';

describe('evaluateCondition — simple operators', () => {
    test('eq: matches on exact value, string field', () => {
        const condition: Condition = { field: 'propertyType', operator: 'eq', value: 'Flat' };
        expect(evaluateCondition(condition, { propertyType: 'Flat' })).toBe(true);
        expect(evaluateCondition(condition, { propertyType: 'House' })).toBe(false);
    });

    test('gt: strictly greater than', () => {
        const condition: Condition = { field: 'propertyValue', operator: 'gt', value: 750000 };
        expect(evaluateCondition(condition, { propertyValue: 750001 })).toBe(true);
        expect(evaluateCondition(condition, { propertyValue: 750000 })).toBe(false);
        expect(evaluateCondition(condition, { propertyValue: 100 })).toBe(false);
    });

    test('gte: greater than or equal', () => {
        const condition: Condition = { field: 'previousClaims', operator: 'gte', value: 3 };
        expect(evaluateCondition(condition, { previousClaims: 3 })).toBe(true);
        expect(evaluateCondition(condition, { previousClaims: 4 })).toBe(true);
        expect(evaluateCondition(condition, { previousClaims: 2 })).toBe(false);
    });

    test('lt: strictly less than', () => {
        const condition: Condition = { field: 'age', operator: 'lt', value: 25 };
        expect(evaluateCondition(condition, { age: 24 })).toBe(true);
        expect(evaluateCondition(condition, { age: 25 })).toBe(false);
    });

    test('lte: less than or equal', () => {
        const condition: Condition = { field: 'age', operator: 'lte', value: 25 };
        expect(evaluateCondition(condition, { age: 25 })).toBe(true);
        expect(evaluateCondition(condition, { age: 26 })).toBe(false);
    });

    test('between: inclusive on both ends', () => {
        const condition: Condition = { field: 'previousClaims', operator: 'between', min: 1, max: 2 };
        expect(evaluateCondition(condition, { previousClaims: 1 })).toBe(true);
        expect(evaluateCondition(condition, { previousClaims: 2 })).toBe(true);
        expect(evaluateCondition(condition, { previousClaims: 0 })).toBe(false);
        expect(evaluateCondition(condition, { previousClaims: 3 })).toBe(false);
    });

    test('outside_range: strictly outside on both ends (boundaries are inside)', () => {
        const condition: Condition = { field: 'age', operator: 'outside_range', min: 25, max: 75 };
        expect(evaluateCondition(condition, { age: 24 })).toBe(true);
        expect(evaluateCondition(condition, { age: 76 })).toBe(true);
        expect(evaluateCondition(condition, { age: 25 })).toBe(false);
        expect(evaluateCondition(condition, { age: 75 })).toBe(false);
        expect(evaluateCondition(condition, { age: 50 })).toBe(false);
    });

    test('startsWith: string prefix match', () => {
        const condition: Condition = { field: 'postcode', operator: 'startsWith', value: 'EX' };
        expect(evaluateCondition(condition, { postcode: 'EX4 1AB' })).toBe(true);
        expect(evaluateCondition(condition, { postcode: 'PL1 2CD' })).toBe(false);
    });

    test('missing input field evaluates to false rather than throwing', () => {
        const condition: Condition = { field: 'age', operator: 'gt', value: 25 };
        expect(evaluateCondition(condition, {})).toBe(false);
    });

    test('unrecognized operator throws rather than silently failing', () => {
        const condition = { field: 'age', operator: 'not_a_real_operator', value: 1 } as unknown as SimpleCondition;
        expect(() => evaluateCondition(condition, { age: 1 })).toThrow(/Unhandled condition operator/);
    });
});

describe('evaluateCondition — compound conditions', () => {
    test('allOf: true only when every sub-condition is true', () => {
        const condition: Condition = {
            allOf: [
                { field: 'propertyType', operator: 'eq', value: 'Flat' },
                { field: 'propertyValue', operator: 'gt', value: 500000 },
            ],
        };
        expect(evaluateCondition(condition, { propertyType: 'Flat', propertyValue: 600000 })).toBe(true);
        expect(evaluateCondition(condition, { propertyType: 'Flat', propertyValue: 400000 })).toBe(false);
        expect(evaluateCondition(condition, { propertyType: 'House', propertyValue: 600000 })).toBe(false);
    });

    test('anyOf: true when at least one sub-condition is true', () => {
        const condition: Condition = {
            anyOf: [
                { field: 'postcode', operator: 'startsWith', value: 'EX' },
                { field: 'postcode', operator: 'startsWith', value: 'PL' },
            ],
        };
        expect(evaluateCondition(condition, { postcode: 'EX4 1AB' })).toBe(true);
        expect(evaluateCondition(condition, { postcode: 'PL1 2CD' })).toBe(true);
        expect(evaluateCondition(condition, { postcode: 'LN1 1AA' })).toBe(false);
    });

    test('nested allOf containing an anyOf: both branches must hold', () => {
        const condition: Condition = {
            allOf: [
                { field: 'propertyType', operator: 'eq', value: 'Flat' },
                {
                    anyOf: [
                        { field: 'postcode', operator: 'startsWith', value: 'EX' },
                        { field: 'postcode', operator: 'startsWith', value: 'PL' },
                    ],
                },
            ],
        };
        expect(evaluateCondition(condition, { propertyType: 'Flat', postcode: 'EX4 1AB' })).toBe(true);
        expect(evaluateCondition(condition, { propertyType: 'Flat', postcode: 'PL1 2CD' })).toBe(true);
        // Flat, but postcode matches neither branch of the anyOf.
        expect(evaluateCondition(condition, { propertyType: 'Flat', postcode: 'LN1 1AA' })).toBe(false);
        // Postcode matches, but propertyType fails the allOf.
        expect(evaluateCondition(condition, { propertyType: 'House', postcode: 'EX4 1AB' })).toBe(false);
    });

    test('nested anyOf containing an allOf: either branch may hold', () => {
        const condition: Condition = {
            anyOf: [
                { field: 'previousClaims', operator: 'gte', value: 3 },
                {
                    allOf: [
                        { field: 'propertyType', operator: 'eq', value: 'Flat' },
                        { field: 'propertyValue', operator: 'gt', value: 500000 },
                    ],
                },
            ],
        };
        // First branch alone satisfies it.
        expect(evaluateCondition(condition, { previousClaims: 3, propertyType: 'House', propertyValue: 0 })).toBe(true);
        // First branch fails, but nested allOf fully holds.
        expect(evaluateCondition(condition, { previousClaims: 0, propertyType: 'Flat', propertyValue: 600000 })).toBe(true);
        // First branch fails, and nested allOf only half holds.
        expect(evaluateCondition(condition, { previousClaims: 0, propertyType: 'Flat', propertyValue: 100000 })).toBe(false);
        // Neither branch holds at all.
        expect(evaluateCondition(condition, { previousClaims: 0, propertyType: 'House', propertyValue: 600000 })).toBe(false);
    });
});
