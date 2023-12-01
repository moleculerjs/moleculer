import BaseMetric = require("./base");
import type MetricRegistry = require("../registry");

declare namespace GaugeMetric {
	export interface GaugeMetricSnapshot {
		key: string;
		value: number;
		labels: Record<string, any>;
		timestamp: number;
	}
}

declare class GaugeMetric extends BaseMetric<GaugeMetric.GaugeMetricSnapshot> {
	constructor(opts: BaseMetric.BaseMetricOptions, registry: MetricRegistry);

	increment(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	decrement(labels?: Record<string, any>, value?: number, timestamp?: number): void;

	set(value: number, labels?: Record<string, any>, timestamp?: number): void;

	reset(labels?: Record<string, any>, timestamp?: number): void;

	resetAll(timestamp?: number): void;

	generateSnapshot(): GaugeMetric.GaugeMetricSnapshot[];
}
export = GaugeMetric;
