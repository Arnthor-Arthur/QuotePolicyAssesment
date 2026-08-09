import type { RiskBandName } from './types/kb';

const RISK_BAND_LABELS: Record<RiskBandName, string> = {
    STANDARD: 'standard',
    ELEVATED: 'elevated',
    HIGH_RISK: 'high',
};

// Only the description is needed, not the full AppliedFactor shape — keeps this module
// decoupled from riskEngine.ts while still accepting its output structurally.
export function generateRiskSummary(riskBand: RiskBandName, appliedFactors: { description: string }[]): string {
    const bandLabel = RISK_BAND_LABELS[riskBand];

    if (appliedFactors.length === 0) {
        return `This property falls into the ${bandLabel} risk band, with no risk factors identified.`;
    }

    const reasons = appliedFactors.map((factor) => factor.description).join(', ');
    return `This property falls into the ${bandLabel} risk band due to: ${reasons}.`;
}
