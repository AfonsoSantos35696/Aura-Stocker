import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, Stock, MarketStock } from './services/portfolio.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  activeView: 'portfolio' | 'market' = 'portfolio';

  // Auth State
  isLoggedIn = false;
  currentUsername: string | null = null;
  authMode: 'login' | 'signup' = 'login';

  // Auth Form
  authUsername = '';
  authPassword = '';
  authErrorMessage: string | null = null;
  authSuccessMessage: string | null = null;
  authIsLoading = false;

  // Portfolio State
  portfolio: Stock[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  // Market State
  marketStocks: MarketStock[] = [];
  marketSearch = '';
  selectedMarketTicker = '';
  marketLoading = false;
  marketErrorMessage: string | null = null;
  marketLoaded = false;

  // Aggregate Metrics
  totalInvested = 0;
  totalCurrentValue = 0;
  totalReturn = 0;
  totalReturnPct = 0;

  // Modal State
  showModal = false;
  modalTitle = 'Adicionar Ação';
  modalMode: 'add' | 'edit' | 'buy' | 'sell' = 'add';

  // Error Modal State
  showErrorModal = false;
  errorModalTitle = 'Erro';
  errorModalMessage = '';

  // Form Model
  formStockId: string | null = null;
  formTicker = '';
  formCompanyName = '';
  formPurchaseDate = '';
  formQuantity = 0;
  formPurchasePrice = 0;

  get sellTotalValue(): number {
    if (this.modalMode !== 'sell') {
      return 0;
    }

    return Number((Number(this.formQuantity || 0) * Number(this.formPurchasePrice || 0)).toFixed(2));
  }

  get buyTotalValue(): number {
    if (this.modalMode !== 'buy') {
      return 0;
    }

    return Number((Number(this.formQuantity || 0) * Number(this.formPurchasePrice || 0)).toFixed(2));
  }

  constructor(
    private portfolioService: PortfolioService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkSession();
  }

  get filteredMarketStocks(): MarketStock[] {
    // If a ticker is selected in the dropdown, show only that stock
    if (this.selectedMarketTicker && this.selectedMarketTicker.trim() !== '') {
      return this.marketStocks.filter(s => s.ticker === this.selectedMarketTicker);
    }

    const query = this.marketSearch.trim().toLowerCase();
    if (!query) {
      return this.marketStocks;
    }

    return this.marketStocks.filter((stock) => {
      return stock.ticker.toLowerCase().includes(query) ||
        stock.companyName.toLowerCase().includes(query) ||
        stock.sector.toLowerCase().includes(query);
    });
  }

  onMarketSelect(ticker: string): void {
    this.selectedMarketTicker = ticker;
    // clear free-text search when using select
    if (ticker) {
      this.marketSearch = '';
    }
  }

  checkSession(): void {
    if (this.authService.isLoggedIn()) {
      this.isLoggedIn = true;
      this.currentUsername = this.authService.getUsername();
      this.loadPortfolio();
    }
  }

  switchView(view: 'portfolio' | 'market'): void {
    this.activeView = view;

    if (view === 'market' && !this.marketLoaded) {
      this.loadMarket();
    }
  }

  // --- Auth Handlers ---
  handleAuthSubmit(): void {
    if (!this.authUsername || !this.authPassword) {
      this.authErrorMessage = 'Por favor, preencha todos os campos.';
      return;
    }

    this.authIsLoading = true;
    this.authErrorMessage = null;
    this.authSuccessMessage = null;

    if (this.authMode === 'login') {
      this.authService.login(this.authUsername, this.authPassword).subscribe({
        next: (res) => {
          this.isLoggedIn = true;
          this.currentUsername = res.username;
          this.authUsername = '';
          this.authPassword = '';
          this.authIsLoading = false;
          this.loadPortfolio();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Login error:', err);
          this.authErrorMessage = err.error?.error || 'Falha ao iniciar sessão. Verifique as credenciais.';
          this.authIsLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.authService.signup(this.authUsername, this.authPassword).subscribe({
        next: () => {
          this.authSuccessMessage = 'Registo efetuado com sucesso! Faça login abaixo.';
          this.authMode = 'login';
          this.authPassword = '';
          this.authIsLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Signup error:', err);
          this.authErrorMessage = err.error?.error || 'Erro ao efetuar registo. Escolha outro utilizador.';
          this.authIsLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUsername = null;
    this.portfolio = [];
    this.marketStocks = [];
    this.marketLoaded = false;
    this.totalInvested = 0;
    this.totalCurrentValue = 0;
    this.totalReturn = 0;
    this.totalReturnPct = 0;
    this.authUsername = '';
    this.authPassword = '';
    this.authErrorMessage = null;
    this.authSuccessMessage = null;
    this.marketSearch = '';
    this.activeView = 'portfolio';
    this.cdr.detectChanges();
  }

  switchAuthMode(mode: 'login' | 'signup'): void {
    this.authMode = mode;
    this.authErrorMessage = null;
    this.authSuccessMessage = null;
  }

  // --- Portfolio Handlers ---
  loadPortfolio(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.portfolioService.getPortfolio().subscribe({
      next: (data) => {
        this.portfolio = data;
        this.calculateMetrics();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching portfolio:', err);
        this.errorMessage = 'Não foi possível carregar a carteira. Verifique a ligação à base de dados.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMarket(): void {
    this.marketLoading = true;
    this.marketErrorMessage = null;
    this.portfolioService.getMarketStocks().subscribe({
      next: (data) => {
        this.marketStocks = data;
        this.marketLoaded = true;
        this.marketLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching market data:', err);
        this.marketErrorMessage = 'Não foi possível carregar o mercado de ações. Verifique a API e a ligação ao servidor.';
        this.marketLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refreshCurrentView(): void {
    if (this.activeView === 'market') {
      this.loadMarket();
      return;
    }

    this.loadPortfolio();
  }

  calculateMetrics(): void {
    this.totalInvested = 0;
    this.totalCurrentValue = 0;

    this.portfolio.forEach(stock => {
      const cost = stock.quantity * stock.purchasePrice;
      const val = stock.quantity * (stock.currentPrice ?? stock.purchasePrice);

      this.totalInvested += cost;
      this.totalCurrentValue += val;
    });

    this.totalReturn = this.totalCurrentValue - this.totalInvested;
    this.totalReturnPct = this.totalInvested > 0 ? (this.totalReturn / this.totalInvested) * 100 : 0;

    this.portfolio.forEach(stock => {
      const stockVal = stock.quantity * (stock.currentPrice ?? stock.purchasePrice);
      stock.totalCost = stock.quantity * stock.purchasePrice;
      stock.currentValue = stockVal;

      const diff = (stock.currentPrice ?? stock.purchasePrice) - stock.purchasePrice;
      stock.variationPct = stock.purchasePrice > 0 ? (diff / stock.purchasePrice) * 100 : 0;

      stock.allocationPct = this.totalCurrentValue > 0 ? (stockVal / this.totalCurrentValue) * 100 : 0;
    });
  }

  openAddModal(): void {
    this.modalMode = 'add';
    this.modalTitle = 'Adicionar Ação';
    this.formStockId = null;
    this.formTicker = '';
    this.formCompanyName = '';
    this.formPurchaseDate = new Date().toISOString().substring(0, 10);
    this.formQuantity = 1;
    this.formPurchasePrice = 100;
    this.showModal = true;
  }

  openEditModal(stock: Stock): void {
    this.modalMode = 'edit';
    this.modalTitle = 'Editar Ação';
    this.formStockId = stock._id ?? null;
    this.formTicker = stock.ticker;
    this.formCompanyName = stock.companyName;

    const dateObj = new Date(stock.purchaseDate);
    this.formPurchaseDate = dateObj.toISOString().substring(0, 10);

    this.formQuantity = stock.quantity;
    this.formPurchasePrice = stock.purchasePrice;
    this.showModal = true;
    // on edit modal: keep purchasePrice controlled by stored value (not editable)
  }

  openBuyModal(stock: MarketStock): void {
    this.modalMode = 'buy';
    this.modalTitle = `Comprar ${stock.ticker}`;
    this.formStockId = null;
    this.formTicker = stock.ticker;
    this.formCompanyName = stock.companyName;
    this.formPurchaseDate = new Date().toISOString().substring(0, 10);
    this.formQuantity = 1;
    this.formPurchasePrice = stock.currentPrice;
    this.showModal = true;
    // on buy modal: price shown as static field (user cannot edit)
  }

  openSellModal(stock: Stock): void {
    this.modalMode = 'sell';
    this.modalTitle = `Vender ${stock.ticker}`;
    this.formStockId = stock._id ?? null;
    this.formTicker = stock.ticker;
    this.formCompanyName = stock.companyName;

    const dateObj = new Date(stock.purchaseDate);
    this.formPurchaseDate = dateObj.toISOString().substring(0, 10);

    this.formQuantity = 1;
    this.formPurchasePrice = stock.currentPrice ?? stock.purchasePrice;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalMode = 'add';
  }

  openErrorModal(message: string, title = 'Erro'): void {
    this.errorModalTitle = title;
    this.errorModalMessage = message;
    this.showErrorModal = true;
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorModalTitle = 'Erro';
    this.errorModalMessage = '';
  }

  saveStock(): void {
    if (!this.formTicker || !this.formCompanyName || !this.formPurchaseDate || this.formQuantity <= 0 || this.formPurchasePrice <= 0) {
      this.openErrorModal('Por favor, preencha todos os campos corretamente com valores positivos.');
      return;
    }

    if (this.modalMode === 'sell' && this.formStockId) {
      const currentStock = this.portfolio.find(stock => stock._id === this.formStockId);
      if (!currentStock) {
        this.openErrorModal('Não foi possível encontrar a ação a vender.');
        return;
      }

      const sellQuantity = Number(this.formQuantity);
      if (sellQuantity > currentStock.quantity) {
        this.openErrorModal('Não pode vender mais ações do que as que tem.');
        return;
      }

      if (sellQuantity === currentStock.quantity) {
        this.portfolioService.deleteStock(this.formStockId).subscribe({
          next: () => {
            this.loadPortfolio();
            this.closeModal();
          },
          error: (err) => {
            console.error('Error selling stock:', err);
            this.openErrorModal('Erro ao vender ação no servidor.');
          }
        });
        return;
      }

      const updatedStock: Stock = {
        ticker: currentStock.ticker,
        companyName: currentStock.companyName,
        purchaseDate: currentStock.purchaseDate,
        quantity: currentStock.quantity - sellQuantity,
        purchasePrice: currentStock.purchasePrice
      };

      this.portfolioService.updateStock(this.formStockId, updatedStock).subscribe({
        next: () => {
          this.loadPortfolio();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating stock after sale:', err);
          this.openErrorModal('Erro ao vender ação no servidor.');
        }
      });

      return;
    }

    const stockData: Stock = {
      ticker: this.formTicker.toUpperCase().trim(),
      companyName: this.formCompanyName.trim(),
      purchaseDate: this.formPurchaseDate,
      quantity: Number(this.formQuantity),
      purchasePrice: Number(this.formPurchasePrice)
    };

    if (this.formStockId) {
      this.portfolioService.updateStock(this.formStockId, stockData).subscribe({
        next: () => {
          this.loadPortfolio();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating stock:', err);
          this.openErrorModal('Erro ao atualizar ação no servidor.');
        }
      });
      return;
    }

    this.portfolioService.addStock(stockData).subscribe({
      next: () => {
        if (this.modalMode === 'buy') {
          this.activeView = 'portfolio';
        }

        this.loadPortfolio();
        this.closeModal();
      },
      error: (err) => {
        console.error('Error adding stock:', err);
        this.openErrorModal('Erro ao adicionar ação no servidor.');
      }
    });
  }

  deleteStock(id?: string): void {
    if (!id) return;

    if (confirm('Tem a certeza de que deseja remover esta ação da sua carteira?')) {
      this.portfolioService.deleteStock(id).subscribe({
        next: () => {
          this.loadPortfolio();
        },
        error: (err) => {
          console.error('Error deleting stock:', err);
          this.openErrorModal('Erro ao eliminar ação do servidor.');
        }
      });
    }
  }
}
