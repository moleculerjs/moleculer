import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type { Logger } from "../../logger-factory";
import type Span = require("../span");
import type Tracer = require("../tracer");
import { Color } from "kleur";

declare namespace ZipkinTraceExporter {
	export interface ZipkinTraceExporterOptions extends BaseTraceExporterOptions {
		baseURL?: string;
		interval?: number;
		payloadOptions?: {
			debug?: boolean;
			shared?: boolean;
		};
		defaultTags?: Tracer.TracerDefaultTagsFunction | Record<string, any>;
		headers?: Record<string, any>;
	}
}

declare class ZipkinTraceExporter extends BaseTraceExporter {
	opts: ZipkinTraceExporter.ZipkinTraceExporterOptions;
	timer: NodeJS.Timeout;
	queue: Span[];

	constructor(opts: ZipkinTraceExporter.ZipkinTraceExporterOptions);

	init(tracer: Tracer): void;

	stop(): void;

	spanFinished(span: Span): void;
	flush(): void;

	generateTracingData(): Record<string, any>[];
	makePayload(span: Span): Record<string, any>;
	convertID(id: string): string;
	convertTime(ts: number): number;
}
export = ZipkinTraceExporter;
