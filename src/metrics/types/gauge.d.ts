import BaseMetric = require("./base");

declare namespace GaugeMetric {
	export interface GaugeMetricSnapshot {
		value: number;
		labels: Record<string, any>;
		timestamp: number;
	}
}

declare class GaugeMetric extends BaseMetric<GaugeMetric.GaugeMetricSnapshot> {
	increment(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	decrement(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	set(value: number, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): GaugeMetric.GaugeMetricSnapshot[];
}
export = GaugeMetric;
