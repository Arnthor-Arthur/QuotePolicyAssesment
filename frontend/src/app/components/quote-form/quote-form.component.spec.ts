import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteRequest, QuoteResponse } from '../../models/quote.model';
import { QuoteFormComponent } from './quote-form.component';

describe('QuoteFormComponent', () => {
    let fixture: ComponentFixture<QuoteFormComponent>;
    let component: QuoteFormComponent;
    let httpMock: HttpTestingController;

    const validFormValues: QuoteRequest = {
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
        expect(text).toContain('ELEVATED');
        expect(text).toContain('something risky');
    });

    it('sets errorMessage and clears loading when the API returns an error', () => {
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
});
