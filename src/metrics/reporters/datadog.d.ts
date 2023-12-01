import MetricRegistry = require("../registry");
import MetricBaseReporter = require("./base");

declare namespace DatadogReporter {
	export interface DatadogReporterOptions extends MetricBaseReporter.MetricReporterOptions {
		host?: string;
		baseUrl?: string;
		apiVersion?: string;
		path?: string;
		apiKey?: string;
		defaultLabels?: (registry: MetricRegistry) => Record<string, any>;
		interval?: number;
	}
}

declare class DatadogReporter extends MetricBaseReporter {
	opts: DatadogReporter.DatadogReporterOptions;

	constructor(opts?: DatadogReporter.DatadogReporterOptions);
	init(registry: MetricRegistry): void;
	stop(): Promise<void>;
	flush(): Promise<void>;

	generateDatadogSeries(): Array<any>;
    escapeLabelValue(str: string): string;
    labelsToTags(itemLabels: Record<string, any>): Array<string>;
    posixTimestamp(time?: number): number;
}
export = DatadogReporter;
