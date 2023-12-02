import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type Span = require("../span");
import type Tracer = require("../tracer");

declare namespace EventTraceExporter {
	export type EventTraceExporterSpanConverter = (span: Span) => Record<string, any>;

	export interface EventTraceExporterOptions extends BaseTraceExporterOptions {
		eventName?: string;

		sendStartSpan?: boolean;
		sendFinishSpan?: boolean;

		broadcast?: boolean;

		groups?: string[];

		interval?: number;

		spanConverter?: EventTraceExporterSpanConverter;

		defaultTags?: Tracer.TracerDefaultTagsFunction | Record<string, any>;
	}
}

declare class EventTraceExporter extends BaseTraceExporter {
	opts: EventTraceExporter.EventTraceExporterOptions;

	constructor(opts: EventTraceExporter.EventTraceExporterOptions);

	init(tracer: Tracer): void;

	stop(): void;

	spanStarted(span: Span): void;
	spanFinished(span: Span): void;

	flush(): void;
	generateTracingData(): Record<string, any>[];
}
export = EventTraceExporter;
