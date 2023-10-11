import type { BulkheadOptions } from "./middlewares";
import ActionEndpoint = require("./registry/endpoint-action");
import EventEndpoint = require("./registry/endpoint-event");
import type { CallingOptions, MCallDefinition, MCallCallingOptions } from "./service-broker";
import Service = require("./service");
import Span = require("./tracing/span");
import type { ActionHandler, ActionParams, ActionSchema, TracingEventOptions } from "./service";
import type ServiceBroker = require("./service-broker");
import { Stream } from "stream";
import util = require("util");

declare namespace Context {
	export interface EventSchema {
		name?: string;
		group?: string;
		params?: ActionParams;
		service?: Service;
		tracing?: boolean | TracingEventOptions;
		bulkhead?: BulkheadOptions;
		handler?: ActionHandler;
		context?: boolean;

		[key: string]: any;
	}

	export interface ContextParentSpan {
		id: string;
		traceID: string;
		sampled: boolean;
	}
}

declare class Context<TParams = unknown, TMeta extends object = {}, TLocals = Record<string, any>, THeaders = Record<string, any>> {
	static create(
		broker: ServiceBroker,
		endpoint: ActionEndpoint|EventEndpoint,
		params: Record<string, any>,
		opts: Record<string, any>
	): Context;
	static create(broker: ServiceBroker, endpoint: ActionEndpoint|EventEndpoint, params: Record<string, any>): Context;
	static create(broker: ServiceBroker, endpoint: ActionEndpoint|EventEndpoint): Context;
	static create(broker: ServiceBroker): Context;

	id: string;

	broker: ServiceBroker;

	endpoint: ActionEndpoint | EventEndpoint | null;

	action: ActionSchema | null;

	event: Context.EventSchema | null;

	service: Service | null;

	nodeID: string | null;

	eventName: string | null;

	eventType: string | null;

	eventGroups: string[] | null;

	options: CallingOptions;

	parentID: string | null;

	caller: string | null;

	tracing: boolean | null;

	span: Span | null;

	needAck: boolean | null;

	ackID: string | null;

	locals: TLocals;

	level: number;

	params: TParams;

	meta: TMeta;

	headers: THeaders;

	responseHeaders: THeaders;

	requestID: string | null;

	stream: Stream | null;

	cachedResult: boolean;

	constructor(broker: ServiceBroker, endpoint: ActionEndpoint|EventEndpoint);

	setEndpoint(endpoint: ActionEndpoint|EventEndpoint): void;

	setParams(newParams: TParams, cloning?: boolean): void;

	call<TResult>(actionName: string): Promise<TResult>;
	call<TResult, TParams>(
		actionName: string,
		params: TParams,
		opts?: CallingOptions
	): Promise<TResult>;

	mcall<T>(
		def: Record<string, MCallDefinition>,
		opts?: MCallCallingOptions
	): Promise<Record<string, T>>;
	mcall<T>(def: MCallDefinition[], opts?: MCallCallingOptions): Promise<T[]>;

	emit<D>(eventName: string, data: D, opts: Record<string, any>): Promise<void>;
	emit<D>(eventName: string, data: D, groups: string[]): Promise<void>;
	emit<D>(eventName: string, data: D, groups: string): Promise<void>;
	emit<D>(eventName: string, data: D): Promise<void>;
	emit(eventName: string): Promise<void>;

	broadcast<D>(eventName: string, data: D, opts: Record<string, any>): Promise<void>;
	broadcast<D>(eventName: string, data: D, groups: string[]): Promise<void>;
	broadcast<D>(eventName: string, data: D, groups: string): Promise<void>;
	broadcast<D>(eventName: string, data: D): Promise<void>;
	broadcast(eventName: string): Promise<void>;

	copy(endpoint: ActionEndpoint|EventEndpoint): this;
	copy(): this;

	startSpan(name: string, opts?: Record<string, any>): Span;

	finishSpan(span: Span, time?: number): void;

	toJSON(): Record<string, any>;

	startHrTime: [number, number] | null;

	_spanStack: Span[];

	[util.inspect.custom](depth?: number, options?: Record<string, any>): string;
}
export = Context;
