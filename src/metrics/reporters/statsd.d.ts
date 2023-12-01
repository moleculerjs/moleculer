import BaseMetric = require("../types/base");
import MetricRegistry = require("../registry");
import MetricBaseReporter = require("./base");

declare namespace StatsDReporter {
	export interface StatsDReporterOptions extends MetricBaseReporter.MetricReporterOptions {
		host?: string;
		port?: number;
		maxPayloadSize?: number;

		types?: string | string[];
	}
}

declare class StatsDReporter extends MetricBaseReporter {
	opts: StatsDReporter.StatsDReporterOptions;

	constructor(opts?: StatsDReporter.StatsDReporterOptions);
	init(registry: MetricRegistry): void;
	flush(): void;

	sendChunks(series: Array<any>): void;
    send(buf: Buffer): void;

    generateStatsDSeries(): Array<string>;
    generateStatDLine(metric: any, item: any, lastValue: any): string;
    metricChanged(metric: BaseMetric<any>, value: any, labels: any): void;
    escapeLabelValue(str: string): string;
    labelsToTags(itemLabels: Record<string, any>): string;
}
export = StatsDReporter;
