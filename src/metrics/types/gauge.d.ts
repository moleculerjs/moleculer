import BaseMetric = require("./base");

export interface GaugeMetricSnapshot {
	value: number;
	labels: Record<string, any>;
	timestamp: number;
}

declare class GaugeMetric extends BaseMetric<GaugeMetricSnapshot> {
	increment(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	decrement(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	set(value: number, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): GaugeMetricSnapshot[];
}
export = GaugeMetric;
