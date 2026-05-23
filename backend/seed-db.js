const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in backend/.env');
  process.exit(1);
}

// Schema definition (matches server.js)
const StockSchema = new mongoose.Schema({
  ticker: { type: String, required: true, uppercase: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  purchaseDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const Stock = mongoose.model('Stock', StockSchema);

async function seed() {
  console.log('Connecting to MongoDB Atlas at:', MONGO_URI.replace(/:([^@]+)@/, ':****@')); // Hide password in logs
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB Atlas!');

    // Check if collection has data
    const count = await Stock.countDocuments();
    console.log(`Current document count in 'stocks' collection: ${count}`);

    if (count === 0) {
      console.log('Inserting initial seed documents (MSFT and TSLA)...');
      const initialStocks = [
        {
          ticker: 'MSFT',
          companyName: 'Microsoft',
          purchaseDate: new Date('2026-03-01'),
          quantity: 20,
          purchasePrice: 320.00
        },
        {
          ticker: 'TSLA',
          companyName: 'TESLA',
          purchaseDate: new Date('2026-03-20'),
          quantity: 50,
          purchasePrice: 220.00
        }
      ];

      await Stock.insertMany(initialStocks);
      console.log('Successfully seeded the MongoDB Atlas database!');
    } else {
      console.log('The collection already contains data. Seeding skipped to avoid duplicates.');
    }

  } catch (error) {
    console.error('Error seeding MongoDB Atlas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
