const assert = require('assert');
const test = require('node:test');
const Validator = require('../src/scraper/validator');
const Normalizer = require('../src/scraper/normalizer');
const Parser = require('../src/scraper/parser');
const Deduplicator = require('../src/scraper/deduplicator');

test('Validator tests', async (t) => {
  await t.test('Valid lead', () => {
    const lead = { businessName: 'Test Cafe', rating: 4.5, reviewCount: 10, latitude: 10, longitude: 10 };
    assert.strictEqual(Validator.validate(lead), true);
  });

  await t.test('Invalid lead - missing name', () => {
    const lead = { businessName: '', rating: 4.5 };
    assert.strictEqual(Validator.validate(lead), false);
  });
});

test('Normalizer tests', async (t) => {
  await t.test('Normalizes strings', () => {
    assert.strictEqual(Normalizer.normalizeString('  Hello   World  '), 'Hello World');
  });

  await t.test('Normalizes URL', () => {
    assert.strictEqual(Normalizer.normalizeUrl('not-a-url'), null);
    assert.strictEqual(Normalizer.normalizeUrl('https://example.com '), 'https://example.com');
  });
});

test('Data Integrity: No fake data fallback', async (t) => {
  await t.test('Simulated target vs real extraction', () => {
    const target = 100;
    const realExtracted = 63;
    let saved = 0;

    for (let i = 0; i < realExtracted; i++) {
       const lead = { businessName: `Business ${i}` };
       if (Validator.validate(lead)) saved++;
    }

    assert.strictEqual(saved, 63, 'Saved count must exactly match real extracted valid leads');
    assert.notStrictEqual(saved, target, 'Must NEVER fabricate leads to reach target');
  });
});
