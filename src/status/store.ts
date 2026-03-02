import type { DisasterType } from "../parser/types.js";

export interface RecentEvent {
  timestamp: string;
  disasterType: DisasterType;
  entryId: string;
  result: "posted" | "skipped" | "error";
  errorMessage?: string;
}

export interface StatusSnapshot {
  status: "ok" | "error";
  version: string;
  startedAt: string;
  uptimeSeconds: number;
  poll: {
    count: number;
    lastPollAt: string | null;
    errorCount: number;
    lastErrorAt: string | null;
  };
  post: {
    count: number;
    lastPostAt: string | null;
    errorCount: number;
    byType: Record<string, number>;
  };
  recentEvents: RecentEvent[];
}

const RING_BUFFER_SIZE = 50;
const POLL_STALE_MS = 180_000; // 3 minutes

export class StatusStore {
  private _startedAt: Date;
  private _pollCount = 0;
  private _pollErrorCount = 0;
  private _lastPollAt: Date | null = null;
  private _lastPollErrorAt: Date | null = null;
  private _postCount = 0;
  private _postErrorCount = 0;
  private _lastPostAt: Date | null = null;
  private _postsByType = new Map<string, number>();
  private _recentEvents: RecentEvent[] = [];

  constructor(private version: string) {
    this._startedAt = new Date();
  }

  recordPoll(): void {
    this._pollCount++;
    this._lastPollAt = new Date();
  }

  recordPollError(): void {
    this._pollErrorCount++;
    this._lastPollErrorAt = new Date();
  }

  recordPost(disasterType: string, entryId: string): void {
    this._postCount++;
    this._lastPostAt = new Date();
    this._postsByType.set(
      disasterType,
      (this._postsByType.get(disasterType) ?? 0) + 1,
    );
    this._pushEvent({
      timestamp: new Date().toISOString(),
      disasterType: disasterType as DisasterType,
      entryId,
      result: "posted",
    });
  }

  recordPostError(disasterType: string, entryId: string, error: string): void {
    this._postErrorCount++;
    this._pushEvent({
      timestamp: new Date().toISOString(),
      disasterType: disasterType as DisasterType,
      entryId,
      result: "error",
      errorMessage: error,
    });
  }

  recordSkipped(disasterType: string, entryId: string): void {
    this._pushEvent({
      timestamp: new Date().toISOString(),
      disasterType: disasterType as DisasterType,
      entryId,
      result: "skipped",
    });
  }

  private _pushEvent(event: RecentEvent): void {
    this._recentEvents.push(event);
    if (this._recentEvents.length > RING_BUFFER_SIZE) {
      this._recentEvents.shift();
    }
  }

  snapshot(): StatusSnapshot {
    const now = new Date();
    const uptimeSeconds = Math.floor(
      (now.getTime() - this._startedAt.getTime()) / 1000,
    );

    // Status is "error" if polling is stale or the last poll ended in error
    const pollStale = this._lastPollAt
      ? now.getTime() - this._lastPollAt.getTime() > POLL_STALE_MS
      : uptimeSeconds > POLL_STALE_MS / 1000;

    const lastPollWasError =
      this._lastPollErrorAt !== null &&
      (this._lastPollAt === null || this._lastPollErrorAt > this._lastPollAt);

    const status = pollStale || lastPollWasError ? "error" : "ok";

    const byType: Record<string, number> = {};
    for (const [k, v] of this._postsByType) {
      byType[k] = v;
    }

    return {
      status,
      version: this.version,
      startedAt: this._startedAt.toISOString(),
      uptimeSeconds,
      poll: {
        count: this._pollCount,
        lastPollAt: this._lastPollAt?.toISOString() ?? null,
        errorCount: this._pollErrorCount,
        lastErrorAt: this._lastPollErrorAt?.toISOString() ?? null,
      },
      post: {
        count: this._postCount,
        lastPostAt: this._lastPostAt?.toISOString() ?? null,
        errorCount: this._postErrorCount,
        byType,
      },
      recentEvents: [...this._recentEvents].reverse(),
    };
  }
}
