import type { EventEmitter2 } from "eventemitter2";
import type AsyncStorage from "./async-storage";
import type { Base as BaseCacher } from "./cachers";
import type { ContextParentSpan } from "./context";
import type {
	Regenerator as ErrorRegenerator,
	MoleculerError,
	MoleculerRetryableError
} from "./errors";
import type { Base as BaseLogger, LogLevels } from "./loggers";
import type { Logger, LoggerConfig } from "./logger-factory";
import type { MetricRegistry, MetricRegistryOptions } from "./metrics";
import type { Middleware, MiddlewareCallHandlerOptions } from "./middleware";
import type { BulkheadOptions } from "./middlewares/index";
import type ServiceRegistry from "./registry";
import type { Base as BaseDiscoverer, RegistryDiscovererOptions } from "./registry/discoverers";
import type { Base as BaseSerializer } from "./serializers";
import type { ActionHandler, ServiceSchema } from "./service";
import type { Tracer, TracerOptions } from "./tracing";
import type Transit from "./transit";
import type { Base as BaseTransporter } from "./transporters";
import type { Base as BaseValidator, ValidatorNames, ValidatorOptions } from "./validators";
import type Context = require("./context");
import type MiddlewareHandler = require("./middleware");
import type BrokerNode = require("./registry/node");
import type ActionEndpoint = require("./registry/endpoint-action");
import type EventEndpoint = require("./registry/endpoint-event");
import type Service = require("./service");

declare namespace ServiceBroker {
	type BrokerSyncLifecycleHandler = (broker: ServiceBroker) => void;
	type BrokerAsyncLifecycleHandler = (broker: ServiceBroker) => void | Promise<void>;

	export interface ServiceBrokerOptions {
		namespace?: string | null;
		nodeID?: string | null;

		logger?: BaseLogger | LoggerConfig | LoggerConfig[] | boolean | null;
		logLevel?: LogLevels | LogLevelConfig | null;

		transporter?: BaseTransporter | string | Record<string, any> | null;
		requestTimeout?: number;
		retryPolicy?: RetryPolicyOptions;

		contextParamsCloning?: boolean;
		maxCallLevel?: number;
		heartbeatInterval?: number;
		heartbeatTimeout?: number;

		tracking?: BrokerTrackingOptions;

		disableBalancer?: boolean;

		registry?: BrokerRegistryOptions;

		circuitBreaker?: BrokerCircuitBreakerOptions;

		bulkhead?: BulkheadOptions;

		transit?: BrokerTransitOptions;

		uidGenerator?: () => string;

		errorHandler?: ((err: Error, info: any) => void) | null;

		cacher?: boolean | BaseCacher | string | Record<string, any> | null;
		serializer?: BaseSerializer | string | Record<string, any> | null;
		validator?: boolean | BaseValidator | ValidatorNames | ValidatorOptions | null;
		errorRegenerator?: ErrorRegenerator | null;

		metrics?: boolean | MetricRegistryOptions;
		tracing?: boolean | TracerOptions;

		internalServices?:
			| boolean
			| {
					[key: string]: Partial<ServiceSchema>;
			  };
		internalMiddlewares?: boolean;

		dependencyInterval?: number;
		dependencyTimeout?: number;

		hotReload?: boolean | HotReloadOptions;

		middlewares?: (Middleware | string)[];

		replCommands?: Record<string, any>[] | null;
		replDelimiter?: string;

		metadata?: Record<string, any>;

		ServiceFactory?: typeof Service;
		ContextFactory?: typeof Context;
		Promise?: PromiseConstructorLike;

		created?: BrokerSyncLifecycleHandler;
		started?: BrokerAsyncLifecycleHandler;
		stopped?: BrokerAsyncLifecycleHandler;

		/**
		 * If true, process.on("beforeExit/exit/SIGINT/SIGTERM", ...) handler won't be registered!
		 * You have to register this manually and stop broker in this case!
		 */
		skipProcessEventRegistration?: boolean;

		maxSafeObjectSize?: number;
	}

