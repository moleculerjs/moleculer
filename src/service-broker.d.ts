import type { EventEmitter2 } from "eventemitter2";
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
import type { BulkheadOptions } from "./middlewares";
import type ServiceRegistry = require("./registry");
import type { Base as BaseSerializer } from "./serializers";
import type { ServiceSchema } from "./service";
import type { Tracer, TracerOptions } from "./tracing";
import type Transit = require("./transit");
import type { Base as BaseTransporter } from "./transporters";
import type { Base as BaseValidator, ValidatorNames, ValidatorOptions } from "./validators";
import type Context = require("./context");
import type MiddlewareHandler = require("./middleware");
import type ActionEndpoint = require("./registry/endpoint-action");
import type EventEndpoint = require("./registry/endpoint-event");
import type Service = require("./service");
import type { ServiceDependency } from "./service";
import type { Stream } from "stream";
import type { LoggerOptions } from "./loggers/base";
import type { TcpTransporterOptions } from "./transporters/tcp";
import type { NatsTransporterOptions } from "./transporters/nats";
import type { AmqpTransporterOptions } from "./transporters/amqp";
import type { Amqp10TransporterOptions } from "./transporters/amqp10";
import type { MqttTransporterOptions } from "./transporters/mqtt";
import type { KafkaTransporterOptions } from "./transporters/kafka";
import type { RedisTransporterOptions } from "./transporters/redis";
import type { MemoryCacherOptions } from "./cachers/memory";
import type { MemoryLRUCacherOptions } from "./cachers/memory-lru";
import type { RedisCacherOptions } from "./cachers/redis";
import type { UserInfo, type } from "os";
import type { JSONExtSerializerOptions } from "./serializers/json-extended";
import type { CborSerializerOptions } from "./serializers/cbor";
import type ServiceItem = require("./registry/service-item");

declare namespace ServiceBroker {
	type BrokerSyncLifecycleHandler = (broker: ServiceBroker) => void;
	type BrokerAsyncLifecycleHandler = (broker: ServiceBroker) => void | Promise<void>;

	type TransporterConfig =
		| {
				type: "AMQP";
				options?: AmqpTransporterOptions;
		  }
		| {
				type: "AMQP10";
				options?: Amqp10TransporterOptions;
		  }
		| {
				type: "Fake";
		  }
		| {
				type: "Kafka";
				options?: KafkaTransporterOptions;
		  }
		| {
				type: "MQTT";
				options?: MqttTransporterOptions;
		  }
		| {
				type: "NATS";
				options?: NatsTransporterOptions;
		  }
		| {
				type: "Redis";
				options?: RedisTransporterOptions;
		  }
		| {
				type: "TCP";
				options?: TcpTransporterOptions;
		  };

	type TransporterType = TransporterConfig["type"];

	type CacherConfig =
		| {
				type: "Memory";
				options?: MemoryCacherOptions;
		  }
		| {
				type: "MemoryLRU";
				options?: MemoryLRUCacherOptions;
		  }
		| {
				type: "Redis";
				options?: RedisCacherOptions;
		  };

	type CacherType = CacherConfig["type"];

	type SerializerConfig =
		| {
				type: "JSON";
		  }
		| {
				type: "JSONExt";
				options?: JSONExtSerializerOptions;
		  }
		| {
				type: "MsgPack";
		  }
		| {
				type: "Notepack";
		  }
		| {
				type: "CBOR";
				options?: CborSerializerOptions;
		  };

	type SerializerType = SerializerConfig["type"];

	export interface ServiceBrokerOptions {
		namespace?: string | null;
		nodeID?: string | null;

		logger?: BaseLogger<LoggerOptions> | LoggerConfig | LoggerConfig[] | boolean | null;
		logLevel?: LogLevels | LogLevelConfig | null;

		transporter?: BaseTransporter | TransporterType | TransporterConfig | null;
		requestTimeout?: number;
		retryPolicy?: RetryPolicyOptions;

		contextParamsCloning?: boolean;
		maxCallLevel?: number;
		heartbeatInterval?: number;
		heartbeatTimeout?: number;

		tracking?: BrokerTrackingOptions;

		disableBalancer?: boolean;

		registry?: ServiceRegistry.RegistryOptions;

		circuitBreaker?: BrokerCircuitBreakerOptions;

		bulkhead?: BulkheadOptions;

		transit?: Transit.TransitOptions;

		uidGenerator?: () => string;

		errorHandler?: ((err: Error, info: Record<string, any>) => void) | null;

		cacher?: boolean | BaseCacher<any> | CacherType | CacherConfig | null;
		serializer?: BaseSerializer | SerializerType | SerializerConfig | null;
		validator?: boolean | BaseValidator | ValidatorNames | ValidatorOptions | null;
		errorRegenerator?: ErrorRegenerator | null;

		metrics?: boolean | MetricRegistryOptions;
		tracing?: boolean | TracerOptions;

		internalServices?:
			| boolean
			| {
					$node: Partial<ServiceSchema>;
			  };
		internalMiddlewares?: boolean;

		dependencyInterval?: number;
		dependencyTimeout?: number;

		hotReload?: boolean | HotReloadOptions;

		middlewares?: (Middleware | string)[];

		replOptions?: ReplOptions | null;

		metadata?: Record<string, any>;

		ServiceFactory?: typeof Service;
		ContextFactory?: typeof Context;
		Promise?: PromiseConstructor;

		created?: BrokerSyncLifecycleHandler;
		started?: BrokerAsyncLifecycleHandler;
		stopped?: BrokerAsyncLifecycleHandler;

		skipProcessEventRegistration?: boolean;
		maxSafeObjectSize?: number | null;
	}

	export interface ReplOptions {
		customCommands?: Record<string, any>[] | null;
		delimiter?: string;
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

