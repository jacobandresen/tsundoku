import {describe, it, expect, beforeAll, afterAll} from 'vitest';

// Iteration 1: Smoke test — server starts and health endpoint responds.
// Full sync tests are added in Iteration 3.

describe('server scaffold (iteration 1)', () => {
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    // Dynamically import to avoid top-level side-effects in test environment
    const {createServer} = await import('http');
    const express = (await import('express')).default;

    const app = express();
    app.get('/health', (_req, res) => res.json({status: 'ok', service: 'tsundoku'}));

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as {port: number};
    baseUrl = `http://localhost:${addr.port}`;
    closeServer = () => new Promise((resolve) => server.close(() => resolve()));
  });

  afterAll(async () => {
    await closeServer();
  });

  it('responds to GET /health with status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body).toEqual({status: 'ok', service: 'tsundoku'});
  });
});
