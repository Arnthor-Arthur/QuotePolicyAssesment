import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { QuoteResponse } from '../../models/quote.model';
import { RiskBandBadgeComponent } from '../risk-band-badge/risk-band-badge.component';
import { QuoteComparisonService } from '../../services/quote-comparison.service';

@Component({
    selector: 'app-comparison-result',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CurrencyPipe, RiskBandBadgeComponent],
    templateUrl: './comparison-result.component.html',
    styleUrl: './comparison-result.component.css',
})
export class ComparisonResultComponent {
    readonly comparisonA = input.required<QuoteResponse>();
    readonly comparisonB = input.required<QuoteResponse>();

    readonly comparison = computed(() =>
        this.quoteComparisonService.compareQuotes(this.comparisonA(), this.comparisonB()),
    );

    constructor(private readonly quoteComparisonService: QuoteComparisonService) {}
}
