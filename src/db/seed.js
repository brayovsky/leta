require('dotenv').config();
const readline = require('readline');
const connectDB = require('./connection');
const Item = require('./models/Item');
const items = require('./seeds/items');

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
  console.log('WARNING: This will permanently delete all existing items and reseed from items.js');
  const answer = await confirm('Do you wish to proceed? (yes/no): ');

  if (answer !== 'yes') {
    console.log('Aborted.');
    process.exit(0);
  }

  await connectDB();

  await Item.deleteMany({});
  console.log('Cleared Items collection');

  const inserted = await Item.insertMany(items);
  console.log(`Seeded ${inserted.length} items`);

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
