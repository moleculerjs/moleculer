import Tracer = require("./tracer");
import type { Logger } from "../logger-factory";

declare namespace Span {
	export interface SpanOptions {
		type?: string;
		id?: string;
		traceID?: string;
		parentID?: string | null;
		service?: string | {
			name?: string;
			version?: string | number;
			fullName?: string;
		};
		priority?: number;
		sampled?: boolean;
		tags?: Record<string, any>;
		defaultTags?: Record<string, any>;

		parentSpan?: Span;
	}

	export interface SpanLogEntry {
		name: string;
		fields: Record<string, any>;
		time: number;
		elapsed: number;
	}
}

declare class Span {
	constructor(tracer: Tracer, name: string, opts: Span.SpanOptions);

	tracer: Tracer;
	logger: Logger;
	opts: Span.SpanOptions;
	meta: Record<string, any>;

	name: string;
	type: string;
	id: string;
	traceID: string;
	parentID: string | null;

	service?: {
		name: string;
		version?: string | number;
		fullName?: string;
	};

	priority: number;
	sampled: boolean;

	startTime: number | null;
	startTicks: number | null;
	finishTime: number | null;
	duration: number | null;

	error: Error | null;

	logs: Span.SpanLogEntry[];
	tags: Record<string, any>;

	start(time?: number): Span;
	getTime(): number;
	addTags(obj: Record<string, any>): Span;
	log(name: string, fields?: Record<string, any>, time?: number): Span;
	setError(err: Error): Span;
	finish(time?: number | null): Span;
	isActive(): boolean;
	startSpan(name: string, opts?: Span.SpanOptions): Span;
}

export = Span;
