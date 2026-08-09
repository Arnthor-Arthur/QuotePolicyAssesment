import { generateRiskSummary } from './riskSummary';

describe('generateRiskSummary', () => {
    test('STANDARD band with no applied factors', () => {
        expect(generateRiskSummary('STANDARD', [])).toBe(
            'This property falls into the standard risk band, with no risk factors identified.',
        );
    });

    test('ELEVATED band with a single applied factor', () => {
        expect(
            generateRiskSummary('ELEVATED', [{ description: 'Property value over £750,000' }]),
        ).toBe('This property falls into the elevated risk band due to: Property value over £750,000.');
    });

    test('HIGH_RISK band with multiple applied factors joined together', () => {
        const summary = generateRiskSummary('HIGH_RISK', [
            { description: '3 or more previous claims' },
            { description: 'Flat — higher shared risk' },
        ]);
        expect(summary).toBe(
            'This property falls into the high risk band due to: 3 or more previous claims, Flat — higher shared risk.',
        );
    });

    test('uses whatever descriptions it is given, with no knowledge of specific factor ids', () => {
        const summary = generateRiskSummary('ELEVATED', [
            { description: 'Some brand-new factor description never seen before' },
        ]);
        expect(summary).toContain('Some brand-new factor description never seen before');
    });
});
