const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/portfolio_db';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_aura_portfolio_123';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    ensureDemoUser();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// 1. User Schema & Model
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// 2. Stock Schema & Model (updated with userId)
const StockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticker: { type: String, required: true, uppercase: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  purchaseDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const Stock = mongoose.model('Stock', StockSchema);

const DEMO_USERNAME = 'afonsus';
const DEMO_PASSWORD = '1234';

const MARKET_CATALOG = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', sector: 'Tecnologia', basePrice: 196.4 },
  { ticker: 'MSFT', companyName: 'Microsoft', sector: 'Tecnologia', basePrice: 420.2 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', sector: 'Semicondutores', basePrice: 125.3 },
  { ticker: 'AMZN', companyName: 'Amazon.com, Inc.', sector: 'Consumo', basePrice: 182.8 },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.', sector: 'Tecnologia', basePrice: 174.6 },
  { ticker: 'META', companyName: 'Meta Platforms, Inc.', sector: 'Tecnologia', basePrice: 504.2 },
  { ticker: 'TSLA', companyName: 'Tesla, Inc.', sector: 'Automóvel', basePrice: 224.9 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', sector: 'Financeiro', basePrice: 197.5 },
  { ticker: 'NFLX', companyName: 'Netflix, Inc.', sector: 'Entretenimento', basePrice: 640.1 },
  { ticker: 'KO', companyName: 'The Coca-Cola Company', sector: 'Bebidas', basePrice: 62.4 }
];

function hashSymbol(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function getFallbackQuote(symbol, basePrice) {
  const hash = hashSymbol(symbol);
  const variationPct = ((hash % 17) - 8) / 100;
  const currentPrice = Number((basePrice * (1 + variationPct)).toFixed(2));
  const previousClose = Number((basePrice * (1 - variationPct / 2)).toFixed(2));
  return {
    currentPrice,
    previousClose,
    change: Number((currentPrice - previousClose).toFixed(2)),
    changePct: previousClose > 0 ? Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2)) : 0,
    isMock: true
  };
}

async function getMarketQuote(stockMeta) {
  if (FINNHUB_API_KEY && FINNHUB_API_KEY.trim() !== '') {
    try {
      const response = await axios.get('https://finnhub.io/api/v1/quote', {
        params: {
          symbol: stockMeta.ticker,
          token: FINNHUB_API_KEY
        },
        timeout: 5000
      });

      if (response.data && typeof response.data.c === 'number') {
        const currentPrice = Number(response.data.c.toFixed(2));
        const previousClose = Number((response.data.pc ?? currentPrice).toFixed(2));
        return {
          currentPrice,
          previousClose,
          change: Number((currentPrice - previousClose).toFixed(2)),
          changePct: previousClose > 0 ? Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2)) : 0,
          isMock: false
        };
      }
    } catch (apiError) {
      console.warn(`Error fetching live quote for ${stockMeta.ticker} from Finnhub:`, apiError.message);
    }
  }

  return getFallbackQuote(stockMeta.ticker, stockMeta.basePrice);
}

async function enrichStockWithQuote(stockMeta) {
  const quote = await getMarketQuote(stockMeta);
  return {
    ticker: stockMeta.ticker,
    companyName: stockMeta.companyName,
    sector: stockMeta.sector,
    currentPrice: quote.currentPrice,
    previousClose: quote.previousClose,
    change: quote.change,
    changePct: quote.changePct,
    isMock: quote.isMock
  };
}

// Helper function to seed initial data for a specific user
async function seedUserInitialData(userId) {
  try {
    const initialStocks = [
      {
        userId: userId,
        ticker: 'MSFT',
        companyName: 'Microsoft',
        purchaseDate: new Date('2026-03-01'),
        quantity: 20,
        purchasePrice: 320.00
      },
      {
        userId: userId,
        ticker: 'TSLA',
        companyName: 'TESLA',
        purchaseDate: new Date('2026-03-20'),
        quantity: 50,
        purchasePrice: 220.00
      }
    ];
    await Stock.insertMany(initialStocks);
    console.log(`Seeded default portfolio data for user: ${userId}`);
  } catch (error) {
    console.error('Error seeding data for user:', error);
  }
}

