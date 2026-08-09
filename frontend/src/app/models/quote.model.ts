// Mirrors backend/src/validation.ts and backend/src/handler.ts exactly.
// The frontend has no shared build with the backend, so these are hand-kept in sync
// with the wire contract rather than imported — they carry no risk-scoring logic of
// their own; appliedFactors/riskSummary are always rendered from the API response as-is.

export const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type RiskBand = 'STANDARD' | 'ELEVATED' | 'HIGH_RISK';

export interface QuoteRequest {
    // Optional: the backend defaults an omitted name to "N/A" (used by the comparison-quote
    // form). Sending an explicit empty string is still rejected server-side — omit the key.
    name?: string;
    age: number;
    propertyType: PropertyType;
    propertyValue: number;
    postcode: string;
    previousClaims: number;
}

export interface AppliedFactor {
    id: string;
    description: string;
    points: number;
}

export interface CoverageDetails {
    basePremium: number;
    coverageLoadFactor: number;
    riskMultiplier: number;
}

export interface QuoteResponse {
    monthlyPremium: number;
    annualPremium: number;
    riskBand: RiskBand;
    riskScore: number;
    riskSummary: string;
    coverageDetails: CoverageDetails;
    appliedFactors: AppliedFactor[];
    kbVersion: string;
}

// Purely a diff of two already-computed QuoteResponses — carries no risk-scoring logic
// of its own (see quote-comparison.service.ts).
export interface QuoteComparison {
    cheaperOption: 'A' | 'B' | 'equal';
    // Always >= 0 — magnitude only. Direction is what cheaperOption is for; pairing a
    // signed number with cheaperOption would just invite "which sign means what" bugs.
    monthlyPremiumDifference: number;
    riskBandChanged: boolean;
    factorsOnlyInA: AppliedFactor[];
    factorsOnlyInB: AppliedFactor[];
    sharedFactors: AppliedFactor[];
}
