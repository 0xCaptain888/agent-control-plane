export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogEvent = { timestamp: string; level: LogLevel; message: string; attributes: Record<string, unknown> };

export class StructuredLogger {
  constructor(private readonly sink: (event: LogEvent) => void = (event) => process.stdout.write(`${JSON.stringify(event)}\n`)) {}
  log(level: LogLevel, message: string, attributes: Record<string, unknown> = {}): void { this.sink({ timestamp: new Date().toISOString(), level, message, attributes }); }
  debug(message: string, attributes?: Record<string, unknown>): void { this.log("debug", message, attributes); }
  info(message: string, attributes?: Record<string, unknown>): void { this.log("info", message, attributes); }
  warn(message: string, attributes?: Record<string, unknown>): void { this.log("warn", message, attributes); }
  error(message: string, attributes?: Record<string, unknown>): void { this.log("error", message, attributes); }
}

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  increment(name: string, amount = 1): void { this.counters.set(name, (this.counters.get(name) ?? 0) + amount); }
  set(name: string, value: number): void { this.gauges.set(name, value); }
  snapshot(): { counters: Record<string, number>; gauges: Record<string, number> } { return { counters: Object.fromEntries(this.counters), gauges: Object.fromEntries(this.gauges) }; }
  prometheus(): string {
    const lines = [...this.counters.entries()].map(([name, value]) => `${safeMetricName(name)} ${value}`);
    lines.push(...[...this.gauges.entries()].map(([name, value]) => `${safeMetricName(name)} ${value}`));
    return `${lines.join("\n")}\n`;
  }
}

function safeMetricName(name: string): string { return name.replace(/[^a-zA-Z0-9_:]/g, "_"); }
