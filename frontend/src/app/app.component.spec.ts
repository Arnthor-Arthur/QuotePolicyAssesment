import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { QuoteFormComponent } from './components/quote-form/quote-form.component';
import { QuoteResponse } from './models/quote.model';

const mockQuoteA: QuoteResponse = {
    monthlyPremium: 30,
    annualPremium: 360,
    riskBand: 'STANDARD',
    riskScore: 0,
    riskSummary: 'Quote A summary',
    coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.25 },
    appliedFactors: [],
    kbVersion: '1.0.0',
};

const mockQuoteB: QuoteResponse = { ...mockQuoteA, monthlyPremium: 45, riskBand: 'ELEVATED', riskSummary: 'Quote B summary' };

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'PolicyQuote' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('PolicyQuote');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('PolicyQuote');
  });

  it('starts with comparisonMode off and only the one primary quote form', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.comparisonMode()).toBe(false);
    expect(compiled.querySelectorAll('app-quote-form').length).toBe(1);
  });

  it('toggling "Compare with another quote" reveals a second form without a name field, and toggling again hides it', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.compare-toggle')!;

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.comparisonMode()).toBe(true);
    expect(compiled.querySelectorAll('app-quote-form').length).toBe(2);
    // Only the primary form's name field should exist — the comparison form suppresses it.
    expect(compiled.querySelectorAll('#name').length).toBe(1);
    expect(button.textContent).toContain('Hide comparison quote');

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.comparisonMode()).toBe(false);
    expect(compiled.querySelectorAll('app-quote-form').length).toBe(1);
    expect(button.textContent).toContain('Compare with another quote');
  });

  it('shows app-comparison-result only once BOTH forms have a quoteResult, not just one', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.compare-toggle')!;

    button.click();
    fixture.detectChanges();

    const forms = fixture.debugElement.queryAll(By.directive(QuoteFormComponent));
    expect(forms.length).toBe(2);
    const [primaryForm, comparisonForm] = forms.map((debugEl) => debugEl.componentInstance as QuoteFormComponent);

    expect(compiled.querySelector('app-comparison-result')).toBeNull();

    primaryForm.quoteResult.set(mockQuoteA);
    fixture.detectChanges();
    expect(compiled.querySelector('app-comparison-result')).toBeNull();

    comparisonForm.quoteResult.set(mockQuoteB);
    fixture.detectChanges();

    const comparisonEl = compiled.querySelector('app-comparison-result');
    expect(comparisonEl).not.toBeNull();
    expect(comparisonEl?.textContent).toContain('Quote A is £15.00 cheaper per month.');
  });
});
