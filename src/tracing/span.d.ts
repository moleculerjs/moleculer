import Tracer = require("./tracer");
import type { Logger } from "../logger-factory";

declare namespace Span {
	export interface SpanLogEntry {
		name: string;
		fields: Record<string, any>;
		time: number;
		elapsed: number;
	}
}

declare class Span {
	constructor(tracer: Tracer, name: string, opts: Record<string, any>);

	tracer: Tracer;
	logger: Logger;
	opts: Record<string, any>;
	meta: Record<string, any>;

	name: string;
	id: string;
	traceID: string;
	parentID: string | null;

	service?: {
		name: string;
		version: string | number | null | undefined;
	};

	priority: number;
	sampled: boolean;

	startTime: number | null;
	finishTime: number | null;
	duration: number | null;

	error: Error | null;

	logs: Span.SpanLogEntry[];
	tags: Record<string, any>;

	start(time?: number): Span;
	addTags(obj: Record<string, any>): Span;
	log(name: string, fields?: Record<string, any>, time?: number): Span;
	setError(err: Error): Span;
	finish(time?: number): Span;
	startSpan(name: string, opts?: Record<string, any>): Span;
}

export = Span;
