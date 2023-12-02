import type { Logger } from "../../logger-factory";
import type Span = require("../span");
import type Tracer = require("../tracer");
import type ServiceBroker = require("../../service-broker");

declare namespace BaseTraceExporter {
	export interface BaseTraceExporterOptions {
		safetyTags?: boolean;
		logger?: Logger;
	}
}

declare abstract class BaseTraceExporter {
	// opts: BaseTraceExporter.BaseTraceExporterOptions;

	tracer: Tracer;
	broker: ServiceBroker;
	logger: Logger;
	Promise: PromiseConstructor;

	constructor(opts: BaseTraceExporter.BaseTraceExporterOptions);

	init(tracer: Tracer): void;

	stop(): void;

	spanStarted(span: Span): void;
	spanFinished(span: Span): void;

	flattenTags(
		obj: Record<string, any>,
		convertToString?: boolean,
		path?: string
	): Record<string, any>;

	errorToObject(err: Error): Record<string, any>;
}
export = BaseTraceExporter;
