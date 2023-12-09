import BaseMetric = require("./base");

declare namespace HistogramMetric {
	export interface HistogramMetricOptions extends BaseMetric.BaseMetricOptions {
		linearBuckets?: {
			start: number;
			width: number;
			count: number;
		};
		exponentialBuckets?: {
			start: number;
			factor: number;
			count: number;
		};
		buckets?: boolean | number[];
		quantiles?: boolean | number[];

		maxAgeSeconds?: number;
		ageBuckets?: number;
		rate?: boolean;
	}

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
}

declare class HistogramMetric extends BaseMetric<HistogramMetric.HistogramMetricSnapshot> {
	static generateLinearBuckets(start: number, width: number, count: number): number[];

	static generateExponentialBuckets(start: number, factor: number, count: number): number[];

	buckets: number[];

	quantiles: number[];

	maxAgeSeconds?: number;

	ageBuckets?: number;

	observe(value: number, labels?: Record<string, any>, timestamp?: number): void;

	createBucketValues(): Record<string, number>;

	generateSnapshot(): HistogramMetric.HistogramMetricSnapshot[];

	generateItemSnapshot(
		item: Record<string, any>,
		key: string
	): HistogramMetric.HistogramMetricSnapshot;

	resetItem(item: Record<string, any>, timestamp?: number): Record<string, any>;

	reset(labels?: Record<string, any>, timestamp?: number): void;

	resetAll(timestamp?: number): void;

	static generateLinearBuckets(start: number, width: number, count: number): number[];

	static generateExponentialBuckets(start: number, factor: number, count: number): number[];
}
export = HistogramMetric;
