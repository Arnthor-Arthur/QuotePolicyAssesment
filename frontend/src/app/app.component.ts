import { Component, signal } from '@angular/core';
import { ComparisonResultComponent } from './components/comparison-result/comparison-result.component';
import { QuoteFormComponent } from './components/quote-form/quote-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuoteFormComponent, ComparisonResultComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'PolicyQuote';

  readonly comparisonMode = signal(false);

  toggleComparisonMode(): void {
    this.comparisonMode.set(!this.comparisonMode());
  }
}
