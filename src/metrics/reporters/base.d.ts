import ServiceBroker = require("../../service-broker");
import type MetricRegistry = require("../registry");
import type BaseMetric = require("../types/base");
import type { Logger } from "../../logger-factory";

declare namespace MetricBaseReporter {
	export interface MetricReporterOptions {
		includes?: string | string[];
		excludes?: string | string[];

		metricNamePrefix?: string;
		metricNameSuffix?: string;

		metricNameFormatter?: (name: string) => string;
		labelNameFormatter?: (name: string) => string;
	}
}

declare abstract class MetricBaseReporter {
	// opts: MetricBaseReporter.MetricReporterOptions;

	broker: ServiceBroker;
	registry: MetricRegistry;
	logger: Logger;

	constructor(opts?: MetricBaseReporter.MetricReporterOptions);

	init(registry: MetricRegistry): void;

	stop(): Promise<void>;

	matchMetricName(name: string): boolean;

	formatMetricName(name: string): string;

	formatLabelName(name: string): string;

	metricChanged(
		metric: BaseMetric<any>,
		value: any,
		labels?: Record<string, any>,
		timestamp?: number
	): void;
}
export = MetricBaseReporter;
