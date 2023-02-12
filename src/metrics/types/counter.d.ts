import BaseMetric = require("./base");

export interface CounterMetricSnapshot {
	value: number;
	labels: Record<string, any>;
	timestamp: number;
}

declare class CounterMetric extends BaseMetric<CounterMetricSnapshot> {
	increment(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	set(value: number, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): CounterMetricSnapshot[];
}
export = CounterMetric;
