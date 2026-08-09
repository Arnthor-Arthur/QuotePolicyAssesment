import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PROPERTY_TYPES, QuoteRequest, QuoteResponse } from '../../models/quote.model';
import { QuoteService } from '../../services/quote.service';

@Component({
    selector: 'app-quote-form',
    standalone: true,
    imports: [ReactiveFormsModule, CurrencyPipe],
    templateUrl: './quote-form.component.html',
    styleUrl: './quote-form.component.css',
})
export class QuoteFormComponent {
    readonly propertyTypes = PROPERTY_TYPES;

    readonly loading = signal(false);
    readonly quoteResult = signal<QuoteResponse | null>(null);
    readonly errorMessage = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        // age/propertyValue opt out of the group's non-nullable default: they should
        // start empty (null) rather than pre-filled with a misleading default number.
        age: this.fb.control<number | null>(null, [Validators.required, Validators.min(18), Validators.max(120)]),
        propertyType: ['House' as (typeof PROPERTY_TYPES)[number], Validators.required],
        propertyValue: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
        postcode: ['', Validators.required],
        previousClaims: [0, [Validators.required, Validators.min(0)]],
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly quoteService: QuoteService,
    ) {}

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        // Non-null: Validators.required on age/propertyValue already guaranteed by the
        // invalid-check above, so these two can only be null before the form is valid.
        const request: QuoteRequest = {
            name: raw.name,
            age: raw.age!,
            propertyType: raw.propertyType,
            propertyValue: raw.propertyValue!,
            postcode: raw.postcode,
            previousClaims: raw.previousClaims,
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
            const body = err.error as { error?: string } | null;
            return body?.error ?? 'Something went wrong while fetching your quote.';
        }
        return 'Something went wrong while fetching your quote.';
    }
}
