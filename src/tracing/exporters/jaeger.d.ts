import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type Span = require("../span");
import type Tracer = require("../tracer");

declare namespace JaegerTraceExporter {
	export interface JaegerTraceExporterOptions extends BaseTraceExporterOptions {
		endpoint?: string;
		host?: string;
		port?: number;

		sampler?: {
			type?: string;
			options?: {
				maxTracesPerSecond?: number;
				initBalance?: number;
				samplingRate?: number;
				lowerBound?: number;
				decision?: number;
				[key: string]: any;
			};
		};

		tracerOptions?: Record<string, any>;
		defaultTags?: Tracer.TracerDefaultTagsFunction | Record<string, any>;
	}
}

declare class JaegerTraceExporter extends BaseTraceExporter {
	opts: JaegerTraceExporter.JaegerTraceExporterOptions;

	constructor(opts: JaegerTraceExporter.JaegerTraceExporterOptions);

	init(tracer: Tracer): void;

	stop(): void;

	getReporter(): any;
	getSampler(serviceName: string): any;
	getTracer(serviceName: string): any;

	spanStarted(span: Span): void;
	spanFinished(span: Span): void;

	generateJaegerSpan(span: Span): any;

	addLogs(span: any, logs: Span.SpanLogEntry[]): void;
	addTags(span: any, key: string, value: any, prefix?: string): void;
	convertID(id: string): Buffer;
}
export = JaegerTraceExporter;
