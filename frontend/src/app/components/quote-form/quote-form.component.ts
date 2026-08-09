import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { PROPERTY_TYPES, QuoteRequest, QuoteResponse } from '../../models/quote.model';
import { QuoteService } from '../../services/quote.service';
import { QuoteResultComponent } from '../quote-result/quote-result.component';

// Mirrors backend/src/validation.ts exactly (no shared package between the two
// projects) — kept in sync so a value that passes client-side validation never
// gets rejected by the backend's Zod schema.
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

function integerValidator(control: AbstractControl<number | null>): ValidationErrors | null {
    return control.value == null || Number.isInteger(control.value) ? null : { integer: true };
}

@Component({
    selector: 'app-quote-form',
    standalone: true,
    imports: [ReactiveFormsModule, QuoteResultComponent],
    templateUrl: './quote-form.component.html',
    styleUrl: './quote-form.component.css',
})
export class QuoteFormComponent {
    // Default true keeps the primary form's existing behavior unchanged; the comparison
    // form instance binds this to false.
    readonly showNameField = input(true);

    readonly propertyTypes = PROPERTY_TYPES;

    readonly loading = signal(false);
    readonly quoteResult = signal<QuoteResponse | null>(null);
    readonly errorMessage = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        // age/propertyValue opt out of the group's non-nullable default: they should
        // start empty (null) rather than pre-filled with a misleading default number.
        age: this.fb.control<number | null>(null, [
            Validators.required,
            Validators.min(18),
            Validators.max(120),
            integerValidator,
        ]),
        propertyType: ['House' as (typeof PROPERTY_TYPES)[number], Validators.required],
        propertyValue: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
        postcode: ['', [Validators.required, Validators.pattern(UK_POSTCODE_REGEX)]],
        previousClaims: [0, [Validators.required, Validators.min(0), integerValidator]],
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly quoteService: QuoteService,
    ) {
        // The `name` control always exists in the group (keeps the FormGroup's type simple —
        // Angular's typed reactive forms don't cleanly support add/removeControl without
        // losing type safety); what changes is whether it's enabled/required, driven by the
        // showNameField input signal so it reacts correctly however it's bound.
        effect(() => {
            const nameControl = this.form.controls.name;
            if (this.showNameField()) {
                nameControl.enable({ emitEvent: false });
                nameControl.setValidators(Validators.required);
            } else {
                nameControl.disable({ emitEvent: false });
                nameControl.clearValidators();
            }
            nameControl.updateValueAndValidity({ emitEvent: false });
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        // Non-null: Validators.required on age/propertyValue already guaranteed by the
        // invalid-check above, so these two can only be null before the form is valid.
        const request: QuoteRequest = {
            age: raw.age!,
            propertyType: raw.propertyType,
            propertyValue: raw.propertyValue!,
            postcode: raw.postcode,
            previousClaims: raw.previousClaims,
            // Omitted entirely (not sent as '') when hidden — the backend still rejects an
            // explicit empty string, only an absent key gets the server-side "N/A" default.
            ...(this.showNameField() ? { name: raw.name } : {}),
        };

        this.loading.set(true);
        this.errorMessage.set(null);
        this.quoteResult.set(null);

        this.quoteService.getQuote(request).subscribe({
            next: (result) => {
                this.quoteResult.set(result);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.errorMessage.set(this.extractErrorMessage(err));
                this.loading.set(false);
            },
        });
    }

    private extractErrorMessage(err: unknown): string {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as { error?: string; details?: unknown } | null;
            const fieldErrors = this.flattenValidationDetails(body?.details);
            if (fieldErrors) {
                return fieldErrors;
            }
            return body?.error ?? 'Something went wrong while fetching your quote.';
        }
        return 'Something went wrong while fetching your quote.';
    }

    // Backend 400s carry `details` shaped by Zod's treeifyError: { properties: { <field>: { errors: string[] } } }.
    // Flattened generically (no field names hardcoded) so any validation rule the backend
    // enforces — now or added later — shows up as an actionable message here.
    private flattenValidationDetails(details: unknown): string | null {
        if (typeof details !== 'object' || details === null || !('properties' in details)) {
            return null;
        }
        const properties = (details as { properties?: Record<string, { errors?: string[] }> }).properties;
        if (!properties) {
            return null;
        }

        const messages = Object.entries(properties).flatMap(([field, value]) =>
            (value.errors ?? []).map((message) => `${field}: ${message}`),
        );
        return messages.length > 0 ? messages.join('; ') : null;
    }
}
