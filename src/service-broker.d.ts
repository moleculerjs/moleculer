import type { EventEmitter2 } from "eventemitter2";
import type AsyncStorage from "./async-storage";
import type { Base as BaseCacher } from "./cachers";
import type Context from "./context";
import type { Regenerator as ErrorRegenerator } from "./errors";
import type { Base as BaseLogger } from "./loggers";
import type { Logger } from "./logger-factory";
import type { MetricRegistry } from "./metrics";
import type MiddlewareHandler from "./middleware";
import type { BulkheadOptions } from "./middlewares";
import type ServiceRegistry from "./registry";
import type { Base as BaseSerializer } from "./serializers";
import type Service from "./service";
import type { Tracer } from "./tracing";
import type Transit from "./transit";
import type { Base as BaseValidator, ValidatorNames } from "./validators";
import type BrokerNode = require("./registry/node");
import BaseDiscoverer = require("./registry/discoverers/base");

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

	destroyService(service: Service | string | ServiceSearchObj): Promise<void>;

	getLocalService(name: string | ServiceSearchObj): Service;

	waitForServices(
		serviceNames: string | string[] | ServiceSearchObj[],
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
		opts?: CallingOptions
	): Promise<TReturn>;

	mcall<TReturn>(
		def: Record<string, MCallDefinition>,
		opts?: MCallCallingOptions
	): Promise<Record<string, TReturn>>;
	mcall<TReturn>(def: MCallDefinition[], opts?: MCallCallingOptions): Promise<TReturn[]>;

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

	ping(): Promise<PongResponses>;
	ping(nodeID: string | string[], timeout?: number): Promise<PongResponse>;

	getHealthStatus(): NodeHealthStatus;

	getLocalNodeInfo(): BrokerNode;

	getCpuUsage(): Promise<any>;

	generateUid(): string;

	hasEventListener(eventName: string): boolean;

	getEventListener(eventName: string): EventEndpoint[];

	getConstructorName(obj: any): string;

	[key: string]: any;
}

export = ServiceBroker;
