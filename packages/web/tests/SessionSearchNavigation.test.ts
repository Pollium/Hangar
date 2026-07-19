import assert from 'node:assert/strict';
import test from 'node:test';
import { nextSessionSearchIndex } from '#session-search-navigation';

test('moves through session search results with arrow keys', () => {
    assert.equal(nextSessionSearchIndex(0, 3, 'ArrowDown'), 1);
    assert.equal(nextSessionSearchIndex(2, 3, 'ArrowDown'), 0);
    assert.equal(nextSessionSearchIndex(0, 3, 'ArrowUp'), 2);
    assert.equal(nextSessionSearchIndex(2, 3, 'ArrowUp'), 1);
});

test('supports Home/End and an empty result set', () => {
    assert.equal(nextSessionSearchIndex(1, 3, 'Home'), 0);
    assert.equal(nextSessionSearchIndex(1, 3, 'End'), 2);
    assert.equal(nextSessionSearchIndex(0, 0, 'ArrowDown'), -1);
});
