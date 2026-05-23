import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Stock {
  _id?: string;
  ticker: string;
  companyName: string;
  purchaseDate: string | Date;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  totalCost?: number;
  currentValue?: number;
  variationPct?: number;
  allocationPct?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketStock {
  ticker: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePct: number;
  isMock: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private apiUrl = 'http://localhost:3000/api/portfolio';
  private marketApiUrl = 'http://localhost:3000/api/market/stocks';

  constructor(private http: HttpClient) {}

  getPortfolio(): Observable<Stock[]> {
    return this.http.get<Stock[]>(this.apiUrl);
  }

  getMarketStocks(): Observable<MarketStock[]> {
    return this.http.get<MarketStock[]>(this.marketApiUrl);
  }

  addStock(stock: Stock): Observable<Stock> {
    return this.http.post<Stock>(this.apiUrl, stock);
  }

  updateStock(id: string, stock: Stock): Observable<Stock> {
    return this.http.put<Stock>(`${this.apiUrl}/${id}`, stock);
  }

  deleteStock(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
