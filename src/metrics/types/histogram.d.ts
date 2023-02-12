import BaseMetric = require("./base");

export interface HistogramMetricSnapshot {
	labels: Record<string, any>;
	count: number;
	sum: number;
	timestamp: number;
	buckets?: Record<string, number>;
	min?: number | null;
	mean?: number | null;
	variance?: number | null;
	stdDev?: number | null;
	max?: number | null;
	quantiles?: Record<string, number>;
}

declare class HistogramMetric extends BaseMetric<HistogramMetricSnapshot> {
	static generateLinearBuckets(start: number, width: number, count: number): number[];

	static generateExponentialBuckets(start: number, factor: number, count: number): number[];

	buckets: number[];

	quantiles: number[];

	maxAgeSeconds?: number;

	ageBuckets?: number;

	observe(value: number, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): HistogramMetricSnapshot[];
}
export = HistogramMetric;
