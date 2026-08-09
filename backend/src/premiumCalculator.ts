import type { KnowledgeBase, RiskBandName } from './types/kb';

export interface CoverageDetails {
    basePremium: number;
    coverageLoadFactor: number;
    riskMultiplier: number;
}

export interface PremiumBreakdown {
    monthlyPremium: number;
    annualPremium: number;
    coverageDetails: CoverageDetails;
}

export function calculatePremium(riskBand: RiskBandName, kb: KnowledgeBase): PremiumBreakdown {
    const riskMultiplier = kb.riskBands[riskBand].multiplier;
    const annualPremium = roundToCents(kb.basePremium * riskMultiplier * kb.coverageLoadFactor);
    const monthlyPremium = roundToCents(annualPremium / 12);

    return {
        monthlyPremium,
        annualPremium,
        coverageDetails: {
            basePremium: kb.basePremium,
            coverageLoadFactor: kb.coverageLoadFactor,
            riskMultiplier,
        },
    };
}

function roundToCents(value: number): number {
    return Math.round(value * 100) / 100;
}
