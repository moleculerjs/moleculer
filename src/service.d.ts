import Context = require("./context");
import ServiceBroker = require("./service-broker");
import Strategy = require("./strategies/base");
import type { MoleculerError } from "./errors";
import type { Logger } from "./logger-factory";
import type { CacherKeygen } from "./cachers/base";
import type { BulkheadOptions } from "./middlewares";
import type {
	BrokerCircuitBreakerOptions,
	CallingOptions,
	FallbackHandler,
	RetryPolicyOptions
} from "./service-broker";
import type { TracingActionTags, TracingEventTags } from "./tracing/tracer";

declare namespace Service {
	type ServiceSyncLifecycleHandler<S = ServiceSettingSchema, T = Service<S>> = (this: T) => void;
	type ServiceAsyncLifecycleHandler<S = ServiceSettingSchema, T = Service<S>> = (
		this: T
	) => void | Promise<void>;

	export interface ServiceSearchObj {
		name?: string;
		version?: string | number;
	}

	export interface ServiceSchema<S = ServiceSettingSchema, T = Service<S>> {
		name: string;
		version?: string | number;
		settings?: S;
		dependencies?: string | ServiceDependency | (string | ServiceDependency)[];
		metadata?: any;
		actions?: ServiceActionsSchema<S, T>;
		mixins?: Partial<ServiceSchema>[];
		methods?: ServiceMethods<S, T>;
		hooks?: ServiceHooks;

		events?: EventSchemas<S, T>;
		created?: ServiceSyncLifecycleHandler<S, T> | ServiceSyncLifecycleHandler<S, T>[];
		started?: ServiceAsyncLifecycleHandler<S,T> | ServiceAsyncLifecycleHandler<S,T>[];
		stopped?: ServiceAsyncLifecycleHandler<S,T> | ServiceAsyncLifecycleHandler<S,T>[];

		// [key: string]: any;
	}

	export interface ServiceSettingSchema {
		$noVersionPrefix?: boolean;
		$noServiceNamePrefix?: boolean;
		$dependencyTimeout?: number;
		$shutdownTimeout?: number;
		$secureSettings?: string[];
		//[key: string]: any;
	}

	export type ServiceAction = <
		T = Promise<any>,
		P extends Record<string, any> = Record<string, any>
	>(
		params?: P,
		opts?: CallingOptions
	) => T;

	export interface ServiceActions {
		[name: string]: ServiceAction;
	}

	export type ActionVisibility = "published" | "public" | "protected" | "private";

	export type ActionParamTypes =
		| "any"
		| "array"
		| "boolean"
		| "custom"
		| "date"
		| "email"
		| "enum"
		| "forbidden"
		| "function"
		| "number"
		| "object"
		| "string"
		| "url"
		| "uuid"
		| boolean
		| string
		| Record<string, any>;

	export type ActionParams = { [key: string]: ActionParamTypes };

	export type ActionCacheEnabledFunc = (ctx: Context<any, any>) => boolean;
	export interface ActionCacheOptions<TParams = unknown, TMeta extends object = object> {
		enabled?: boolean | ActionCacheEnabledFunc;
		ttl?: number;
		keys?: string[];
		keygen?: CacherKeygen<TParams, TMeta>;
		lock?: {
			enabled?: boolean;
			staleTime?: number;
		};
	}

	export interface ActionSchema<S=ServiceSettingSchema, T=Service<S>> {
		name?: string;
		visibility?: ActionVisibility;
		params?: ActionParams;
		service?: Service;
		cache?: boolean | ActionCacheOptions;
		handler?: ActionHandler<S,T>;
		tracing?: boolean | TracingActionOptions;
		bulkhead?: BulkheadOptions;
		circuitBreaker?: BrokerCircuitBreakerOptions;
		retryPolicy?: RetryPolicyOptions;
		fallback?: string | FallbackHandler;
		hooks?: ActionHooks;
		strategy?: string | typeof Strategy;
		strategyOptions?: Record<string, any>;

		// For internal purposes only!
		remoteHandler?: ActionHandler;

		// [key: string]: any;
	}

	export type ActionHandler<S=ServiceSettingSchema, T=Service<S>> = (this: T,ctx: Context<any, any>) => Promise<any> | any;

	export type ServiceActionsSchema<S = ServiceSettingSchema, T = Service<S>> = {
		[key: string]: ActionSchema<S,T>  & ThisType<T> | ActionHandler<S,T> | boolean;
	} & ThisType<T>;

	export type ServiceMethods<S = ServiceSettingSchema, T = Service<S>> = { [key: string]: (...args: any[]) => any } & ThisType<T>;

	export interface ServiceDependency {
		name: string;
		version?: string | number;
	}

	export type ActionHookBefore = (ctx: Context<any, any>) => Promise<void> | void;
	export type ActionHookAfter = (ctx: Context<any, any>, res: any) => Promise<any> | any;
	export type ActionHookError = (ctx: Context<any, any>, err: Error) => Promise<void> | void;

	export interface ActionHooks {
		before?: string | ActionHookBefore | (string | ActionHookBefore)[];
		after?: string | ActionHookAfter | (string | ActionHookAfter)[];
		error?: string | ActionHookError | (string | ActionHookError)[];
	}

