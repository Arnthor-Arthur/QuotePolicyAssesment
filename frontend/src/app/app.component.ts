import { Component } from '@angular/core';
import { QuoteFormComponent } from './components/quote-form/quote-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuoteFormComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'PolicyQuote';
}
