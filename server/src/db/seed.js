require('dotenv').config();
const readline = require('readline');
const connectDB = require('./connection');
const Item = require('./models/Item');
const Order = require('./models/Order');
const Store = require('./models/Store');
const items = require('./seeds/items');
const stores = require('./seeds/stores');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function seed() {
  console.log('WARNING: This will permanently delete all existing stores, items, and orders, then reseed.');
  const answer = await confirm('Do you wish to proceed? (yes/no): ');

  if (answer !== 'yes') {
    console.log('Aborted.');
    process.exit(0);
  }

  await connectDB();

  await Order.deleteMany({});
  console.log('Cleared Orders collection');

  await Item.deleteMany({});
  console.log('Cleared Items collection');

  await Store.deleteMany({});
  console.log('Cleared Stores collection');

  const insertedStores = await Store.insertMany(stores);
  console.log(`Seeded ${insertedStores.length} stores`);

  const storeIdByChain = new Map(insertedStores.map(s => [s.chain, s._id]));
  const missingChains = new Set();
  const itemsToInsert = items
    .map(it => {
      const storeId = storeIdByChain.get(it.store);
      if (!storeId) {
        missingChains.add(it.store);
        return null;
      }
      return { ...it, store: storeId };
    })
    .filter(Boolean);

  if (missingChains.size) {
    console.warn(`Skipped items for unknown chains: ${[...missingChains].join(', ')}`);
  }

  const inserted = await Item.insertMany(itemsToInsert);
  console.log(`Seeded ${inserted.length} items`);

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
