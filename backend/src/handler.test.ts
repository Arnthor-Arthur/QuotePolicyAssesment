import { handler } from './handler';
import type { QuoteResponse } from './handler';

// End-to-end through handler(): real event -> JSON.parse -> Zod validation -> the real,
// checked-in risk-kb.json (loaded once at module scope, exactly like the live server) ->
// riskEngine -> premiumCalculator -> riskSummary -> HTTP-shaped response. Deliberately not
// mocking the KB or any downstream module — this is what riskEngine.test.ts's unit-level
// fixture tests can't catch: wiring bugs in handler.ts itself.

const baseline = {
    name: 'Jane Doe',
    age: 40,
    propertyType: 'House',
    propertyValue: 200000,
    postcode: 'LN1 1AA',
    previousClaims: 0,
};

async function submit(input: Record<string, unknown>): Promise<{ statusCode: number; body: QuoteResponse }> {
    const response = await handler({ body: JSON.stringify(input) }, {});
    return { statusCode: response.statusCode, body: JSON.parse(response.body) as QuoteResponse };
}

describe('handler — risk bands end-to-end', () => {
    test('STANDARD: no factors match', async () => {
        const { statusCode, body } = await submit(baseline);

        expect(statusCode).toBe(200);
        expect(body.riskBand).toBe('STANDARD');
        expect(body.riskScore).toBe(0);
        expect(body.appliedFactors).toEqual([]);
        expect(body.kbVersion).toBe('1.0.0');
    });

    test('ELEVATED: elderly applicant with a high-value property', async () => {
        const { statusCode, body } = await submit({ ...baseline, age: 80, propertyValue: 800000 });

        expect(statusCode).toBe(200);
        expect(body.riskBand).toBe('ELEVATED');
        expect(body.riskScore).toBe(45); // age_young_elderly (20) + property_value_high (25)
        expect(body.appliedFactors.map((f) => f.id).sort()).toEqual(['age_young_elderly', 'property_value_high']);
    });

    test('HIGH_RISK: 5 previous claims scales previous_claims_high past the top threshold', async () => {
        const { statusCode, body } = await submit({ ...baseline, previousClaims: 5 });

        expect(statusCode).toBe(200);
        expect(body.riskBand).toBe('HIGH_RISK');
        expect(body.riskScore).toBe(150); // 30 points * 5 occurrences
        expect(body.appliedFactors).toEqual([
            { id: 'previous_claims_high', description: '3 or more previous claims', points: 150 },
        ]);
    });
});

describe('handler — compound conditions end-to-end', () => {
    test('allOf: flat_high_value only applies once both sub-conditions hold', async () => {
        const bothHold = await submit({ ...baseline, propertyType: 'Flat', propertyValue: 600000 });
        expect(bothHold.statusCode).toBe(200);
        expect(bothHold.body.appliedFactors.map((f) => f.id).sort()).toEqual([
            'flat_high_value',
            'property_type_flat',
        ]);
        expect(bothHold.body.riskScore).toBe(45); // property_type_flat (10) + flat_high_value (35)
        expect(bothHold.body.riskBand).toBe('ELEVATED');

        const onlyOneHolds = await submit({ ...baseline, propertyType: 'Flat', propertyValue: 100000 });
        expect(onlyOneHolds.body.appliedFactors.map((f) => f.id)).not.toContain('flat_high_value');
    });

    test('anyOf: flood_zone_postcode applies when either sub-condition holds', async () => {
        const { statusCode, body } = await submit({ ...baseline, postcode: 'EX4 1AB' });

        expect(statusCode).toBe(200);
        expect(body.appliedFactors).toEqual([
            { id: 'flood_zone_postcode', description: 'Property in a known flood-risk postcode area', points: 15 },
        ]);
        expect(body.riskBand).toBe('STANDARD');
    });
});