	export interface BrokerRegistryOptions {
		strategy?: Function | string;
		strategyOptions?: Record<string, any>;
		preferLocal?: boolean;
		discoverer?: RegistryDiscovererOptions | BaseDiscoverer | string;
	}

	export interface BrokerCircuitBreakerOptions {
		enabled?: boolean;
		threshold?: number;
		windowTime?: number;
		minRequestCount?: number;
		halfOpenTime?: number;
		check?: CheckRetryable;
	}

	export interface PongResponse {
		nodeID: string;
		elapsedTime: number;
		timeDiff: number;
	}

	export interface PongResponses {
		[name: string]: PongResponse;
	}

	export interface ServiceSearchObj {
		name: string;
		version?: string | number;
	}

	export interface HotReloadOptions {
		modules?: string[];
	}

	export interface LogLevelConfig {
		[module: string]: boolean | LogLevels;
	}

	export interface BrokerTransitOptions {
		maxQueueSize?: number;
		disableReconnect?: boolean;
		disableVersionCheck?: boolean;
		maxChunkSize?: number;
	}

	export interface BrokerTrackingOptions {
		enabled?: boolean;
		shutdownTimeout?: number;
	}

	export interface NodeHealthStatus {
		cpu: {
			load1: number;
			load5: number;
			load15: number;
			cores: number;
			utilization: number;
		};
		mem: {
			free: number;
			total: number;
			percent: number;
		};
		os: {
			uptime: number;
			type: string;
			release: string;
			hostname: string;
			arch: string;
			platform: string;
			user: string;
		};
		process: {
			pid: NodeJS.Process["pid"];
			memory: NodeJS.MemoryUsage;
			uptime: number;
			argv: string[];
		};
		client: {
			type: string;
			version: string;
			langVersion: NodeJS.Process["version"];
		};
		net: {
			ip: string[];
		};
		time: {
			now: number;
			iso: string;
			utc: string;
		};
	}

	export type CheckRetryable = (err: MoleculerError | Error) => boolean;

	export interface RetryPolicyOptions {
		enabled?: boolean;
		retries?: number;
		delay?: number;
		maxDelay?: number;
		factor?: number;
		check?: CheckRetryable;
	}

	export type FallbackHandler = (ctx: Context, err: MoleculerError) => Promise<any>;
	export type FallbackResponse = string | number | Record<string, any>;
	export type FallbackResponseHandler = (ctx: Context, err: MoleculerError) => Promise<any>;

	export interface CallingOptions {
		timeout?: number;
		retries?: number;
		fallbackResponse?: FallbackResponse | FallbackResponse[] | FallbackResponseHandler;
		nodeID?: string;
		meta?: Record<string, any>;
		parentSpan?: ContextParentSpan;
		parentCtx?: Context;
		requestID?: string;
		tracking?: boolean;
		paramsCloning?: boolean;
		caller?: string;
	}

	export interface MCallCallingOptions extends CallingOptions {
		settled?: boolean;
	}

	export interface CallDefinition<P extends Record<string, any> = Record<string, any>> {
		action: string;
		params: P;
	}

	export interface MCallDefinition<P extends Record<string, any> = Record<string, any>>
		extends CallDefinition<P> {
		options?: CallingOptions;
	}
}

declare class ServiceBroker {
	static MOLECULER_VERSION: string;

	static PROTOCOL_VERSION: "4";

	static INTERNAL_MIDDLEWARES: string[];

	static defaultOptions: ServiceBroker.ServiceBrokerOptions;

	static Promise: PromiseConstructorLike;

	MOLECULER_VERSION: string;

	PROTOCOL_VERSION: "4";

	options: ServiceBroker.ServiceBrokerOptions;

	Promise: PromiseConstructorLike;

	ServiceFactory: typeof Service;

	ContextFactory: typeof Context;

	started: boolean;

	namespace: string;

	nodeID: string;

	instanceID: string;

	logger: Logger;

	services: Service[];

	localBus: EventEmitter2;

	scope: AsyncStorage;

	metrics: MetricRegistry;

	middlewares: MiddlewareHandler;

	registry: ServiceRegistry;

	cacher?: BaseCacher;

	serializer?: BaseSerializer;

