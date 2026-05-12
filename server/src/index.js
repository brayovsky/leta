require('dotenv').config();
const connectDB = require('./db/connection');
const app = require('./app');
const { port } = require('./config');

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`\nListening on port ${port}\n`);
  });
});
