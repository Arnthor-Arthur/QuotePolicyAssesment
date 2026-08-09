// Mirrors backend/src/validation.ts and backend/src/handler.ts exactly.
// The frontend has no shared build with the backend, so these are hand-kept in sync
// with the wire contract rather than imported — they carry no risk-scoring logic of
// their own; appliedFactors/riskSummary are always rendered from the API response as-is.

export const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type RiskBand = 'STANDARD' | 'ELEVATED' | 'HIGH_RISK';

export interface QuoteRequest {
    name: string;
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