	validator?: BaseValidator;

	errorRegenerator?: ErrorRegenerator;

	tracer: Tracer;

	transit?: Transit;

	constructor(options?: ServiceBroker.ServiceBrokerOptions);

	start(): Promise<void>;

	stop(): Promise<void>;

	errorHandler(err: Error, info: Record<string, any>): void;

	wrapMethod(
		method: string,
		handler: ActionHandler,
		bindTo?: any,
		opts?: MiddlewareCallHandlerOptions
	): typeof handler;

	callMiddlewareHookSync(
		name: string,
		args: any[],
		opts: MiddlewareCallHandlerOptions
	): Promise<void>;

	callMiddlewareHook(name: string, args: any[], opts: MiddlewareCallHandlerOptions): void;

	isMetricsEnabled(): boolean;

	isTracingEnabled(): boolean;

	getLogger(module: string, props?: Record<string, any>): Logger;

	fatal(message: string, err?: Error, needExit?: boolean): void;

	loadServices(folder?: string, fileMask?: string): number;

	loadService(filePath: string): Service;

	createService(schema: ServiceSchema, schemaMods?: ServiceSchema): Service;

	destroyService(service: Service | string | ServiceBroker.ServiceSearchObj): Promise<void>;

	getLocalService(name: string | ServiceBroker.ServiceSearchObj): Service;

	waitForServices(
		serviceNames: string | string[] | ServiceBroker.ServiceSearchObj[],
		timeout?: number,
		interval?: number,
		logger?: Logger
	): Promise<void>;

	findNextActionEndpoint(
		actionName: string,
		opts?: Record<string, any>,
		ctx?: Context
	): ActionEndpoint | MoleculerRetryableError;

	call<TReturn>(actionName: string): Promise<TReturn>;
	call<TReturn, TParams>(
		actionName: string,
		params: TParams,
		opts?: ServiceBroker.CallingOptions
	): Promise<TReturn>;

	mcall<TReturn>(
		def: Record<string, ServiceBroker.MCallDefinition>,
		opts?: ServiceBroker.MCallCallingOptions
	): Promise<Record<string, TReturn>>;
	mcall<TReturn>(
		def: ServiceBroker.MCallDefinition[],
		opts?: ServiceBroker.MCallCallingOptions
	): Promise<TReturn[]>;

	emit<TData>(eventName: string, data: TData, opts: Record<string, any>): Promise<void>;
	emit<TData>(eventName: string, data: TData, groups: string[]): Promise<void>;
	emit<TData>(eventName: string, data: TData, groups: string): Promise<void>;
	emit<TData>(eventName: string, data: TData): Promise<void>;
	emit(eventName: string): Promise<void>;

	broadcast<TData>(eventName: string, data: TData, opts: Record<string, any>): Promise<void>;
	broadcast<TData>(eventName: string, data: TData, groups: string[]): Promise<void>;
	broadcast<TData>(eventName: string, data: TData, groups: string): Promise<void>;
	broadcast<TData>(eventName: string, data: TData): Promise<void>;
	broadcast(eventName: string): Promise<void>;

	broadcastLocal<TData>(eventName: string, data: TData, opts: Record<string, any>): Promise<void>;
	broadcastLocal<TData>(eventName: string, data: TData, groups: string[]): Promise<void>;
	broadcastLocal<TData>(eventName: string, data: TData, groups: string): Promise<void>;
	broadcastLocal<TData>(eventName: string, data: TData): Promise<void>;
	broadcastLocal(eventName: string): Promise<void>;

	ping(): Promise<ServiceBroker.PongResponses>;
	ping(nodeID: string | string[], timeout?: number): Promise<ServiceBroker.PongResponse>;

	getHealthStatus(): ServiceBroker.NodeHealthStatus;

	getLocalNodeInfo(): BrokerNode;

	getCpuUsage(): Promise<any>;

	generateUid(): string;

	hasEventListener(eventName: string): boolean;

	getEventListener(eventName: string): EventEndpoint[];

	getConstructorName(obj: any): string;

	[key: string]: any;
}

export = ServiceBroker;
