import { quoteRequestSchema } from './validation';

const validInput = {
    name: 'Jane Doe',
    age: 40,
    propertyType: 'House',
    propertyValue: 250000,
    postcode: 'EX4 1AB',
    previousClaims: 1,
};

describe('quoteRequestSchema — happy path', () => {
    test('accepts a fully valid request', () => {
        const result = quoteRequestSchema.safeParse(validInput);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validInput);
    });

    test('accepts the other propertyType enum value', () => {
        const result = quoteRequestSchema.safeParse({ ...validInput, propertyType: 'Flat' });
        expect(result.success).toBe(true);
    });

    test('normalizes postcode casing and spacing to canonical form', () => {
        const result = quoteRequestSchema.safeParse({ ...validInput, postcode: 'ex41ab' });
        expect(result.success).toBe(true);
        expect(result.data?.postcode).toBe('EX4 1AB');
    });

    test('normalizes an already-correct postcode unchanged', () => {
        const result = quoteRequestSchema.safeParse({ ...validInput, postcode: 'PL1 2CD' });
        expect(result.success).toBe(true);
        expect(result.data?.postcode).toBe('PL1 2CD');
    });
});

describe('quoteRequestSchema — rejections', () => {
    test('rejects an empty name', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, name: '' }).success).toBe(false);
    });

    test('rejects a missing name', () => {
        const { name, ...rest } = validInput;
        expect(quoteRequestSchema.safeParse(rest).success).toBe(false);
    });

    test('rejects age under 18', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, age: 17 }).success).toBe(false);
    });

    test('rejects an unrealistic age', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, age: 150 }).success).toBe(false);
    });

    test('rejects a non-integer age', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, age: 40.5 }).success).toBe(false);
    });

    test('rejects a propertyType outside the enum', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, propertyType: 'Castle' }).success).toBe(false);
    });

    test('rejects a zero or negative propertyValue', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, propertyValue: 0 }).success).toBe(false);
        expect(quoteRequestSchema.safeParse({ ...validInput, propertyValue: -1000 }).success).toBe(false);
    });

    test('rejects a malformed postcode', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, postcode: 'NOT A POSTCODE' }).success).toBe(false);
    });

    test('rejects negative previousClaims', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, previousClaims: -1 }).success).toBe(false);
    });

    test('rejects a non-integer previousClaims', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, previousClaims: 1.5 }).success).toBe(false);
    });

    test('rejects unrecognized extra fields', () => {
        expect(quoteRequestSchema.safeParse({ ...validInput, extraField: 'oops' }).success).toBe(false);
    });
});
