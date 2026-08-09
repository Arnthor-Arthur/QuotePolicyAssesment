import { assessRisk } from './riskEngine';
import { loadKnowledgeBase } from './kbLoader';
import type { KnowledgeBase } from './types/kb';

// A small, self-contained KB fixture — deliberately uses factor ids/fields the engine has
// never seen before, to demonstrate assessRisk has no special-casing for any specific factor.
const kb: KnowledgeBase = {
    version: 'test-1.0.0',
    basePremium: 100,
    coverageLoadFactor: 1,
    riskBands: {
        STANDARD: { min: 0, max: 10, multiplier: 1 },
        ELEVATED: { min: 11, max: 30, multiplier: 1.5 },
        HIGH_RISK: { min: 31, max: 999, multiplier: 2 },
    },
    factors: [
        {
            id: 'age_risk',
            description: 'Older than 60',
            condition: { field: 'age', operator: 'gt', value: 60 },
            points: 5,
        },
        {
            id: 'claims_count',
            description: 'Each previous claim',
            condition: { field: 'previousClaims', operator: 'gte', value: 1 },
            points: 5,
            perOccurrence: true,
        },
        {
            id: 'flat_and_expensive',
            description: 'Flat worth over 100k',
            condition: {
                allOf: [
                    { field: 'propertyType', operator: 'eq', value: 'Flat' },
                    { field: 'propertyValue', operator: 'gt', value: 100000 },
                ],
            },
            points: 20,
        },
        {
            id: 'risky_postcode',
            description: 'Postcode in a flagged area',
            condition: {
                anyOf: [
                    { field: 'postcode', operator: 'startsWith', value: 'EX' },
                    { field: 'postcode', operator: 'startsWith', value: 'PL' },
                ],
            },
            points: 8,
        },
    ],
};

const baseline = {
    age: 30,
    previousClaims: 0,
    propertyType: 'House',
    propertyValue: 50000,
    postcode: 'LN1 1AA',
};

describe('assessRisk — risk bands', () => {
    test('STANDARD: no factor matches, riskScore 0', () => {
        const result = assessRisk(baseline, kb);
        expect(result).toEqual({ riskScore: 0, riskBand: 'STANDARD', appliedFactors: [] });
    });

    test('ELEVATED: two matched factors land the score in the middle band', () => {
        const result = assessRisk({ ...baseline, age: 70, postcode: 'EX4 1AB' }, kb);
        expect(result.riskScore).toBe(13); // age_risk (5) + risky_postcode (8)
        expect(result.riskBand).toBe('ELEVATED');
        expect(result.appliedFactors).toEqual(
            expect.arrayContaining([
                { id: 'age_risk', description: 'Older than 60', points: 5 },
                { id: 'risky_postcode', description: 'Postcode in a flagged area', points: 8 },
            ]),
        );
        expect(result.appliedFactors).toHaveLength(2);
    });

    test('HIGH_RISK: compound factor plus scaled perOccurrence factor push the score over 30', () => {
        const result = assessRisk(
            { ...baseline, previousClaims: 3, propertyType: 'Flat', propertyValue: 200000 },
            kb,
        );
        // flat_and_expensive (20) + claims_count (5 * 3 occurrences = 15)
        expect(result.riskScore).toBe(35);
        expect(result.riskBand).toBe('HIGH_RISK');
    });
});

describe('assessRisk — perOccurrence scaling', () => {
    test('points scale with the count on the same field the condition inspects', () => {
        const oneClaim = assessRisk({ ...baseline, previousClaims: 1 }, kb);
        const fourClaims = assessRisk({ ...baseline, previousClaims: 4 }, kb);

        expect(oneClaim.appliedFactors).toEqual([
            { id: 'claims_count', description: 'Each previous claim', points: 5 },
        ]);
        expect(fourClaims.appliedFactors).toEqual([
            { id: 'claims_count', description: 'Each previous claim', points: 20 },
        ]);
    });

    test('a perOccurrence factor that does not match contributes nothing', () => {
        const result = assessRisk({ ...baseline, previousClaims: 0 }, kb);
        expect(result.appliedFactors).toEqual([]);
    });
});

