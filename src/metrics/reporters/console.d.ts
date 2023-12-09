import MetricBaseReporter = require("./base");
import type BaseMetric = require("../types/base");
import type { Logger } from "../../logger-factory";

declare namespace ConsoleReporter {
	export interface ConsoleReporterOptions extends MetricBaseReporter.MetricReporterOptions {
		interval?: number;
		logger?: Logger | null;
		colors?: boolean;
		onlyChanges?: boolean;

		excludes?: string | string[];

		metricNamePrefix?: string;
		metricNameSuffix?: string;

		metricNameFormatter?: (name: string) => string;
		labelNameFormatter?: (name: string) => string;
	}
}

declare class ConsoleReporter extends MetricBaseReporter {
	opts: ConsoleReporter.ConsoleReporterOptions;

	constructor(opts?: ConsoleReporter.ConsoleReporterOptions);

	labelsToStr(labels: Record<string, any>): string;
	print(): void;
	log(...args: any[]): any;

	metricChanged(metric: BaseMetric<any>): void;
}
export = ConsoleReporter;
