import BaseMetric = require("../types/base");
import MetricBaseReporter = require("./base");

declare namespace CSVReporter {
	export interface CSVReporterOptions extends MetricBaseReporter.MetricReporterOptions {
		folder?: string;
		delimiter?: string;
		rowDelimiter?: string;

		mode?: "metric" | "label";

		types?: string | string[];

		interval?: number;

		filenameFormatter?: (
			metricName: string,
			metric: BaseMetric<any>,
			item: Record<string, any>
		) => string;
		rowFormatter?: (row: string) => void;
	}
}

declare class CSVReporter extends MetricBaseReporter {
	opts: CSVReporter.CSVReporterOptions;

	constructor(opts?: CSVReporter.CSVReporterOptions);

	labelsToStr(labels: Record<string, any>): string;
    getFilename(metric: BaseMetric<any>, item: any): any;
    flush(): void;
    writeRow(filename: string, headers: string[], fields: string[]): void;

	metricChanged(metric: BaseMetric<any>, value: any, labels?: Record<string, any>): void;
}
export = CSVReporter;
