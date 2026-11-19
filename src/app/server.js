require('dotenv').config();
const express = require('express');
const health = require('./health');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Health Monitor Service',
    status: 'running',
    docs: '/health'
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await health.check();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`[Health Server] Listening on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`[Health Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Health Server] Closed out remaining connections.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
