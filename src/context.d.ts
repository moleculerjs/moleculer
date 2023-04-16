import type { BulkheadOptions } from "./middlewares";
import Endpoint from "./registry/endpoint";
import type { CallingOptions, MCallDefinition, MCallCallingOptions } from "./service-broker";
import Service from "./service";
import Span from "./tracing/span";
import type { ActionHandler, ActionParams, ActionSchema, TracingEventOptions } from "./service";
import type ServiceBroker = require("./service-broker");

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

declare class Context<TParams = unknown, TMeta extends object = {}, TLocals = Record<string, any>> {
	static create(
		broker: ServiceBroker,
		endpoint: Endpoint,
		params: Record<string, any>,
		opts: Record<string, any>
	): Context;
	static create(broker: ServiceBroker, endpoint: Endpoint, params: Record<string, any>): Context;
	static create(broker: ServiceBroker, endpoint: Endpoint): Context;
	static create(broker: ServiceBroker): Context;

	id: string;

	broker: ServiceBroker;

	endpoint: Endpoint | null;

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

	requestID: string | null;

	cachedResult: boolean;

	constructor(broker: ServiceBroker, endpoint: Endpoint);

	setEndpoint(endpoint: Endpoint): void;

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

	copy(endpoint: Endpoint): this;
	copy(): this;

	startSpan(name: string, opts?: Record<string, any>): Span;

	finishSpan(span: Span, time?: number): void;

	toJSON(): Record<string, any>;
}
export = Context;