async function ensureDemoUser() {
  try {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
    const demoUser = await User.findOneAndUpdate(
      { username: DEMO_USERNAME },
      {
        username: DEMO_USERNAME,
        password: hashedPassword
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const demoStockCount = await Stock.countDocuments({ userId: demoUser._id });
    if (demoStockCount === 0) {
      await seedUserInitialData(demoUser._id);
    }

    console.log(`Demo user ready: ${DEMO_USERNAME}`);
  } catch (error) {
    console.error('Error ensuring demo user:', error);
  }
}

// 3. JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authenticated token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains userId and username
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// 4. AUTH Endpoints

// Signup (Register new user)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: cleanUsername,
      password: hashedPassword
    });

    const savedUser = await newUser.save();
    
    // Automatically seed portfolio for new users
    await seedUserInitialData(savedUser._id);

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// Login (Authenticate user and generate JWT)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Find the user
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Sign Token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      username: user.username,
      userId: user._id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

// 5. PORTFOLIO Endpoints (protected by authenticateToken)

// GET: Market overview with live or simulated quotes
app.get('/api/market/stocks', authenticateToken, async (req, res) => {
  try {
    const marketStocks = await Promise.all(MARKET_CATALOG.map(enrichStockWithQuote));
    res.json(marketStocks);
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({ error: 'Failed to retrieve market data' });
  }
});

// GET: All user stocks with quotes
app.get('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    // Find stocks belonging ONLY to this user
    const stocks = await Stock.find({ userId: req.user.userId });
    
    // Fetch live prices for each unique ticker from Finnhub or fallback to mock data
    const updatedStocks = await Promise.all(stocks.map(async (stock) => {
      const quote = await getMarketQuote({
        ticker: stock.ticker,
        companyName: stock.companyName,
        sector: 'Carteira',
        basePrice: stock.purchasePrice
      });

      const stockObj = stock.toObject();
      stockObj.currentPrice = quote.currentPrice;
      
      // Calculate totals
      stockObj.totalCost = Number((stockObj.quantity * stockObj.purchasePrice).toFixed(2));
      stockObj.currentValue = Number((stockObj.quantity * stockObj.currentPrice).toFixed(2));
      
      // Calculate variation
      const diff = stockObj.currentPrice - stockObj.purchasePrice;
      const variationPct = stockObj.purchasePrice > 0 ? (diff / stockObj.purchasePrice) * 100 : 0;
      stockObj.variationPct = Number(variationPct.toFixed(2));

      return stockObj;
    }));

    res.json(updatedStocks);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to retrieve portfolio data' });
  }
});

// POST: Add a new stock
app.post('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const { ticker, companyName, purchaseDate, quantity, purchasePrice } = req.body;
    
    if (!ticker || !companyName || !purchaseDate || quantity === undefined || purchasePrice === undefined) {
      return res.status(400).json({ error: 'All fields (ticker, companyName, purchaseDate, quantity, purchasePrice) are required.' });
    }

    const newStock = new Stock({
      userId: req.user.userId, // associate with the logged-in user
      ticker: ticker.toUpperCase(),
      companyName,
      purchaseDate: new Date(purchaseDate),
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice)
    });

    await newStock.save();
    res.status(201).json(newStock);
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// PUT: Update an existing stock
app.put('/api/portfolio/:id', authenticateToken, async (req, res) => {
  try {
    const { ticker, companyName, purchaseDate, quantity, purchasePrice } = req.body;
    const stockId = req.params.id;

    if (!ticker || !companyName || !purchaseDate || quantity === undefined || purchasePrice === undefined) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Find and update, ensuring the stock belongs to the current user
    const updatedStock = await Stock.findOneAndUpdate(
      { _id: stockId, userId: req.user.userId },
      {
        ticker: ticker.toUpperCase(),
        companyName,
        purchaseDate: new Date(purchaseDate),
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice)
      },
      { new: true }
    );

    if (!updatedStock) {
      return res.status(404).json({ error: 'Stock not found or unauthorized' });
    }

    res.json(updatedStock);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// DELETE: Remove stock
app.delete('/api/portfolio/:id', authenticateToken, async (req, res) => {
  try {
    const stockId = req.params.id;
    
    // Ensure the stock belongs to the current user before deleting
    const deletedStock = await Stock.findOneAndDelete({ _id: stockId, userId: req.user.userId });

    if (!deletedStock) {
      return res.status(404).json({ error: 'Stock not found or unauthorized' });
    }

    res.json({ message: 'Stock successfully deleted', id: stockId });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
