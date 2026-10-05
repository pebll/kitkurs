const test = require('node:test');
const assert = require('node:assert');
const { allocateCategories, plannedCourseNames } = require('../web_visu/assets/js/utils/categoryAllocation.js');

// Course factory: `kinds` lists which FoS categories the course may fill.
function course(name, ects, kinds = [], extra = {}) {
    return { Name: name, ECTS: ects, kinds, matchesFos: true, ...extra };
}
const classify = c => ({
    isThesis: !!c.thesis,
    isInterdisciplinary: !!c.inter,
    matchesFos: c.matchesFos,
    canMethodical: c.kinds.includes('methodical'),
    canGeneral: c.kinds.includes('general'),
    canAdditive: c.kinds.includes('additive'),
    canElective: c.kinds.includes('elective')
});
const run = courses => allocateCategories(courses, classify);
const cats = r => r.assignments.map(a => a.category);

test('default additive requirement is 36', () => {
    const r = run([]);
    assert.strictEqual(r.required.additive, 36);
    assert.strictEqual(r.required.general, 16);
    assert.strictEqual(r.required.methodical, 8);
});

test('extra general CP reduce the additive requirement', () => {
    const r = run([course('g1', 6, ['general']), course('g2', 6, ['general']), course('g3', 6, ['general']), course('g4', 4, ['general'])]);
    // 22 general: 16 + overflow
    assert.strictEqual(r.totals.general, 22);
    assert.strictEqual(r.required.additive, 30);
});

test('extra methodical CP reduce the additive requirement', () => {
    const r = run([course('m1', 6, ['methodical']), course('m2', 6, ['methodical']), course('m3', 4, ['methodical'])]);
    assert.strictEqual(r.totals.methodical, 16);
    assert.strictEqual(r.required.additive, 36 - 8);
});

test('methodical fills first, then general, then additive', () => {
    const r = run([
        course('a', 8, ['methodical', 'general', 'additive']),
        course('b', 16, ['methodical', 'general', 'additive']),
        course('c', 6, ['methodical', 'general', 'additive'])
    ]);
    assert.deepStrictEqual(cats(r), ['methodical', 'general', 'additive']);
});

test('additive-only course fills additive', () => {
    const r = run([course('x', 6, ['additive'])]);
    assert.deepStrictEqual(cats(r), ['additive']);
    assert.strictEqual(r.totals.additive, 6);
});

test('soft limit: 6 CP course with general at 14 makes general 20', () => {
    const r = run([course('g', 14, ['general']), course('h', 6, ['general'])]);
    assert.strictEqual(r.totals.general, 20);
    assert.strictEqual(r.assignments[1].category, 'general');
});

test('extra general course overflows into general once methodical/general/additive are full', () => {
    const r = run([
        course('g', 16, ['general']),
        course('a', 36, ['additive']),
        course('more', 4, ['general'])
    ]);
    // pool = 16 + 36 = 52 < 60 so still counted
    assert.strictEqual(r.assignments[2].category, 'general');
    assert.strictEqual(r.assignments[2].overflow, true);
    assert.strictEqual(r.required.additive, 60 - 20 - 8);
});

test('pool capped at 60 sends later FoS course to elective', () => {
    const r = run([
        course('g', 16, ['general']),
        course('m', 8, ['methodical']),
        course('a', 36, ['additive']),
        course('late', 6, ['additive', 'elective'])
    ]);
    assert.strictEqual(r.assignments[3].category, 'electiveArea');
    assert.strictEqual(r.totals.additive, 36);
    assert.strictEqual(r.totals.electiveArea, 6);
});

test('pool capped at 60 and not elective-capable leaves course uncounted', () => {
    const r = run([
        course('g', 16, ['general']), course('m', 8, ['methodical']), course('a', 36, ['additive']),
        course('late', 6, ['additive'])
    ]);
    assert.strictEqual(r.assignments[3].category, null);
});

test('course not matching selected FoS goes to elective', () => {
    const r = run([course('o', 6, ['general', 'elective'], { matchesFos: false })]);
    assert.deepStrictEqual(cats(r), ['electiveArea']);
    assert.strictEqual(r.totals.general, 0);
});

test('course matching nothing is uncounted', () => {
    const r = run([course('n', 6, [])]);
    assert.deepStrictEqual(cats(r), [null]);
});

test('elective soft limit: stops adding once 22 reached', () => {
    const r = run([course('e1', 22, ['elective']), course('e2', 3, ['elective'])]);
    assert.deepStrictEqual(cats(r), ['electiveArea', null]);
});

test('thesis and interdisciplinary are untouched by the FoS rules', () => {
    const r = run([
        course('t', 30, [], { thesis: true }),
        course('i', 8, ['general'], { inter: true })
    ]);
    assert.deepStrictEqual(cats(r), ['thesis', 'interdisciplinary']);
    assert.strictEqual(r.totals.thesis, 30);
    assert.strictEqual(r.totals.interdisciplinary, 8);
    assert.strictEqual(r.required.additive, 36);
});

test('required additive never negative', () => {
    const r = run([course('g', 30, ['general']), course('m', 30, ['methodical'])]);
    assert.strictEqual(r.required.additive, 0);
});

test('ECTS strings are parsed, invalid counts as 0', () => {
    const r = run([course('s', '6', ['additive']), course('b', 'x', ['additive'])]);
    assert.strictEqual(r.totals.additive, 6);
});

test('plannedCourseNames collects names from every semester', () => {
    const plan = JSON.stringify({ semester1: [{ Name: 'A' }, { Name: 'B' }], semester2: [{ Name: 'C' }] });
    assert.deepStrictEqual([...plannedCourseNames(plan)].sort(), ['A', 'B', 'C']);
});

test('plannedCourseNames tolerates missing or invalid plans', () => {
    assert.strictEqual(plannedCourseNames(null).size, 0);
    assert.strictEqual(plannedCourseNames('{oops').size, 0);
    assert.strictEqual(plannedCourseNames('42').size, 0);
    assert.strictEqual(plannedCourseNames(JSON.stringify({ s: 'nope', t: [null, {}, { Name: 'Z' }] })).size, 1);
});
