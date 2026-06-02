// Ce service applique des limites simples en memoire pour proteger
// l'envoi de messages prives et de salon contre les rafales et le flood continu.
import { Injectable } from "@nestjs/common";

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

type TokenBucketState = {
  tokens: number;
  lastRefill: number;
};

@Injectable()
export class PrivateMessageRateLimitService {
  private readonly buckets = new Map<string, TokenBucketState>();

  consume(
    key: string,
    capacity: number = 10,
    windowMs: number = 30000,
  ): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    const elapsedMs = now - bucket.lastRefill;
    const replenishRate = capacity / windowMs; // tokens per ms
    const addedTokens = elapsedMs * replenishRate;

    bucket.tokens = Math.min(capacity, bucket.tokens + addedTokens);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, retryAfterMs: 0 };
    } else {
      const neededTokens = 1 - bucket.tokens;
      const retryAfterMs = neededTokens / replenishRate;
      return { allowed: false, retryAfterMs };
    }
  }
}
