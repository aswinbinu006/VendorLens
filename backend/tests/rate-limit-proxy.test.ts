import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('E11 - TRUST_PROXY and Login Rate Limiter Behavior', () => {
  it('when TRUST_PROXY=1, login limiter keys on the forwarded client IP and isolates different clients', async () => {
    // Create test app with TRUST_PROXY = 1 (1 proxy hop trusted)
    const app = createApp({ TRUST_PROXY: 1 });

    const clientA = '203.0.113.195';
    const clientB = '198.51.100.22';

    // Send 5 requests from Client A (login limit is 5)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Requested-With', 'fetch')
        .set('X-Forwarded-For', clientA)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.clientIp).toBe(clientA);
    }

    // 6th request from Client A must be RATE_LIMITED (429)
    const blockedRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'fetch')
      .set('X-Forwarded-For', clientA)
      .send({});

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error.code).toBe('RATE_LIMITED');

    // Client B from a different IP should NOT be blocked (keys on forwarded IP)
    const clientBRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'fetch')
      .set('X-Forwarded-For', clientB)
      .send({});

    expect(clientBRes.status).toBe(200);
    expect(clientBRes.body.clientIp).toBe(clientB);
  });

  it('when TRUST_PROXY=false, Express ignores X-Forwarded-For header and uses socket address', async () => {
    // Create test app with TRUST_PROXY = false
    const app = createApp({ TRUST_PROXY: false });

    const spoofedIp = '203.0.113.99';

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'fetch')
      .set('X-Forwarded-For', spoofedIp)
      .send({});

    expect(res.status).toBe(200);
    // Express must ignore spoofed X-Forwarded-For and report local loopback socket IP
    expect(res.body.clientIp).not.toBe(spoofedIp);
    expect(['127.0.0.1', '::ffff:127.0.0.1', '::1']).toContain(res.body.clientIp);
  });
});
