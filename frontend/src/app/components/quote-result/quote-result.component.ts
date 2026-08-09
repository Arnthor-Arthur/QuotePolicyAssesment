import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QuoteResponse } from '../../models/quote.model';
import { RiskBandBadgeComponent } from '../risk-band-badge/risk-band-badge.component';

@Component({
    selector: 'app-quote-result',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CurrencyPipe, RiskBandBadgeComponent],
    templateUrl: './quote-result.component.html',
    styleUrl: './quote-result.component.css',
})
export class QuoteResultComponent {
    // Renders exactly what the backend sent — no recomputation of score, band, or
    // premiums here; that logic lives entirely in the backend risk engine.
    readonly quote = input.required<QuoteResponse>();
}