	export interface HotReloadOptions {
		modules?: string[];
	}

	export interface LogLevelConfig {
		[module: string]: boolean | LogLevels;
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
			user: UserInfo<string> | {};
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
		timeout?: number | null;
		retries?: number | null;
		fallbackResponse?: FallbackResponse | FallbackResponse[] | FallbackResponseHandler;
		nodeID?: string;
		meta?: Record<string, any>;
		parentSpan?: ContextParentSpan;
		parentCtx?: Context;
		requestID?: string;
		tracking?: boolean;
		paramsCloning?: boolean;
		caller?: string;
		headers?: Record<string, any>;
		stream?: Stream;
		ctx?: Context;
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

	static PROTOCOL_VERSION: string;

	static INTERNAL_MIDDLEWARES: string[];

	static defaultOptions: ServiceBroker.ServiceBrokerOptions;

	MOLECULER_VERSION: string;

	PROTOCOL_VERSION: string;

	options: ServiceBroker.ServiceBrokerOptions;

	Promise: PromiseConstructor;

	ServiceFactory: typeof Service;

	ContextFactory: typeof Context;

	namespace: string;

	nodeID: string;

	instanceID: string;

	logger: Logger;

	services: Service[];

	localBus: EventEmitter2;

	// scope: AsyncStorage;

	metrics: MetricRegistry;

	middlewares: MiddlewareHandler;

	registry: ServiceRegistry;

	cacher?: BaseCacher<any>;

	serializer?: BaseSerializer;

	validator?: BaseValidator;

	errorRegenerator?: ErrorRegenerator;

	tracer: Tracer;

	transit?: Transit;

	started: boolean;
	servicesStarting: boolean;
	stopping: boolean;

	constructor(options?: ServiceBroker.ServiceBrokerOptions);

	registerMiddlewares(userMiddlewares: MiddlewareHandler.Middleware[]): void;
	registerMoleculerMetrics(): void;

	start(): Promise<void>;

	stop(): Promise<void>;

	repl(): void;

	errorHandler(err: Error, info: Record<string, any>): void;

	wrapMethod(
		name: string,
		handler: Function,
		bindTo?: any,
		opts?: MiddlewareCallHandlerOptions
	): any;

	callMiddlewareHook(
		name: string,
		args: any[],
		opts?: MiddlewareCallHandlerOptions
	): Promise<void>;
	callMiddlewareHookSync(name: string, args: any[], opts?: MiddlewareCallHandlerOptions): void;

	isMetricsEnabled(): boolean;

	isTracingEnabled(): boolean;

	getLogger(module: string, props?: Record<string, any>): Logger;

	fatal(message: string, err?: Error, needExit?: boolean): void;

	loadServices(folder?: string, fileMask?: string): number;
	loadService(filePath: string): Service;

	getLocalService(name: string | ServiceDependency): Service;

	createService(schema: ServiceSchema, schemaMods?: ServiceSchema): Service;

	_restartService(service: Service): Promise<void>;

	addLocalService(service: Service): void;
	registerLocalService(registryItem: ServiceItem): void;

	destroyService(service: Service | string | ServiceDependency): Promise<void>;

	servicesChanged(localService?: boolean): void;
	localServiceChanged(): void;

	registerInternalServices(opts?: ServiceSchema): void;

	waitForServices(
		serviceNames: string | ServiceDependency | (string | ServiceDependency)[],
		timeout?: number,
		interval?: number,
		logger?: Logger
	): Promise<void>;

	findNextActionEndpoint(
		actionName: string | ActionEndpoint,
		opts?: Record<string, any>,
		ctx?: Context
	): ActionEndpoint | MoleculerRetryableError;

	call<TReturn>(actionName: string): Promise<TReturn>;
	call<TReturn, TParams>(
		actionName: string,
		params: TParams,
		opts?: ServiceBroker.CallingOptions
	): Promise<TReturn>;

	callWithoutBalancer<TReturn>(actionName: string): Promise<TReturn>;
	callWithoutBalancer<TReturn, TParams>(
		actionName: string,
		params: TParams,
		opts?: ServiceBroker.CallingOptions
	): Promise<TReturn>;

	_getLocalActionEndpoint(actionName: string, ctx?: Context): ActionEndpoint;

	mcall<TReturn>(
		def: Record<string, ServiceBroker.MCallDefinition> | ServiceBroker.MCallDefinition[],
		opts?: ServiceBroker.MCallCallingOptions
	): Promise<Record<string, TReturn> | TReturn[]>;

	emit<TData>(eventName: string, data?: TData, opts?: Record<string, any>): Promise<void>;
	emit(eventName: string): Promise<void>;

	broadcast<TData>(eventName: string, data?: TData, opts?: Record<string, any>): Promise<void>;
	broadcast(eventName: string): Promise<void>;

	broadcastLocal<TData>(
		eventName: string,
		data?: TData,
		opts?: Record<string, any>
	): Promise<void>;
	broadcastLocal(eventName: string): Promise<void>;

	ping(nodeID?: string | string[], timeout?: number): Promise<ServiceBroker.PongResponse>;

	getHealthStatus(): ServiceBroker.NodeHealthStatus;

	getLocalNodeInfo(): ServiceRegistry.NodeRawInfo;

	getEventGroups(eventName: string): string[];
	hasEventListener(eventName: string): boolean;
	getEventListeners(eventName: string): EventEndpoint[];
	emitLocalServices(ctx: Context): Promise<void>;

	getCpuUsage(): Promise<Record<string, any>>;
	generateUid(): string;

	getConstructorName(obj: Record<string, any>): string;
	normalizeSchemaConstructor(schema: ServiceSchema): ServiceSchema;
}

export = ServiceBroker;
