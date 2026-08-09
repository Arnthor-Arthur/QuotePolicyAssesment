import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { QuoteRequest, QuoteResponse } from '../models/quote.model';

@Injectable({ providedIn: 'root' })
export class QuoteService {
    // Relative path — wiring this to the backend during local dev needs either
    // an `ng serve` proxy config or an absolute URL, not added here since it's
    // outside what was asked for.
    private readonly quoteUrl = '/policy/quote';

    constructor(private readonly http: HttpClient) {}

    getQuote(request: QuoteRequest): Observable<QuoteResponse> {
        return this.http.post<QuoteResponse>(this.quoteUrl, request);
    }
}
