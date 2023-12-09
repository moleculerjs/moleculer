import BaseMetric = require("../types/base");
import MetricBaseReporter = require("./base");
import MetricRegistry = require("../registry");

declare namespace EventReporter {
	export interface EventReporterOptions extends MetricBaseReporter.MetricReporterOptions {
		eventName?: string;

		broadcast?: boolean;
		groups?: string | string[];

		onlyChanges?: boolean;

		interval?: number;
	}
}

declare class EventReporter extends MetricBaseReporter {
	opts: EventReporter.EventReporterOptions;

	constructor(opts?: EventReporter.EventReporterOptions);
	timer: NodeJS.Timeout;

	init(registry: MetricRegistry): void;
	sendEvent(): void;
	metricChanged(metric: BaseMetric<any>): void;
}
export = EventReporter;
