import MetricRegistry = require("../registry");
import MetricBaseReporter = require("./base");
import { Server, IncomingMessage, ServerResponse} from "http";

declare namespace PrometheusReporter {
	export interface PrometheusReporterOptions extends MetricBaseReporter.MetricReporterOptions {
		host?: string;
		port?: number;
		path?: string;
		defaultLabels?: (registry: MetricRegistry) => Record<string, any>;
	}
}

declare class PrometheusReporter extends MetricBaseReporter {
	opts: PrometheusReporter.PrometheusReporterOptions;
	server: Server<typeof IncomingMessage, typeof ServerResponse>;

	constructor(opts?: PrometheusReporter.PrometheusReporterOptions);
	init(registry: MetricRegistry): void;
	stop(): Promise<void>;

	handler(req: IncomingMessage, res: ServerResponse): void;
    generatePrometheusResponse(): string;
    escapeLabelValue(str: string): string;
    labelsToStr(itemLabels: Record<string, any>, extraLabels?: Record<string, any>): string;
}
export = PrometheusReporter;
