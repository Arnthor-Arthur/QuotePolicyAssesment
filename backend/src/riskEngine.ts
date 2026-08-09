import { evaluateCondition, type EvaluationInput } from './conditionEvaluator';
import { isSimpleCondition } from './types/kb';
import type { Condition, Factor, KnowledgeBase, RiskBand, RiskBandName } from './types/kb';

export interface AppliedFactor {
    id: string;
    description: string;
    points: number;
}

export interface RiskAssessment {
    riskScore: number;
    riskBand: RiskBandName;
    appliedFactors: AppliedFactor[];
}

export function assessRisk(input: EvaluationInput, kb: KnowledgeBase): RiskAssessment {
    const appliedFactors: AppliedFactor[] = kb.factors
        .filter((factor) => evaluateCondition(factor.condition, input))
        .map((factor) => ({
            id: factor.id,
            description: factor.description,
            points: computeFactorPoints(factor, input),
        }));

    const riskScore = appliedFactors.reduce((sum, factor) => sum + factor.points, 0);
    const riskBand = resolveRiskBand(riskScore, kb.riskBands);

    return { riskScore, riskBand, appliedFactors };
}

function computeFactorPoints(factor: Factor, input: EvaluationInput): number {
    if (!factor.perOccurrence) {
        return factor.points;
    }
    return factor.points * getOccurrenceCount(factor.condition, input);
}

// Generic per-occurrence rule: the count comes from the numeric value of whatever field
// the factor's own condition already inspects (e.g. previousClaims) — never a factor id.
// Compound conditions have no single field to draw a count from, so they fall back to 1.
function getOccurrenceCount(condition: Condition, input: EvaluationInput): number {
    if (!isSimpleCondition(condition)) {
        return 1;
    }
    const fieldValue = input[condition.field];
    return typeof fieldValue === 'number' ? fieldValue : 1;
}

function resolveRiskBand(riskScore: number, riskBands: Record<RiskBandName, RiskBand>): RiskBandName {
    const match = (Object.entries(riskBands) as [RiskBandName, RiskBand][]).find(
        ([, band]) => riskScore >= band.min && riskScore <= band.max,
    );
    if (!match) {
        throw new Error(`Risk score ${riskScore} does not fall within any configured risk band.`);
    }
    return match[0];
}
