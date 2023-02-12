import type { Logger } from "../../logger-factory";
import type Span = require("../span");
import type Tracer = require("../tracer");

declare namespace BaseTraceExporter {
	export interface TracerExporterOptions {
		type: string;
		options?: Record<string, any>;
	}
}

declare abstract class BaseTraceExporter {
	opts: Record<string, any>;

	tracer: Tracer;

	logger: Logger;

	constructor(opts: Record<string, any>);

	init(tracer: Tracer): void;

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
