import {
  resolveHealthUrl,
  shouldAttemptLoopbackFailover,
} from './failover';

describe('api failover helpers', () => {
  it('maps api base url to health endpoint', () => {
    expect(resolveHealthUrl('http://localhost:8000/api')).toBe('http://localhost:8000/health');
    expect(resolveHealthUrl('http://localhost:8000/api/')).toBe('http://localhost:8000/health');
  });

  it('attempts loopback failover only for first network failure', () => {
    const error = { code: 'ERR_NETWORK', message: 'Network Error' };
    const requestConfig = { baseURL: 'http://localhost:8000/api' };

    expect(shouldAttemptLoopbackFailover(error, requestConfig, 'http://localhost:8000/api')).toBe(true);

    expect(shouldAttemptLoopbackFailover(
      error,
      { ...requestConfig, __loopbackFailoverAttempted: true },
      'http://localhost:8000/api',
    )).toBe(false);
  });
});
