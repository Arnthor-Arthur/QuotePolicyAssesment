import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteRequest, QuoteResponse } from '../../models/quote.model';
import { QuoteFormComponent } from './quote-form.component';

describe('QuoteFormComponent', () => {
    let fixture: ComponentFixture<QuoteFormComponent>;
    let component: QuoteFormComponent;
    let httpMock: HttpTestingController;

    // QuoteRequest's `name` is optional (the comparison form omits it); this fixture always
    // has a concrete one, which is what form.setValue() needs — the name control is always
    // FormControl<string>, never undefined, regardless of whether it's shown.
    const validFormValues: Omit<QuoteRequest, 'name'> & { name: string } = {
        name: 'Jane Doe',
        age: 40,
        propertyType: 'House',
        propertyValue: 250000,
        postcode: 'EX4 1AB',
        previousClaims: 0,
    };

    const mockResponse: QuoteResponse = {
        monthlyPremium: 45,
        annualPremium: 540,
        riskBand: 'ELEVATED',
        riskScore: 30,
        riskSummary: 'This property falls into the elevated risk band due to: something risky.',
        coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.5 },
        appliedFactors: [{ id: 'some_factor', description: 'something risky', points: 30 }],
        kbVersion: '1.0.0',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [QuoteFormComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(QuoteFormComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('starts with no loading, no result, no error, and an invalid (empty) form', () => {
        expect(component.loading()).toBe(false);
        expect(component.quoteResult()).toBeNull();
        expect(component.errorMessage()).toBeNull();
        expect(component.form.invalid).toBe(true);
    });

    it('does not call the API when the form is invalid, and touches every control', () => {
        component.onSubmit();
        httpMock.expectNone('/policy/quote');
        expect(component.form.touched).toBe(true);
    });

    it('submits valid input, sets loading during the request, and populates quoteResult on success', () => {
        component.form.setValue(validFormValues);
        component.onSubmit();

        expect(component.loading()).toBe(true);

        const req = httpMock.expectOne('/policy/quote');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(validFormValues);

        req.flush(mockResponse);

        expect(component.loading()).toBe(false);
        expect(component.quoteResult()).toEqual(mockResponse);
        expect(component.errorMessage()).toBeNull();

        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Elevated risk');
        expect(text).toContain('something risky');
    });

    it('sets errorMessage and clears loading when the API returns an error with no field details', () => {
        component.form.setValue(validFormValues);
        component.onSubmit();

        const req = httpMock.expectOne('/policy/quote');
        req.flush({ error: 'Invalid request.' }, { status: 400, statusText: 'Bad Request' });

        expect(component.loading()).toBe(false);
        expect(component.errorMessage()).toBe('Invalid request.');
        expect(component.quoteResult()).toBeNull();

        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Invalid request.');
    });

    it('surfaces the specific field reason from a Zod-shaped 400 response', () => {
        component.form.setValue(validFormValues);
        component.onSubmit();

        const req = httpMock.expectOne('/policy/quote');
        req.flush(
            {
                error: 'Invalid request.',
                details: { errors: [], properties: { age: { errors: ['Applicant must be at least 18'] } } },
            },
            { status: 400, statusText: 'Bad Request' },
        );

        expect(component.errorMessage()).toBe('age: Applicant must be at least 18');
    });

    describe('client-side validators mirroring the backend Zod schema', () => {
        it('rejects a non-integer age even though it is within range', () => {
            component.form.setValue({ ...validFormValues, age: 45.5 });
            expect(component.form.controls.age.valid).toBe(false);
        });

        it('rejects a non-integer previousClaims', () => {
            component.form.setValue({ ...validFormValues, previousClaims: 1.5 });
            expect(component.form.controls.previousClaims.valid).toBe(false);
        });

        it('rejects a postcode that is not a valid UK format', () => {
            component.form.setValue({ ...validFormValues, postcode: '12345' });
            expect(component.form.controls.postcode.valid).toBe(false);
        });

        it('accepts a postcode without a space, matching the backend regex', () => {
            component.form.setValue({ ...validFormValues, postcode: 'EX41AB' });
            expect(component.form.controls.postcode.valid).toBe(true);
        });
    });

    describe('showNameField', () => {
        it('is enabled and required by default', () => {
            expect(component.form.controls.name.disabled).toBe(false);
            component.form.controls.name.setValue('');
            expect(component.form.controls.name.invalid).toBe(true);
        });

        it('disables the control and clears its validator when set to false', () => {
            fixture.componentRef.setInput('showNameField', false);
            fixture.detectChanges();

            expect(component.form.controls.name.disabled).toBe(true);
            expect(component.form.controls.name.validator).toBeNull();
        });

        it('re-enables and re-requires the control if switched back to true', () => {
            fixture.componentRef.setInput('showNameField', false);
            fixture.detectChanges();
            fixture.componentRef.setInput('showNameField', true);
            fixture.detectChanges();

            expect(component.form.controls.name.disabled).toBe(false);
            component.form.controls.name.setValue('');
            expect(component.form.controls.name.invalid).toBe(true);
        });

        it('hides the Name field from the template when false', () => {
            fixture.componentRef.setInput('showNameField', false);
            fixture.detectChanges();

            const nameInput = (fixture.nativeElement as HTMLElement).querySelector('#name');
            expect(nameInput).toBeNull();
        });

        it('is valid to submit without ever touching name when hidden', () => {
            fixture.componentRef.setInput('showNameField', false);
            fixture.detectChanges();

            const { name, ...rest } = validFormValues;
            component.form.patchValue(rest);
            expect(component.form.valid).toBe(true);
        });

        it('omits name entirely from the submitted request body — not as an empty string', () => {
            fixture.componentRef.setInput('showNameField', false);
            fixture.detectChanges();

            const { name, ...rest } = validFormValues;
            component.form.patchValue(rest);
            component.onSubmit();

            const req = httpMock.expectOne('/policy/quote');
            expect(req.request.body).toEqual(rest);
            req.flush(mockResponse);
        });
    });
});
