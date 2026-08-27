import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageMetaOf, nextPageOf } from './listPage.ts';

test('reads the 2.2 meta block', () => {
  assert.deepEqual(pageMetaOf({ data: [], meta: { page: 2, pageSize: 50, total: 120 } }), {
    page: 2,
    pageSize: 50,
    total: 120,
  });
});

test('reads the 2.1 top-level fields', () => {
  assert.deepEqual(pageMetaOf({ data: [], page: 1, pageSize: 20, total: 5, totalPages: 1 }), {
    page: 1,
    pageSize: 20,
    total: 5,
  });
});

test('next page stops at the last page', () => {
  assert.equal(nextPageOf({ data: [], meta: { page: 3, pageSize: 50, total: 120 } }), undefined);
  assert.equal(nextPageOf({ data: [], meta: { page: 2, pageSize: 50, total: 120 } }), 3);
  assert.equal(nextPageOf({ data: [], page: 1, pageSize: 20, total: 45, totalPages: 3 }), 2);
});

test('an empty list has no next page', () => {
  assert.equal(nextPageOf({ data: [], meta: { page: 1, pageSize: 50, total: 0 } }), undefined);
});
