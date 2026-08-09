import { TestBed } from '@angular/core/testing';
import { AppliedFactor, QuoteResponse } from '../models/quote.model';
import { QuoteComparisonService } from './quote-comparison.service';

function makeQuote(overrides: Partial<QuoteResponse> = {}): QuoteResponse {
    return {
        monthlyPremium: 45,
        annualPremium: 540,
        riskBand: 'ELEVATED',
        riskScore: 45,
        riskSummary: 'summary',
        coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.5 },
        appliedFactors: [],
        kbVersion: '1.0.0',
        ...overrides,
    };
}

const factorX: AppliedFactor = { id: 'x', description: 'Factor X', points: 10 };
const factorY: AppliedFactor = { id: 'y', description: 'Factor Y', points: 15 };
const factorZ: AppliedFactor = { id: 'z', description: 'Factor Z', points: 20 };

describe('QuoteComparisonService', () => {
    let service: QuoteComparisonService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(QuoteComparisonService);
    });

    it('reports A as cheaper with the absolute (unsigned) difference', () => {
        const a = makeQuote({ monthlyPremium: 30 });
        const b = makeQuote({ monthlyPremium: 45 });
        const result = service.compareQuotes(a, b);
        expect(result.cheaperOption).toBe('A');
        expect(result.monthlyPremiumDifference).toBe(15);
    });

    it('reports B as cheaper with the same absolute difference regardless of argument order', () => {
        const a = makeQuote({ monthlyPremium: 45 });
        const b = makeQuote({ monthlyPremium: 30 });
        const result = service.compareQuotes(a, b);
        expect(result.cheaperOption).toBe('B');
        expect(result.monthlyPremiumDifference).toBe(15);
    });

    it('reports "equal" and a zero difference when premiums match', () => {
        const a = makeQuote({ monthlyPremium: 45 });
        const b = makeQuote({ monthlyPremium: 45 });
        const result = service.compareQuotes(a, b);
        expect(result.cheaperOption).toBe('equal');
        expect(result.monthlyPremiumDifference).toBe(0);
    });

    it('flags riskBandChanged only when the bands actually differ', () => {
        const same = service.compareQuotes(makeQuote({ riskBand: 'STANDARD' }), makeQuote({ riskBand: 'STANDARD' }));
        expect(same.riskBandChanged).toBe(false);

        const different = service.compareQuotes(
            makeQuote({ riskBand: 'STANDARD' }),
            makeQuote({ riskBand: 'HIGH_RISK' }),
        );
        expect(different.riskBandChanged).toBe(true);
    });

    describe('factor diffing — by id, not array position', () => {
        it('treats a factor present in both as shared even at different indices', () => {
            const a = makeQuote({ appliedFactors: [factorX, factorY] });
            const b = makeQuote({ appliedFactors: [factorY, factorX] }); // reversed order

            const result = service.compareQuotes(a, b);
            expect(result.sharedFactors.map((f) => f.id).sort()).toEqual(['x', 'y']);
            expect(result.factorsOnlyInA).toEqual([]);
            expect(result.factorsOnlyInB).toEqual([]);
        });

        it('splits factors correctly when the two lists partially overlap', () => {
            const a = makeQuote({ appliedFactors: [factorX, factorY] });
            const b = makeQuote({ appliedFactors: [factorY, factorZ] });

            const result = service.compareQuotes(a, b);
            expect(result.factorsOnlyInA).toEqual([factorX]);
            expect(result.factorsOnlyInB).toEqual([factorZ]);
            expect(result.sharedFactors).toEqual([factorY]);
        });

        it('puts every factor in its "only in" list when there is no overlap at all', () => {
            const a = makeQuote({ appliedFactors: [factorX] });
            const b = makeQuote({ appliedFactors: [factorZ] });

            const result = service.compareQuotes(a, b);
            expect(result.factorsOnlyInA).toEqual([factorX]);
            expect(result.factorsOnlyInB).toEqual([factorZ]);
            expect(result.sharedFactors).toEqual([]);
        });

        it('does not treat factors with the same description but different ids as shared', () => {
            const decoyX: AppliedFactor = { id: 'decoy', description: factorX.description, points: 999 };
            const a = makeQuote({ appliedFactors: [factorX] });
            const b = makeQuote({ appliedFactors: [decoyX] });

            const result = service.compareQuotes(a, b);
            expect(result.sharedFactors).toEqual([]);
            expect(result.factorsOnlyInA).toEqual([factorX]);
            expect(result.factorsOnlyInB).toEqual([decoyX]);
        });
    });
});
