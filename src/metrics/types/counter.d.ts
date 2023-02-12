import BaseMetric = require("./base");

declare namespace CounterMetric {
	export interface CounterMetricSnapshot {
		value: number;
		labels: Record<string, any>;
		timestamp: number;
	}
}

declare class CounterMetric extends BaseMetric<CounterMetric.CounterMetricSnapshot> {
	increment(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	set(value: number, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): CounterMetric.CounterMetricSnapshot[];
}
export = CounterMetric;
