import ServiceBroker = require("../service-broker");
import Context = require("../context");
import Span = require("./span");
import BaseTraceExporter = require("./exporters/base");
import type { TracerExporterOptions } from "./exporters/base";

export type TracingActionTagsFunc = (ctx: Context, response?: any) => Record<string, any>;
export type TracingActionTags =
	| TracingActionTagsFuncType
	| {
			params?: boolean | string[];
			meta?: boolean | string[];
			response?: boolean | string[];
	  };

export type TracingEventTagsFunc = (ctx: Context) => Record<string, any>;
export type TracingEventTags =
	| TracingEventTagsFuncType
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

declare class Tracer {
	constructor(broker: ServiceBroker, opts: TracerOptions | boolean);

	broker: ServiceBroker;

	logger: Logger;

	opts: Record<string, any>;

	exporter: BaseTraceExporter[];

	isEnabled(): boolean;

	shouldSample(span: Span): boolean;

	startSpan(name: string, opts?: Record<string, any>): Span;

	getCurrentTraceID(): string | null;

	getActiveSpanID(): string | null;
}

export = Tracer;
