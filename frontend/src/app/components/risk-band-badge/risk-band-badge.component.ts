import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RiskBand } from '../../models/quote.model';

interface BadgeStyle {
    label: string;
    cssClass: string;
}

// Presentation only — this is the one place a risk band maps to a colour/label; it
// never touches score/multiplier logic, which stays entirely on the backend.
const BADGE_STYLES: Record<RiskBand, BadgeStyle> = {
    STANDARD: { label: 'Standard risk', cssClass: 'standard' },
    ELEVATED: { label: 'Elevated risk', cssClass: 'elevated' },
    HIGH_RISK: { label: 'High risk', cssClass: 'high-risk' },
};

@Component({
    selector: 'app-risk-band-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './risk-band-badge.component.html',
    styleUrl: './risk-band-badge.component.css',
})
export class RiskBandBadgeComponent {
    readonly riskBand = input.required<RiskBand>();

    readonly style = computed(() => BADGE_STYLES[this.riskBand()]);
}
