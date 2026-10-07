require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { init: initSocket } = require('./services/socketService');
const { initCron } = require('./services/cronService');

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET must be set (16+ chars). Refusing to start.');
  process.exit(1);
}

connectDB()
  .then(() => {
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    initCron();
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
