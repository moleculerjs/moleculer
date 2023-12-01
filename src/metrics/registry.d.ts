import ServiceBroker = require("../service-broker");
import BaseMetric = require("./types/base");
import type { BaseMetricPOJO, BaseMetricOptions } from "./types/base";
import type { MetricReporterOptions } from "./reporters/base";
import type { Logger } from "../logger-factory";
import MetricBaseReporter = require("./reporters/base");

declare namespace MetricRegistry {
	export interface MetricListOptions {
		types?: string | string[];
		includes?: string | string[];
		excludes?: string | string[];
	}

	export interface MetricsReporterOptions {
		type: string;
		options?: MetricReporterOptions;
	}

	export interface MetricRegistryOptions {
		enabled?: boolean;
		collectProcessMetrics?: boolean;
		collectInterval?: number;
		reporter?: string | MetricsReporterOptions | (MetricsReporterOptions | string)[] | null;
		defaultBuckets?: number[];
		defaultQuantiles?: number[];
		defaultMaxAgeSeconds?: number;
		defaultAgeBuckets?: number;
		defaultAggregator?: string;
	}
}

declare class MetricRegistry {
	opts: MetricRegistry.MetricRegistryOptions;
	broker: ServiceBroker;
	logger: Logger;

	dirty: boolean;
	store: Map<string, BaseMetric>;

	reporter: MetricBaseReporter[];
	collectTimer?: NodeJS.Timeout;

	constructor(broker: ServiceBroker, opts?: MetricRegistry.MetricRegistryOptions);
	init(broker: ServiceBroker): void;
	stop(): Promise<void>;

	isEnabled(): boolean;
	register(opts: BaseMetricOptions): BaseMetric | null;

	hasMetric(name: string): boolean;
	getMetric(name: string): BaseMetric;

	increment(name: string, labels?: Record<string, any>, value?: number, timestamp?: number): void;
	decrement(name: string, labels?: Record<string, any>, value?: number, timestamp?: number): void;
	set(name: string, value: any | null, labels?: Record<string, any>, timestamp?: number): void;
	observe(name: string, value: number, labels?: Record<string, any>, timestamp?: number): void;

	reset(name: string, labels?: Record<string, any>, timestamp?: number): void;
	resetAll(name: string, timestamp?: number): void;

	timer(name: string, labels?: Record<string, any>, timestamp?: number): () => number;

	changed(
		metric: BaseMetric,
		value: any | null,
		labels?: Record<string, any>,
		timestamp?: number
	): void;

	list(opts?: MetricRegistry.MetricListOptions): BaseMetricPOJO[];

	pluralizeUnit(unit: string): string;
}
export = MetricRegistry;
