import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteResponse } from '../../models/quote.model';
import { QuoteResultComponent } from './quote-result.component';

describe('QuoteResultComponent', () => {
    let fixture: ComponentFixture<QuoteResultComponent>;

    const quote: QuoteResponse = {
        monthlyPremium: 45,
        annualPremium: 540,
        riskBand: 'ELEVATED',
        riskScore: 45,
        riskSummary: 'This property falls into the elevated risk band due to: something risky.',
        coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.5 },
        appliedFactors: [
            { id: 'factor_a', description: 'Some risk reason', points: 20 },
            { id: 'factor_b', description: 'Another risk reason', points: 25 },
        ],
        kbVersion: '1.0.0',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [QuoteResultComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(QuoteResultComponent);
        fixture.componentRef.setInput('quote', quote);
        fixture.detectChanges();
    });

    it('renders the premiums, summary, badge, and kb version straight from the input', () => {
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('£45.00');
        expect(text).toContain('£540.00');
        expect(text).toContain('Elevated risk');
        expect(text).toContain('something risky');
        expect(text).toContain('1.0.0');
    });

    it('renders every applied factor with its description and points, unmodified', () => {
        const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.applied-factors li');
        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain('Some risk reason');
        expect(items[0].textContent).toContain('20 pts');
        expect(items[1].textContent).toContain('Another risk reason');
        expect(items[1].textContent).toContain('25 pts');
    });

    it('renders nothing under applied factors when the list is empty', () => {
        fixture.componentRef.setInput('quote', { ...quote, appliedFactors: [] });
        fixture.detectChanges();
        const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.applied-factors li');
        expect(items.length).toBe(0);
    });
});
