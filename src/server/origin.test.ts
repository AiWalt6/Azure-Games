import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowsSocketRequest } from './origin.ts';

test('production accepts same-origin polling without Origin and WebSocket requests with the exact public origin', () => {
  const origin = 'https://bingo.example.com';
  assert.equal(allowsSocketRequest({ 'sec-fetch-site': 'same-origin' }, origin, true), true);
  assert.equal(allowsSocketRequest({ origin }, origin, true), true);
  assert.equal(allowsSocketRequest({ origin: 'https://other.example.com', 'sec-fetch-site': 'same-origin' }, origin, true), false);
  assert.equal(allowsSocketRequest({ 'sec-fetch-site': 'cross-site' }, origin, true), false);
  assert.equal(allowsSocketRequest({}, origin, true), false);
  assert.equal(allowsSocketRequest({}, undefined, true), false);
  assert.equal(allowsSocketRequest({}, undefined, false), true);
});
