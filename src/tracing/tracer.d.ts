import ServiceBroker = require("../service-broker");
import Context = require("../context");
import Span = require("./span");
import RateLimiter = require("./rate-limiter");
import BaseTraceExporter = require("./exporters/base");
import type { Logger } from "../logger-factory";

declare namespace Tracer {
	export type TracerDefaultTagsFunction = (tracer: Tracer) => Record<string, any>;

	export interface TracerExporterOptions {
		type: string;
		options?: BaseTraceExporter.BaseTraceExporterOptions;
	}

	export type TracingActionTagsFunc = (ctx: Context, response?: any) => Record<string, any>;
	export type TracingActionTags =
		| TracingActionTagsFunc
		| {
				params?: boolean | string[];
				meta?: boolean | string[];
				response?: boolean | string[];
		  };

	export type TracingEventTagsFunc = (ctx: Context) => Record<string, any>;
	export type TracingEventTags =
		| TracingEventTagsFunc
		| {
				params?: boolean | string[];
				meta?: boolean | string[];
		  };

	export interface TracerOptions {
		enabled?: boolean;
		exporter?: string | TracerExporterOptions | (TracerExporterOptions | string)[] | null;
		sampling?: {
			rate?: number | null;
			tracesPerSecond?: number | null;
			minPriority?: number | null;
		};

		actions?: boolean;
		events?: boolean;

		errorFields?: string[];
		stackTrace?: boolean;

		defaultTags?: Record<string, any> | Function | null;

		tags?: {
			action?: TracingActionTags;
			event?: TracingEventTags;
		};
	}
}

declare class Tracer {
	constructor(broker: ServiceBroker, opts: Tracer.TracerOptions | boolean);

	broker: ServiceBroker;

	logger: Logger;

	opts: Tracer.TracerOptions;

	exporter: BaseTraceExporter[];

	rateLimiter?: RateLimiter;

	sampleCounter: number;

	init(): void;
	stop(): void;
	isEnabled(): boolean;

	shouldSample(span: Span): boolean;

	startSpan(name: string, opts?: Span.SpanOptions): Span;

	invokeExporter(method: string, args: any[]): void;

	getCurrentTraceID(): string | null;
	getActiveSpanID(): string | null;

	spanStarted(span: Span): void;
	spanFinished(span: Span): void;
}

export = Tracer;
