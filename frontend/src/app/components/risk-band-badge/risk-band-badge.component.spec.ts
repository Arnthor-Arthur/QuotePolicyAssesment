import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskBand } from '../../models/quote.model';
import { RiskBandBadgeComponent } from './risk-band-badge.component';

describe('RiskBandBadgeComponent', () => {
    let fixture: ComponentFixture<RiskBandBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RiskBandBadgeComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(RiskBandBadgeComponent);
    });

    function render(riskBand: RiskBand): HTMLElement {
        fixture.componentRef.setInput('riskBand', riskBand);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('renders a friendly label and class for STANDARD', () => {
        const el = render('STANDARD');
        expect(el.textContent).toContain('Standard risk');
        expect(el.querySelector('.badge')?.classList.contains('standard')).toBe(true);
    });

    it('renders a friendly label and class for ELEVATED', () => {
        const el = render('ELEVATED');
        expect(el.textContent).toContain('Elevated risk');
        expect(el.querySelector('.badge')?.classList.contains('elevated')).toBe(true);
    });

    it('renders a friendly label and class for HIGH_RISK', () => {
        const el = render('HIGH_RISK');
        expect(el.textContent).toContain('High risk');
        expect(el.querySelector('.badge')?.classList.contains('high-risk')).toBe(true);
    });
});
