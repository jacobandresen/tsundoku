import {describe, it, expect} from 'vitest';

// Iteration 1: Smoke test — the module system works and we can import from React.
describe('scaffold (iteration 1)', () => {
  it('can import React', async () => {
    const React = await import('react');
    expect(React.version).toMatch(/^\d+\./);
  });

  it('can import tinybase', async () => {
    const {createStore} = await import('tinybase');
    const store = createStore();
    expect(typeof store.getTables).toBe('function');
    expect(store.getTables()).toEqual({});
  });
});
