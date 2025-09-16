import { performance } from 'node:perf_hooks';

export interface PollLogger {
  debug?: (details: Record<string, unknown>, message?: string) => void;
  info?: (details: Record<string, unknown>, message?: string) => void;
  warn?: (details: Record<string, unknown>, message?: string) => void;
  error?: (details: Record<string, unknown>, message?: string) => void;
}

export interface AdaptivePollerOptions {
  /** Human readable label used for logging. */
  label: string;
  /** Baseline interval configured by the caller (in milliseconds). */
  baseIntervalMs: number;
  /** Maximum requests per minute allowed by the upstream GitCode client. */
  rpm: number;
  /** Function that returns the current queue size from the HTTP limiter. */
  getLimiterQueueSize: () => number;
  /** Optional logger for debugging and congestion/backoff reporting. */
  logger?: PollLogger;
  /** Number of enqueued requests tolerated before triggering congestion. */
  backlogThreshold?: number;
  /** Multiplier applied to the scheduled interval to detect slow polls. */
  latencyMultiplier?: number;
  /** Smallest interval the poller is allowed to use (milliseconds). */
  minIntervalMs?: number;
  /** Largest interval the poller can grow to (milliseconds). */
  maxIntervalMs?: number;
  /** Upper bound for the congestion window. */
  maxCwnd?: number;
  /** Initial congestion window, defaults to 1. */
  initialCwnd?: number;
  /** Callback invoked when the work function throws. */
  onError?: (error: unknown) => void;
}

export interface AdaptivePollerHandle {
  stop(): void;
  /** Snapshot of the current congestion control window and interval. */
  readonly stats: () => { cwnd: number; ssthresh: number; intervalMs: number };
}

export function createAdaptivePoller(
  work: () => Promise<void>,
  options: AdaptivePollerOptions,
): AdaptivePollerHandle {
  const label = options.label ?? 'poller';
  const rpm = Math.max(1, Math.floor(options.rpm));
  const backlogThreshold = options.backlogThreshold ?? 0;
  const latencyMultiplier = options.latencyMultiplier ?? 1.25;
  const minIntervalConfig = options.minIntervalMs ?? Math.min(options.baseIntervalMs, 1_000);
  const minIntervalMs = Math.max(250, minIntervalConfig);
  const maxIntervalMs = Math.max(
    minIntervalMs,
    options.maxIntervalMs ?? Math.max(options.baseIntervalMs, 60_000),
  );
  const maxCwnd = Math.max(1, options.maxCwnd ?? rpm);
  const minCwnd = 1;

  let cwnd = Math.min(Math.max(options.initialCwnd ?? 1, minCwnd), maxCwnd);
  let ssthresh = Math.min(maxCwnd, Math.max(Math.floor(maxCwnd / 2), minCwnd));
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const computeInterval = () => {
    const throttleInterval = 60_000 / (rpm * Math.max(cwnd, 1));
    const baseScaled = options.baseIntervalMs / Math.max(cwnd, 1);
    let interval = Math.max(throttleInterval, baseScaled, minIntervalMs);
    interval = Math.min(interval, maxIntervalMs);
    return interval;
  };

  let currentIntervalMs = computeInterval();

  const run = async () => {
    if (stopped) {
      return;
    }

    const scheduledInterval = currentIntervalMs;
    const start = performance.now();
    let didError = false;

    try {
      await work();
    } catch (err) {
      didError = true;
      options.onError?.(err);
    }

    const duration = performance.now() - start;
    let queueSize = Number(options.getLimiterQueueSize?.() ?? 0);
    if (!Number.isFinite(queueSize) || queueSize < 0) {
      queueSize = 0;
    }

    const congested =
      didError ||
      queueSize > backlogThreshold ||
      duration > scheduledInterval * latencyMultiplier;

    if (congested) {
      const nextSsthresh = Math.max(minCwnd, Math.floor(cwnd / 2));
      ssthresh = Math.max(nextSsthresh, minCwnd);
      cwnd = minCwnd;
      options.logger?.warn?.(
        { queueSize, duration, cwnd, ssthresh, scheduledInterval },
        `[${label}] congestion detected, backing off`,
      );
    } else {
      const previous = cwnd;
      if (cwnd < ssthresh) {
        cwnd = Math.min(maxCwnd, cwnd * 2);
      } else {
        cwnd = Math.min(maxCwnd, cwnd + 1);
      }
      options.logger?.debug?.(
        { queueSize, duration, cwnd, previous, scheduledInterval },
        `[${label}] poll completed`,
      );
    }

    currentIntervalMs = computeInterval();

    if (!stopped) {
      timer = setTimeout(() => {
        void run();
      }, currentIntervalMs);
      timer.unref?.();
    }
  };

  void run();

  return {
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    stats: () => ({ cwnd, ssthresh, intervalMs: currentIntervalMs }),
  };
}
