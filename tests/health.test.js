const { test, describe } = require('node:test');
const assert = require('node:assert');
const health = require('../src/app/health');
const app = require('../src/app/server');

describe('Health Module', () => {
  test('should return ok status and valid timestamp', async () => {
    const res = await health.check();
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(res.service, 'smart-health-monitor');
    assert.ok(res.uptime);
    assert.ok(res.timestamp);
    assert.ok(res.memory);
  });
});

describe('Server Routes', () => {
  test('app should be defined and configured', () => {
    assert.ok(app);
    assert.strictEqual(typeof app, 'function');
  });
});
