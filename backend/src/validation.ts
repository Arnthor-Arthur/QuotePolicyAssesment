import { z } from 'zod';

export const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow'] as const;

// Outward code (1-2 letters, 1 digit, optional letter/digit) + inward code (1 digit, 2 letters).
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export const quoteRequestSchema = z
    .object({
        // Optional: the comparison-quote form omits it entirely rather than sending ''
        // (which would still fail min(1)) — .default() makes the key omittable and
        // guarantees the output is always a string, so nothing downstream needs to
        // handle an absent name.
        name: z.string().min(1, 'Name is required').default('N/A'),
        age: z.number().int().min(18, 'Applicant must be at least 18').max(120, 'Age must be realistic'),
        propertyType: z.enum(PROPERTY_TYPES),
        propertyValue: z.number().positive('Property value must be greater than 0'),
        postcode: z
            .string()
            .regex(UK_POSTCODE_REGEX, 'Must be a valid UK postcode')
            // Canonicalize so the risk engine's case-sensitive postcode checks (e.g. startsWith 'EX')
            // aren't fooled by input casing or spacing — the inward code is always the last 3 chars.
            .transform((value) => value.toUpperCase().replace(/\s+/g, '').replace(/(.{3})$/, ' $1')),
        previousClaims: z.number().int().min(0, 'Previous claims cannot be negative'),
    })
    .strict();

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
