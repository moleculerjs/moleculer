import ServiceBroker = require("../service-broker");
import Context = require("../context");
import Span = require("./span");
import RateLimiter = require("./rate-limiter");
import BaseTraceExporter = require("./exporters/base");
import type { Logger } from "../logger-factory";
import type { ConsoleTraceExporterOptions } from "./exporters/console";
import type { DatadogTraceExporterOptions } from "./exporters/datadog";
import type { EventTraceExporterOptions } from "./exporters/event";
import type { JaegerTraceExporterOptions } from "./exporters/jaeger";
import type { NewRelicTraceExporterOptions } from "./exporters/newrelic";
import type { ZipkinTraceExporterOptions } from "./exporters/zipkin";
import { Tracing } from "trace_events";

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

	export type TracingExporter = {
		type: "Console",
		options?: ConsoleTraceExporterOptions
	} | {
		type: "Datadog",
		options?: DatadogTraceExporterOptions
	} | {
		type: "Event",
		options?: EventTraceExporterOptions
	} | {
		type: "Jaeger",
		options?: JaegerTraceExporterOptions
	} | {
		type: "NewRelic",
		options?: NewRelicTraceExporterOptions
	} | {
		type: "Zipkin",
		options?: ZipkinTraceExporterOptions
	}

	type TracingExporterTypes = TracingExporter["type"];

	export interface TracerOptions {
		enabled?: boolean;
		exporter?: TracingExporterTypes | TracingExporter | (TracingExporter | TracingExporterTypes)[] | null;
		sampling?: {
			rate?: number | null;
			tracesPerSecond?: number | null;
			minPriority?: number | null;
		};

		actions?: boolean;
		events?: boolean;

		errorFields?: string[];
		stackTrace?: boolean;

		defaultTags?: Record<string, any> | TracerDefaultTagsFunction | null;

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
