import { Injectable } from '@angular/core';
import { AppliedFactor, QuoteComparison, QuoteResponse } from '../models/quote.model';

@Injectable({ providedIn: 'root' })
export class QuoteComparisonService {
    // Pure and stateless: only ever reads its two arguments, never the KB or risk engine —
    // this is a diff of two already-computed API responses, not a re-derivation of risk.
    compareQuotes(a: QuoteResponse, b: QuoteResponse): QuoteComparison {
        const monthlyPremiumDifference = Math.abs(a.monthlyPremium - b.monthlyPremium);
        const cheaperOption =
            a.monthlyPremium === b.monthlyPremium ? 'equal' : a.monthlyPremium < b.monthlyPremium ? 'A' : 'B';

        const { onlyInFirst: factorsOnlyInA, onlyInSecond: factorsOnlyInB, shared: sharedFactors } = diffById(
            a.appliedFactors,
            b.appliedFactors,
        );

        return {
            cheaperOption,
            monthlyPremiumDifference,
            riskBandChanged: a.riskBand !== b.riskBand,
            factorsOnlyInA,
            factorsOnlyInB,
            sharedFactors,
        };
    }
}

// Diffs two factor lists by `id`, never by array position/index — a factor appearing at a
// different index in each list, or in a different order, is still recognized as shared.
function diffById(
    first: AppliedFactor[],
    second: AppliedFactor[],
): { onlyInFirst: AppliedFactor[]; onlyInSecond: AppliedFactor[]; shared: AppliedFactor[] } {
    const firstIds = new Set(first.map((factor) => factor.id));
    const secondIds = new Set(second.map((factor) => factor.id));

    return {
        onlyInFirst: first.filter((factor) => !secondIds.has(factor.id)),
        onlyInSecond: second.filter((factor) => !firstIds.has(factor.id)),
        shared: first.filter((factor) => secondIds.has(factor.id)),
    };
}
