const test = require('node:test');
const assert = require('node:assert');
const { fuzzyMatch } = require('../web_visu/assets/js/utils/fuzzy.js');

const NAME = 'Robotik I - Einführung in die Robotik';

test('empty query matches everything', () => {
    assert.ok(fuzzyMatch(NAME, ''));
    assert.ok(fuzzyMatch(NAME, '   '));
});

test('exact substring still matches, case-insensitive', () => {
    assert.ok(fuzzyMatch(NAME, 'robotik'));
    assert.ok(fuzzyMatch(NAME, 'EINF'));
});

test('words may appear in any order', () => {
    assert.ok(fuzzyMatch(NAME, 'einführung robotik'));
});

test('umlauts and diacritics are normalized', () => {
    assert.ok(fuzzyMatch(NAME, 'einfuhrung'));
    assert.ok(fuzzyMatch(NAME, 'einfuehrung'));
});

test('tolerates typos in longer words', () => {
    assert.ok(fuzzyMatch(NAME, 'robtik'));
    assert.ok(fuzzyMatch(NAME, 'rbootik'));
    assert.ok(fuzzyMatch('Machine Learning', 'machin lerning'));
    assert.ok(fuzzyMatch('Regelungstechnik', 'regelungstechnick'));
});

test('typo tolerance applies to word prefixes', () => {
    assert.ok(fuzzyMatch('Machine Learning', 'lern'));
});

test('rejects unrelated queries', () => {
    assert.ok(!fuzzyMatch(NAME, 'thermodynamik'));
    assert.ok(!fuzzyMatch(NAME, 'xyz'));
    assert.ok(!fuzzyMatch(NAME, 'robotik thermo'));
});

test('short tokens require an exact substring', () => {
    assert.ok(fuzzyMatch(NAME, 'i'));
    assert.ok(!fuzzyMatch(NAME, 'qx'));
});
