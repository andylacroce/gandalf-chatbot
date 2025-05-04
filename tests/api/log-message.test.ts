// Polyfill TextDecoder for Node.js test environment
import { TextDecoder } from 'util';
if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

// Tests for the /api/log-message endpoint
import handler from '../../pages/api/log-message';
import { createMocks } from 'node-mocks-http';

describe('/api/log-message', () => {
  it('returns 200 for valid POST', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        sender: 'user',
        text: 'hello',
        sessionId: 'abc12345',
        sessionDatetime: '2025-05-03T12-00-00',
      },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty('success', true);
  });

  it('returns 400 for missing fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { sender: 'user' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 405 for GET', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
