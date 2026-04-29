const test = require('node:test');
const assert = require('node:assert/strict');
const { formatRemaining } = require('../src/format');

test('formatRemaining renders a short human duration', () => {
  assert.equal(formatRemaining(5 * 60 * 1000), '5m');
  assert.equal(formatRemaining(2 * 60 * 60 * 1000), '2h 0m');
  assert.equal(formatRemaining(27 * 60 * 60 * 1000), '1j 3h');
  assert.equal(formatRemaining(0), 'reset atteint');
});
