import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type Span = require("../span");
import type Tracer = require("../tracer");

declare namespace NewRelicTraceExporter {
	export interface NewRelicTraceExporterOptions extends BaseTraceExporterOptions {
		baseURL?: string;
		insertKey?: string;
		interval?: number;
		payloadOptions?: {
			debug?: boolean;
			shared?: boolean;
		};
		defaultTags?: Tracer.TracerDefaultTagsFunction | Record<string, any>;
	}
}

declare class NewRelicTraceExporter extends BaseTraceExporter {
	opts: NewRelicTraceExporter.NewRelicTraceExporterOptions;
	timer: NodeJS.Timeout;
	queue: Span[];

	constructor(opts: NewRelicTraceExporter.NewRelicTraceExporterOptions);

	init(tracer: Tracer): void;

	stop(): void;

	spanFinished(span: Span): void;
	flush(): void;

	generateTracingData(): Record<string, any>[];
	makePayload(span: Span): Record<string, any>;
	convertID(id: string): string;
	convertTime(ts: number): number;
}
export = NewRelicTraceExporter;
