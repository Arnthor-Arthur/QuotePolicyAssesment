import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteResponse } from '../../models/quote.model';
import { ComparisonResultComponent } from './comparison-result.component';

describe('ComparisonResultComponent', () => {
    let fixture: ComponentFixture<ComparisonResultComponent>;

    const quoteA: QuoteResponse = {
        monthlyPremium: 30,
        annualPremium: 360,
        riskBand: 'STANDARD',
        riskScore: 10,
        riskSummary: 'Quote A summary',
        coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.25 },
        appliedFactors: [{ id: 'shared_one', description: 'Shared factor', points: 10 }],
        kbVersion: '1.0.0',
    };

    const quoteB: QuoteResponse = {
        monthlyPremium: 45,
        annualPremium: 540,
        riskBand: 'ELEVATED',
        riskScore: 45,
        riskSummary: 'Quote B summary',
        coverageDetails: { basePremium: 300, coverageLoadFactor: 1.2, riskMultiplier: 1.5 },
        appliedFactors: [
            { id: 'shared_one', description: 'Shared factor', points: 10 },
            { id: 'only_b', description: 'Only in B', points: 25 },
        ],
        kbVersion: '1.0.0',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComparisonResultComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ComparisonResultComponent);
        fixture.componentRef.setInput('comparisonA', quoteA);
        fixture.componentRef.setInput('comparisonB', quoteB);
        fixture.detectChanges();
    });

    it('computes the comparison via the service and exposes it as a signal', () => {
        const comparison = fixture.componentInstance.comparison();
        expect(comparison.cheaperOption).toBe('A');
        expect(comparison.monthlyPremiumDifference).toBe(15);
        expect(comparison.riskBandChanged).toBe(true);
        expect(comparison.factorsOnlyInB.map((f) => f.id)).toEqual(['only_b']);
        expect(comparison.sharedFactors.map((f) => f.id)).toEqual(['shared_one']);
    });

    it('renders both risk bands and highlights the cheaper premium', () => {
        const el = fixture.nativeElement as HTMLElement;
        const text = el.textContent ?? '';

        expect(text).toContain('Standard risk');
        expect(text).toContain('Elevated risk');
        expect(text).toContain('£30.00');
        expect(text).toContain('£45.00');
        expect(text).toContain('Quote A is £15.00 cheaper per month.');
        expect(text).toContain('The risk band differs between the two quotes.');

        const cells = el.querySelectorAll('td.cheaper');
        expect(cells.length).toBe(1);
        expect(cells[0].textContent).toContain('£30.00');
    });

    it('renders factorsOnlyInA, factorsOnlyInB, and sharedFactors as three separate lists', () => {
        const el = fixture.nativeElement as HTMLElement;
        const lists = el.querySelectorAll('.factor-list');
        expect(lists.length).toBe(3);

        const [onlyA, onlyB, shared] = Array.from(lists).map((list) => list.textContent ?? '');
        expect(onlyA).toContain('None'); // quoteA has no factor absent from quoteB
        expect(onlyB).toContain('Only in B');
        expect(shared).toContain('Shared factor');
    });

    it('reports "equal" with no cheaper cell when premiums match', () => {
        fixture.componentRef.setInput('comparisonB', { ...quoteB, monthlyPremium: quoteA.monthlyPremium });
        fixture.detectChanges();

        expect(fixture.componentInstance.comparison().cheaperOption).toBe('equal');
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelectorAll('td.cheaper').length).toBe(0);
        expect(el.textContent).toContain('Both quotes cost the same per month.');
    });
});
