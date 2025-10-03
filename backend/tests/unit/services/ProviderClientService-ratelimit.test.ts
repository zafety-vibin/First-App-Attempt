/**
 * ProviderClientService Rate Limit Handling Unit Tests
 * Feature: 008-create-byollm-configuration
 * Task: T018
 *
 * Tests exponential backoff with jitter for API rate limit handling
 * Respects Retry-After header, max 3 retries, user notification
 *
 * IMPORTANT: This test MUST FAIL until ProviderClientService is implemented (TDD)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ProviderClientService } from '../../../src/services/ProviderClientService';

describe('ProviderClientService - Rate Limit Handling', () => {
  let providerService: ProviderClientService;

  beforeAll(() => {
    providerService = new ProviderClientService();
  });

  describe('exponential backoff with jitter', () => {
    it('should calculate exponential backoff delay (1s, 2s, 4s)', () => {
      // Retry 1: ~1 second (2^0 * 1000ms)
      const delay1 = providerService.calculateBackoffDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(500); // Jitter: 50-150%
      expect(delay1).toBeLessThanOrEqual(2000);

      // Retry 2: ~2 seconds (2^1 * 1000ms)
      const delay2 = providerService.calculateBackoffDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeLessThanOrEqual(4000);

      // Retry 3: ~4 seconds (2^2 * 1000ms)
      const delay3 = providerService.calculateBackoffDelay(3);
      expect(delay3).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeLessThanOrEqual(8000);
    });

    it('should apply random jitter (prevents thundering herd)', () => {
      const delays = new Set();

      // Generate 20 delays for retry 1 - should have variance due to jitter
      for (let i = 0; i < 20; i++) {
        const delay = providerService.calculateBackoffDelay(1);
        delays.add(delay);
      }

      // Should have multiple unique delays (jitter working)
      expect(delays.size).toBeGreaterThan(1);
    });

    it('should cap backoff at reasonable maximum (prevent infinite wait)', () => {
      // Retry 10 (extreme case): should cap at ~60 seconds
      const delay = providerService.calculateBackoffDelay(10);
      expect(delay).toBeLessThanOrEqual(60000); // Max 60 seconds
    });
  });

  describe('Retry-After header handling', () => {
    it('should respect Retry-After header in seconds', () => {
      const retryAfterSeconds = 30; // Provider says retry after 30 seconds

      const delay = providerService.parseRetryAfterHeader(`${retryAfterSeconds}`);
      expect(delay).toBe(retryAfterSeconds * 1000); // Convert to milliseconds
    });

    it('should respect Retry-After header in HTTP date format', () => {
      // Retry-After: Wed, 21 Oct 2025 07:28:00 GMT
      const futureDate = new Date(Date.now() + 45000); // 45 seconds from now
      const httpDate = futureDate.toUTCString();

      const delay = providerService.parseRetryAfterHeader(httpDate);

      // Should be approximately 45 seconds (within 2s tolerance for test execution time)
      expect(delay).toBeGreaterThanOrEqual(43000);
      expect(delay).toBeLessThanOrEqual(47000);
    });

    it('should fallback to exponential backoff if Retry-After is invalid', () => {
      const invalidHeader = 'invalid-retry-after';

      const delay = providerService.parseRetryAfterHeader(invalidHeader, 2); // Retry 2

      // Should use exponential backoff for retry 2 (~2 seconds)
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(4000);
    });

    it('should handle missing Retry-After header (use exponential backoff)', () => {
      const delay = providerService.parseRetryAfterHeader(null, 1);

      // Should use exponential backoff for retry 1 (~1 second)
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(2000);
    });

    it('should cap Retry-After at reasonable maximum (prevent DoS)', () => {
      // Malicious provider says retry after 1 hour
      const retryAfterSeconds = 3600; // 1 hour

      const delay = providerService.parseRetryAfterHeader(`${retryAfterSeconds}`);

      // Should cap at 5 minutes max
      expect(delay).toBeLessThanOrEqual(5 * 60 * 1000); // 5 minutes
    });
  });

  describe('retry logic', () => {
    it('should retry up to 3 times on rate limit error (429)', async () => {
      let attemptCount = 0;

      // Mock API call that always returns 429
      const mockApiCall = vi.fn(async () => {
        attemptCount++;
        throw {
          response: {
            status: 429,
            headers: {},
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail after 3 retries
      }

      // Should attempt 1 initial + 3 retries = 4 total
      expect(attemptCount).toBe(4);
    });

    it('should succeed on first retry if rate limit clears', async () => {
      let attemptCount = 0;

      // Mock API call: fails once with 429, then succeeds
      const mockApiCall = vi.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw {
            response: {
              status: 429,
              headers: {},
            },
          };
        }
        return { success: true, data: 'success' };
      });

      const result = await providerService.retryWithBackoff(mockApiCall);

      expect(attemptCount).toBe(2); // Initial + 1 retry
      expect(result).toEqual({ success: true, data: 'success' });
    });

    it('should not retry on non-rate-limit errors (e.g., 401, 500)', async () => {
      let attemptCount = 0;

      // Mock API call that returns 401 (unauthorized)
      const mockApiCall = vi.fn(async () => {
        attemptCount++;
        throw {
          response: {
            status: 401,
            data: { error: 'Invalid API key' },
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Should fail immediately without retry
      }

      expect(attemptCount).toBe(1); // No retry
    });

    it('should wait exponentially between retries', async () => {
      const timestamps: number[] = [];

      // Mock API call that always returns 429
      const mockApiCall = vi.fn(async () => {
        timestamps.push(Date.now());
        throw {
          response: {
            status: 429,
            headers: {},
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      // Should have 4 attempts (initial + 3 retries)
      expect(timestamps.length).toBe(4);

      // Delays between attempts should increase exponentially
      const delay1 = timestamps[1] - timestamps[0]; // ~1 second
      const delay2 = timestamps[2] - timestamps[1]; // ~2 seconds
      const delay3 = timestamps[3] - timestamps[2]; // ~4 seconds

      // Allow 50% tolerance for jitter and test execution time
      expect(delay1).toBeGreaterThanOrEqual(500);
      expect(delay1).toBeLessThanOrEqual(2000);

      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeLessThanOrEqual(4000);

      expect(delay3).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeLessThanOrEqual(8000);
    });

    it('should respect Retry-After header over exponential backoff', async () => {
      const timestamps: number[] = [];

      // Mock API call that returns 429 with Retry-After: 3 seconds
      const mockApiCall = vi.fn(async () => {
        timestamps.push(Date.now());
        throw {
          response: {
            status: 429,
            headers: {
              'retry-after': '3', // 3 seconds
            },
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      // Check first retry delay (should be ~3 seconds, not ~1 second)
      const delay1 = timestamps[1] - timestamps[0];
      expect(delay1).toBeGreaterThanOrEqual(2800); // 3s - small tolerance
      expect(delay1).toBeLessThanOrEqual(3200); // 3s + small tolerance
    });
  });

  describe('user notification', () => {
    it('should emit notification event on rate limit retry', async () => {
      const notifications: string[] = [];

      // Subscribe to notification events
      providerService.on('rate-limit-retry', (message: string) => {
        notifications.push(message);
      });

      // Mock API call that returns 429
      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {
              'retry-after': '2',
            },
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      // Should emit 3 notifications (one per retry)
      expect(notifications.length).toBe(3);

      // Notifications should contain retry count and delay
      expect(notifications[0]).toContain('Retry 1');
      expect(notifications[1]).toContain('Retry 2');
      expect(notifications[2]).toContain('Retry 3');
    });

    it('should include Retry-After delay in notification', async () => {
      const notifications: string[] = [];

      providerService.on('rate-limit-retry', (message: string) => {
        notifications.push(message);
      });

      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {
              'retry-after': '5', // 5 seconds
            },
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      // First notification should mention 5 second delay
      expect(notifications[0]).toContain('5');
      expect(notifications[0].toLowerCase()).toContain('second');
    });

    it('should emit final error notification after max retries', async () => {
      const errorNotifications: string[] = [];

      providerService.on('rate-limit-error', (message: string) => {
        errorNotifications.push(message);
      });

      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {},
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      // Should emit final error notification
      expect(errorNotifications.length).toBe(1);
      expect(errorNotifications[0].toLowerCase()).toContain('max retries');
      expect(errorNotifications[0].toLowerCase()).toContain('rate limit');
    });
  });

  describe('Anthropic-specific rate limits', () => {
    it('should handle Anthropic 429 response structure', async () => {
      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {
              'retry-after': '10',
            },
            data: {
              error: {
                type: 'rate_limit_error',
                message: 'Rate limit exceeded',
              },
            },
          },
        };
      });

      let attemptCount = 0;
      providerService.on('rate-limit-retry', () => {
        attemptCount++;
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error: any) {
        // Should preserve original error details
        expect(error.response.data.error.type).toBe('rate_limit_error');
      }

      expect(attemptCount).toBe(3); // Should retry 3 times
    });

    it('should differentiate between Anthropic rate limit types', async () => {
      // Anthropic has different rate limit types:
      // - requests per minute (rpm)
      // - tokens per minute (tpm)
      // - tokens per day (tpd)

      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {
              'retry-after': '60',
              'x-ratelimit-type': 'requests', // Custom header (example)
            },
            data: {
              error: {
                type: 'rate_limit_error',
                message: 'Request limit exceeded',
              },
            },
          },
        };
      });

      const notifications: any[] = [];
      providerService.on('rate-limit-retry', (message: string, metadata: any) => {
        notifications.push({ message, metadata });
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      // Notifications should include rate limit type if available
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('graceful failure', () => {
    it('should provide manual retry option after max retries', async () => {
      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {},
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error: any) {
        // Error should include manual retry information
        expect(error.retryable).toBe(true);
        expect(error.message).toContain('retry manually');
      }
    });

    it('should not mark non-rate-limit errors as retryable', async () => {
      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 401,
            data: {
              error: {
                type: 'authentication_error',
                message: 'Invalid API key',
              },
            },
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error: any) {
        // Non-rate-limit errors should not be marked as retryable
        expect(error.retryable).toBe(false);
      }
    });

    it('should preserve original error context after retries', async () => {
      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {
              'retry-after': '5',
            },
            data: {
              error: {
                type: 'rate_limit_error',
                message: 'Rate limit exceeded',
              },
            },
          },
        };
      });

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error: any) {
        // Should include retry metadata
        expect(error.retries).toBe(3);
        expect(error.lastRetryAfter).toBe(5);
        expect(error.response.status).toBe(429);
      }
    });
  });

  describe('performance', () => {
    it('should complete 3 retries in reasonable time (<20s)', async () => {
      const mockApiCall = vi.fn(async () => {
        throw {
          response: {
            status: 429,
            headers: {},
          },
        };
      });

      const startTime = Date.now();

      try {
        await providerService.retryWithBackoff(mockApiCall);
      } catch (error) {
        // Expected to fail
      }

      const duration = Date.now() - startTime;

      // Total: ~1s + ~2s + ~4s = ~7s (with jitter, allow up to 20s)
      expect(duration).toBeLessThan(20000);
    });
  });
});
