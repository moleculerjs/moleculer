import type BaseMetric = require("./types/base");

declare class MetricRate {
	metric: BaseMetric;
    item: Record<string, any>;
    min: number;

    constructor(metric: BaseMetric, item: Record<string, any>, min: number);

	rate: number;
    lastValue: number;
    lastTickTime: number;
    value: number;
    timer: NodeJS.Timeout;

    update(value: number): void;
    tick(): void;
    reset(): void;
}

export = MetricRate;
