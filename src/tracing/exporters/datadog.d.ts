import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type Span = require("../span");
import type Tracer = require("../tracer");

declare namespace DatadogTraceExporter {
	export interface DatadogTraceExporterOptions extends BaseTraceExporterOptions {
		tracer?: any;
		agentUrl?: string;
		env?: string;
		samplingPriority?: string;
		defaultTags?: Record<string, any> | Tracer.TracerDefaultTagsFunction;
		tracerOptions?: Record<string, any>;
	}
}

declare class DatadogTraceExporter extends BaseTraceExporter {
	opts: DatadogTraceExporter.DatadogTraceExporterOptions;

	ddTracer: any;
	ddScope: any;

	defaultTags: Record<string, any>;

	constructor(opts: DatadogTraceExporter.DatadogTraceExporterOptions);

	init(tracer: Tracer): void;
	stop(): void;

	spanStarted(span: Span): void;
	spanFinished(span: Span): void;

	addTags(span: any, key: string, value: any, prefix?: string): void;
	addLogs(span: any, logs: Span.SpanLogEntry[]): void;
	convertID(id: string): string;
}
export = DatadogTraceExporter;