	export interface ServiceHooksBefore {
		[key: string]: string | ActionHookBefore | (string | ActionHookBefore)[];
	}

	export interface ServiceHooksAfter {
		[key: string]: string | ActionHookAfter | (string | ActionHookAfter)[];
	}

	export interface ServiceHooksError {
		[key: string]: string | ActionHookError | (string | ActionHookError)[];
	}

	export interface ServiceHooks {
		before?: ServiceHooksBefore;
		after?: ServiceHooksAfter;
		error?: ServiceHooksError;
	}

	export type EventSchemaHandler<S=ServiceSettingSchema, T=Service<S>> = (this:T, ctx: Context) => void | Promise<void>;

	export interface EventSchema<S=ServiceSettingSchema, T=Service<S>> {
		name?: string;
		group?: string;
		params?: ActionParams;
		service?: Service;
		context?: boolean;
		debounce?: number;
		throttle?: number;
		strategy?: string | typeof Strategy;
		strategyOptions?: Record<string, any>;
		handler?: EventSchemaHandler<S,T>;

		// [key: string]: any;
	}

	export type EventSchemas<S = ServiceSettingSchema, T = Service<S>> = {
		[key: string]: EventSchemaHandler<S,T> | (EventSchema<S,T> & ThisType<T>);
	} & ThisType<T>;

	export interface WaitForServicesResult {
		services: string[];
		statuses: { name: string; available: boolean }[];
	}

	export type TracingSpanNameOption = string | ((ctx: Context) => string);

	export interface TracingOptions {
		enabled?: boolean;
		tags?: TracingActionTags | TracingEventTags;
		spanName?: TracingSpanNameOption;
		safetyTags?: boolean;
	}

	export interface TracingActionOptions extends TracingOptions {
		tags?: TracingActionTags;
	}

	export interface TracingEventOptions extends TracingOptions {
		tags?: TracingEventTags;
	}
}

declare class Service<S = Service.ServiceSettingSchema> {
	constructor(broker: ServiceBroker, schema?: Partial<Service.ServiceSchema<S>>);

	parseServiceSchema(schema: Partial<Service.ServiceSchema<S>>): void;

	name: string;
	fullName: string;
	version?: string | number;
	settings: S;
	metadata: Record<string, any>;
	dependencies?: string | Service.ServiceDependency | (string | Service.ServiceDependency)[];
	schema: Service.ServiceSchema<S>;
	originalSchema: Service.ServiceSchema<S>;
	broker: ServiceBroker;
	logger: Logger;
	actions: Service.ServiceActions;
	Promise: PromiseConstructor;

	_init(): void;
	_start(): Promise<void>;
	_stop(): Promise<void>;

	/**
	 * Call a local event handler. Useful for unit tests.
	 *
	 * @param eventName The event name
	 * @param params The event parameters
	 * @param opts The event options
	 */
	emitLocalEventHandler(eventName: string, params?: any, opts?: any): any;

	/**
	 * Wait for the specified services to become available/registered with this broker.
	 *
	 * @param serviceNames The service, or services, we are waiting for.
	 * @param timeout The total time this call may take. If this time has passed and the service(s)
	 * 						    are not available an error will be thrown. (In milliseconds)
	 * @param interval The time we will wait before once again checking if the service(s) are available (In milliseconds)
	 */
	waitForServices(
		serviceNames: string | Service.ServiceDependency | (string | Service.ServiceDependency)[],
		timeout?: number,
		interval?: number
	): Promise<Service.WaitForServicesResult>;

	// [key: string]: any;

	/**
	 * Apply `mixins` list in schema. Merge the schema with mixins schemas. Returns with the mixed schema
	 *
	 * @param schema Schema containing the mixins to merge
	 */
	applyMixins(schema: Partial<Service.ServiceSchema>): Partial<Service.ServiceSchema>;

	/**
	 * Merge two Service schema
	 *
	 * @param mixinSchema Mixin schema
	 * @param svcSchema Service schema
	 */
	mergeSchemas(
		mixinSchema: Partial<Service.ServiceSchema>,
		svcSchema: Partial<Service.ServiceSchema>
	): Partial<Service.ServiceSchema>;

	/**
	 * Merge `settings` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaSettings(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Merge `metadata` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaMetadata(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Merge `mixins` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaUniqArray(
		src: Record<string, any>,
		target: Record<string, any>
	): Record<string, any>;

	/**
	 * Merge `dependencies` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaDependencies(
		src: Record<string, any>,
		target: Record<string, any>
	): Record<string, any>;

	/**
	 * Merge `hooks` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaHooks(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Merge `actions` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaActions(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Merge `methods` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaMethods(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Merge `events` property in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaEvents(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Merge `started`, `stopped`, `created` event handler properties in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaLifecycleHandlers(
		src: Record<string, any>,
		target: Record<string, any>
	): Record<string, any>;

	/**
	 * Merge unknown properties in schema
	 *
	 * @param src Source schema property
	 * @param target Target schema property
	 */
	mergeSchemaUnknown(src: Record<string, any>, target: Record<string, any>): Record<string, any>;

	/**
	 * Return a versioned full service name.
	 *
	 * @param name The name
	 * @param version The version
	 */
	static getVersionedFullName(name: string, version?: string | number): string;
}
export = Service;
