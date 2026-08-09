import { calculatePremium } from './premiumCalculator';
import { loadKnowledgeBase } from './kbLoader';
import type { KnowledgeBase } from './types/kb';

describe('calculatePremium — against the real risk-kb.json', () => {
    const kb = loadKnowledgeBase();

    test('STANDARD', () => {
        expect(calculatePremium('STANDARD', kb)).toEqual({
            annualPremium: 450,
            monthlyPremium: 37.5,
            coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.25 },
        });
    });

    test('ELEVATED', () => {
        expect(calculatePremium('ELEVATED', kb)).toEqual({
            annualPremium: 540,
            monthlyPremium: 45,
            coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.5 },
        });
    });

    test('HIGH_RISK', () => {
        expect(calculatePremium('HIGH_RISK', kb)).toEqual({
            annualPremium: 630,
            monthlyPremium: 52.5,
            coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.75 },
        });
    });

    test('monthlyPremium is always annualPremium / 12, never the other way round', () => {
        for (const band of ['STANDARD', 'ELEVATED', 'HIGH_RISK'] as const) {
            const { monthlyPremium, annualPremium } = calculatePremium(band, kb);
            expect(monthlyPremium).toBeCloseTo(annualPremium / 12, 5);
        }
    });
});

describe('calculatePremium — riskMultiplier is read from the KB, not hardcoded', () => {
    // Deliberately unusual multipliers per band, to prove the resolved band drives the
    // multiplier rather than any assumption baked into the calculator.
    const kb: KnowledgeBase = {
        version: 'test-1.0.0',
        basePremium: 10,
        coverageLoadFactor: 1,
        riskBands: {
            STANDARD: { min: 0, max: 10, multiplier: 2 },
            ELEVATED: { min: 11, max: 30, multiplier: 3 },
            HIGH_RISK: { min: 31, max: 999, multiplier: 4 },
        },
        factors: [],
    };

    test('picks the multiplier matching the given band', () => {
        expect(calculatePremium('STANDARD', kb).annualPremium).toBe(20);
        expect(calculatePremium('ELEVATED', kb).annualPremium).toBe(30);
        expect(calculatePremium('HIGH_RISK', kb).annualPremium).toBe(40);
    });

    test('rounds both premiums to the nearest cent', () => {
        const fractionalKb: KnowledgeBase = {
            ...kb,
            basePremium: 100,
            riskBands: {
                ...kb.riskBands,
                STANDARD: { min: 0, max: 10, multiplier: 1 / 3 },
            },
        };
        expect(calculatePremium('STANDARD', fractionalKb)).toEqual({
            annualPremium: 33.33,
            monthlyPremium: 2.78,
            coverageDetails: { basePremium: 100, coverageLoadFactor: 1, riskMultiplier: 1 / 3 },
        });
    });
});
