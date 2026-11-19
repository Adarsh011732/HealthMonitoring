// Health check logic reporting uptime, memory, and system status
async function check() {
  const memoryUsage = process.memoryUsage();
  return {
    status: 'ok',
    service: 'smart-health-monitor',
    uptime: `${process.uptime().toFixed(2)}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rssMb: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
      heapUsedMb: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2)
    }
  };
}

module.exports = { check };
