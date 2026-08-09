import { z } from 'zod';
import { quoteRequestSchema } from './validation';
import { loadKnowledgeBase } from './kbLoader';
import { assessRisk } from './riskEngine';
import type { AppliedFactor } from './riskEngine';
import { calculatePremium } from './premiumCalculator';
import type { CoverageDetails } from './premiumCalculator';
import { generateRiskSummary } from './riskSummary';
import type { RiskBandName } from './types/kb';

export interface QuoteResponse {
    monthlyPremium: number;
    annualPremium: number;
    riskBand: RiskBandName;
    riskScore: number;
    riskSummary: string;
    coverageDetails: CoverageDetails;
    appliedFactors: AppliedFactor[];
    kbVersion: string;
}

export interface LambdaEvent {
    body?: string | null;
}

export type LambdaContext = unknown;

export interface LambdaResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

// Loaded once per container lifetime (Lambda cold start), not per-request — avoids re-reading
// and re-validating risk-kb.json on every invocation. A malformed KB fails loudly here, at
// startup, rather than silently on whichever request happens to hit it first.
// Exported so server.ts's /health check can report the active version without a second load.
export const kb = loadKnowledgeBase();

function jsonResponse(statusCode: number, payload: unknown): LambdaResponse {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    };
}

export async function handler(event: LambdaEvent, _context: LambdaContext): Promise<LambdaResponse> {
    let rawBody: unknown;
    try {
        rawBody = JSON.parse(event.body ?? '{}');
    } catch {
        return jsonResponse(400, { error: 'Request body must be valid JSON.' });
    }

    const parsed = quoteRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
        return jsonResponse(400, {
            error: 'Invalid request.',
            details: z.treeifyError(parsed.error),
        });
    }

    try {
        const riskAssessment = assessRisk(parsed.data, kb);
        const premium = calculatePremium(riskAssessment.riskBand, kb);
        const riskSummary = generateRiskSummary(riskAssessment.riskBand, riskAssessment.appliedFactors);

        const response: QuoteResponse = {
            monthlyPremium: premium.monthlyPremium,
            annualPremium: premium.annualPremium,
            riskBand: riskAssessment.riskBand,
            riskScore: riskAssessment.riskScore,
            riskSummary,
            coverageDetails: premium.coverageDetails,
            appliedFactors: riskAssessment.appliedFactors,
            kbVersion: kb.version,
        };

        return jsonResponse(200, response);
    } catch (err) {
        return jsonResponse(500, { error: (err as Error).message });
    }
}
