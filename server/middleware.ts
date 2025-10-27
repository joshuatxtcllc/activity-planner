// Middleware for caching and rate limiting
import type { Request, Response, NextFunction } from 'express';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Cache middleware - caches GET requests for specified duration
export function cacheMiddleware(durationMinutes: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = durationMinutes * 60 * 1000;

      if (age < maxAge) {
        console.log(`Cache hit for ${cacheKey}`);
        return res.json(cached.data);
      } else {
        // Expired, remove from cache
        cache.delete(cacheKey);
      }
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return originalJson(data);
    };

    next();
  };
}

// Rate limiting middleware
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function rateLimitMiddleware(maxRequests: number = 100, windowMinutes: number = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    let entry = rateLimitMap.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitMap.set(identifier, entry);
    }

    entry.count++;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }

    next();
  };
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > maxAge) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes
