import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadKnowledgeBase, parseKnowledgeBase } from './kbLoader';

const validKb = {
    version: '1.0.0',
    basePremium: 100,
    coverageLoadFactor: 1,
    riskBands: {
        STANDARD: { min: 0, max: 10, multiplier: 1 },
        ELEVATED: { min: 11, max: 30, multiplier: 1.5 },
        HIGH_RISK: { min: 31, max: 999, multiplier: 2 },
    },
    factors: [
        {
            id: 'age_check',
            description: 'test factor',
            condition: { field: 'age', operator: 'gt', value: 18 },
            points: 5,
        },
    ],
};

describe('parseKnowledgeBase — happy path', () => {
    test('accepts a well-formed KB', () => {
        expect(parseKnowledgeBase(validKb)).toEqual(validKb);
    });
});

describe('parseKnowledgeBase — unrecognized operator guardrail', () => {
    test('rejects an unrecognized operator on a top-level simple condition', () => {
        const badKb = {
            ...validKb,
            factors: [
                {
                    ...validKb.factors[0],
                    condition: { field: 'age', operator: 'notAnOperator', value: 18 },
                },
            ],
        };

        expect(() => parseKnowledgeBase(badKb)).toThrow(/operator/i);
        expect(() => parseKnowledgeBase(badKb)).toThrow(/Invalid option/i);
    });

    test('rejects an unrecognized operator nested inside an allOf sub-condition', () => {
        const badKb = {
            ...validKb,
            factors: [
                {
                    ...validKb.factors[0],
                    condition: {
                        allOf: [
                            { field: 'age', operator: 'gt', value: 18 },
                            { field: 'propertyType', operator: 'wrongOperator', value: 'Flat' },
                        ],
                    },
                },
            ],
        };

        expect(() => parseKnowledgeBase(badKb)).toThrow(/Invalid option/i);
    });

    test('rejects an unrecognized operator nested inside an anyOf sub-condition', () => {
        const badKb = {
            ...validKb,
            factors: [
                {
                    ...validKb.factors[0],
                    condition: {
                        anyOf: [
                            { field: 'postcode', operator: 'startsWith', value: 'EX' },
                            { field: 'postcode', operator: 'endsWith', value: 'AB' },
                        ],
                    },
                },
            ],
        };

        expect(() => parseKnowledgeBase(badKb)).toThrow(/Invalid option/i);
    });
});

describe('parseKnowledgeBase — other malformed-KB rejections', () => {
    test('rejects a factor missing a required field', () => {
        const badKb = {
            ...validKb,
            factors: [{ id: 'x', description: 'd', condition: { field: 'age', operator: 'gt', value: 18 } }],
        };
        expect(() => parseKnowledgeBase(badKb)).toThrow();
    });

    test('rejects an empty allOf array', () => {
        const badKb = {
            ...validKb,
            factors: [{ ...validKb.factors[0], condition: { allOf: [] } }],
        };
        expect(() => parseKnowledgeBase(badKb)).toThrow();
    });

    test('rejects an unrecognized extra key on a factor', () => {
        const badKb = {
            ...validKb,
            factors: [{ ...validKb.factors[0], oops: true }],
        };
        expect(() => parseKnowledgeBase(badKb)).toThrow();
    });

    test('rejects riskBands missing a required band', () => {
        const { HIGH_RISK, ...rest } = validKb.riskBands;
        const badKb = { ...validKb, riskBands: rest };
        expect(() => parseKnowledgeBase(badKb)).toThrow();
    });
});

describe('loadKnowledgeBase — file-level failures', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = mkdtempSync(join(tmpdir(), 'kbloader-test-'));
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    test('loads a valid KB file from disk', () => {
        const filePath = join(tmpDir, 'risk-kb.json');
        writeFileSync(filePath, JSON.stringify(validKb));
        expect(loadKnowledgeBase(filePath)).toEqual(validKb);
    });

    test('throws with a clear message when the file does not exist', () => {
        const filePath = join(tmpDir, 'does-not-exist.json');
        expect(() => loadKnowledgeBase(filePath)).toThrow(/Failed to read KB file/);
    });

    test('throws with a clear message when the file is not valid JSON', () => {
        const filePath = join(tmpDir, 'broken.json');
        writeFileSync(filePath, '{ not valid json');
        expect(() => loadKnowledgeBase(filePath)).toThrow(/Failed to parse KB file .* as JSON/);
    });
});

describe('loadKnowledgeBase — against the real risk-kb.json', () => {
    test('loads and validates the checked-in KB with no path override', () => {
        const kb = loadKnowledgeBase();
        expect(kb.version).toBe('1.0.0');
        expect(kb.factors.length).toBeGreaterThan(0);
    });
});
