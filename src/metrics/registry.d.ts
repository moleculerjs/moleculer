import ServiceBroker = require("../service-broker");
import BaseMetric = require("./types/base");
import type { BaseMetricPOJO, BaseMetricOptions } from "./types/base";
import type { Logger } from "../logger-factory";
import MetricBaseReporter = require("./reporters/base");
import { ConsoleReporterOptions } from "./reporters/console";
import { DatadogReporterOptions } from "./reporters/datadog";
import { EventReporterOptions } from "./reporters/event";
import { PrometheusReporterOptions } from "./reporters/prometheus";
import { StatsDReporterOptions } from "./reporters/statsd";
import GaugeMetric = require("./types/gauge");
import CounterMetric = require("./types/counter");
import HistogramMetric = require("./types/histogram");
import InfoMetric = require("./types/info");

declare namespace MetricRegistry {
	export interface MetricListOptions {
		types?: string | string[];
		includes?: string | string[];
		excludes?: string | string[];
	}

	export type MetricsReporter =
		| {
				type: "Console";
				options?: ConsoleReporterOptions;
		  }
		| {
				type: "CSV";
				options?: ConsoleReporterOptions;
		  }
		| {
				type: "Datadog";
				options?: DatadogReporterOptions;
		  }
		| {
				type: "Event";
				options?: EventReporterOptions;
		  }
		| {
				type: "Prometheus";
				options?: PrometheusReporterOptions;
		  }
		| {
				type: "StatsD";
				options?: StatsDReporterOptions;
		  };

	type MetricsReporterTypes = MetricsReporter["type"];

	export interface MetricRegistryOptions {
		enabled?: boolean;
		collectProcessMetrics?: boolean;
		collectInterval?: number;
		reporter?:
			| MetricsReporterTypes
			| MetricsReporter
			| (MetricsReporter | MetricsReporterTypes)[]
			| null;
		defaultBuckets?: number[];
		defaultQuantiles?: number[];
		defaultMaxAgeSeconds?: number;
		defaultAgeBuckets?: number;
		defaultAggregator?: string;
	}

	type GaugeMetricOptions = BaseMetricOptions & {
		type: "gauge";
		rate?: boolean;
	};

	type CounterMetricOptions = BaseMetricOptions & {
		type: "counter";
		rate?: boolean;
	};

	type HistogramMetricOptions = BaseMetricOptions & {
		type: "histogram";
		quantiles?: boolean | number[];
		buckets?: boolean | number[];
	};

	type InfoMetricOptions = BaseMetricOptions & {
		type: "info";
	};
}

declare class MetricRegistry {
	opts: MetricRegistry.MetricRegistryOptions;
	broker: ServiceBroker;
	logger: Logger;

	dirty: boolean;
	store: Map<string, BaseMetric<any>>;

	reporter: MetricBaseReporter[];
	collectTimer?: NodeJS.Timeout;

	constructor(broker: ServiceBroker, opts?: MetricRegistry.MetricRegistryOptions);
	init(broker: ServiceBroker): void;
	stop(): Promise<void>;

	isEnabled(): boolean;

	register(opts: MetricRegistry.GaugeMetricOptions): GaugeMetric | null;
	register(opts: MetricRegistry.CounterMetricOptions): CounterMetric | null;
	register(opts: MetricRegistry.HistogramMetricOptions): HistogramMetric | null;
	register(opts: MetricRegistry.InfoMetricOptions): InfoMetric | null;

	hasMetric(name: string): boolean;
	getMetric(name: string): CounterMetric | GaugeMetric | HistogramMetric | InfoMetric | null;

	increment(name: string, labels?: Record<string, any>, value?: number, timestamp?: number): void;
	decrement(name: string, labels?: Record<string, any>, value?: number, timestamp?: number): void;
	set(name: string, value: any | null, labels?: Record<string, any>, timestamp?: number): void;
	observe(name: string, value: number, labels?: Record<string, any>, timestamp?: number): void;

	reset(name: string, labels?: Record<string, any>, timestamp?: number): void;
	resetAll(name: string, timestamp?: number): void;

	timer(name: string, labels?: Record<string, any>, timestamp?: number): () => number;

	changed(
		metric: BaseMetric<any>,
		value: any | null,
		labels?: Record<string, any>,
		timestamp?: number
	): void;

	list(opts?: MetricRegistry.MetricListOptions): BaseMetricPOJO<any>[];

	pluralizeUnit(unit: string): string;
}
export = MetricRegistry;
