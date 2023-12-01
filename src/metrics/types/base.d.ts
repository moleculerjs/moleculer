import type MetricRegistry = require("../registry");

declare namespace BaseMetric {
	export interface BaseMetricOptions {
		type: string;
		name: string;
		description?: string;
		labelNames?: string[];
		unit?: string;
		aggregator?: string;
		[key: string]: unknown;
	}

	export interface BaseMetricPOJO<TValue = unknown> {
		type: string;
		name: string;
		description?: string;
		labelNames: string[];
		unit?: string;
		values: TValue[];
	}
}

declare abstract class BaseMetric<TValue = unknown> {
	registry: MetricRegistry;

	type: string;
	name: string;
	description?: string;
	labelNames: string[];
	unit?: string;
	aggregator: string;

	lastSnapshot: Record<string, any> | null;
	dirty: boolean;

	values: Map<string, Record<string, any>>;

	constructor(opts: BaseMetric.BaseMetricOptions, registry: MetricRegistry);

	setDirty(): void;

	clearDirty(): void;

	get(labels?: Record<string, any>): Record<string, any> | null;

	abstract reset(labels?: Record<string, any>, timestamp?: number): void;

	abstract resetAll(timestamp?: number): void;

	clear(): void;

	hashingLabels(labels?: Record<string, any>): string;

	snapshot(): TValue[];

	abstract generateSnapshot(): TValue[];

	changed(value?: any | null, labels?: Record<string, any>, timestamp?: number): void;

	toObject(): BaseMetric.BaseMetricPOJO<TValue>;
}
export = BaseMetric;
