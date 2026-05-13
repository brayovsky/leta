require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');

async function reindex() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Dropping existing indexes on items...');
  await Item.collection.dropIndexes();
  console.log('Rebuilding indexes...');
  await Item.syncIndexes();
  console.log('Done.');
  await mongoose.disconnect();
}

reindex().catch(err => { console.error(err); process.exit(1); });