describe('assessRisk — compound conditions', () => {
    test('allOf: only applies once every sub-condition holds', () => {
        const bothTrue = assessRisk({ ...baseline, propertyType: 'Flat', propertyValue: 200000 }, kb);
        const onlyOneTrue = assessRisk({ ...baseline, propertyType: 'Flat', propertyValue: 50000 }, kb);

        expect(bothTrue.appliedFactors.map((f) => f.id)).toContain('flat_and_expensive');
        expect(onlyOneTrue.appliedFactors.map((f) => f.id)).not.toContain('flat_and_expensive');
    });

    test('anyOf: applies once any sub-condition holds', () => {
        const matchesFirst = assessRisk({ ...baseline, postcode: 'EX4 1AB' }, kb);
        const matchesSecond = assessRisk({ ...baseline, postcode: 'PL1 2CD' }, kb);
        const matchesNeither = assessRisk({ ...baseline, postcode: 'LN1 1AA' }, kb);

        expect(matchesFirst.appliedFactors.map((f) => f.id)).toContain('risky_postcode');
        expect(matchesSecond.appliedFactors.map((f) => f.id)).toContain('risky_postcode');
        expect(matchesNeither.appliedFactors.map((f) => f.id)).not.toContain('risky_postcode');
    });
});

describe('assessRisk — misconfigured KB', () => {
    test('throws rather than guessing when no band covers the resulting score', () => {
        const gappyKb: KnowledgeBase = {
            ...kb,
            riskBands: {
                ...kb.riskBands,
                STANDARD: { min: 0, max: 2, multiplier: 1 },
            },
        };
        // age_risk (5) falls in the 3-10 gap left between STANDARD's new max and ELEVATED's min.
        expect(() => assessRisk({ ...baseline, age: 70 }, gappyKb)).toThrow(
            /does not fall within any configured risk band/,
        );
    });
});

// Same three bands and perOccurrence behaviour, but against the real, checked-in KB
// rather than the fixture above — catches drift between risk-kb.json and these tests.
describe('assessRisk — against the real risk-kb.json', () => {
    const realKb = loadKnowledgeBase();
    const realBaseline = {
        age: 40,
        previousClaims: 0,
        propertyType: 'House',
        propertyValue: 200000,
        postcode: 'LN1 1AA',
    };

    test('STANDARD: no factor matches', () => {
        const result = assessRisk(realBaseline, realKb);
        expect(result).toEqual({ riskScore: 0, riskBand: 'STANDARD', appliedFactors: [] });
    });

    test('ELEVATED: elderly applicant with a high-value property', () => {
        const result = assessRisk({ ...realBaseline, age: 80, propertyValue: 800000 }, realKb);
        expect(result.riskScore).toBe(45); // age_young_elderly (20) + property_value_high (25)
        expect(result.riskBand).toBe('ELEVATED');
    });

    test('HIGH_RISK: 5 previous claims scales previous_claims_high past the top threshold', () => {
        const result = assessRisk({ ...realBaseline, previousClaims: 5 }, realKb);
        expect(result.riskScore).toBe(150); // 30 points * 5 occurrences
        expect(result.riskBand).toBe('HIGH_RISK');
        expect(result.appliedFactors).toEqual([
            { id: 'previous_claims_high', description: '3 or more previous claims', points: 150 },
        ]);
    });

    test('perOccurrence: multiple claims in the low band scale linearly with the count', () => {
        const result = assessRisk({ ...realBaseline, previousClaims: 2 }, realKb);
        expect(result.appliedFactors).toEqual([
            { id: 'previous_claims_low', description: '1–2 previous claims', points: 30 },
        ]);
        expect(result.riskScore).toBe(30); // 15 points * 2 occurrences
        expect(result.riskBand).toBe('ELEVATED');
    });
});
