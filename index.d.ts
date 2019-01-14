declare namespace Moleculer {
	type GenericObject = { [name: string]: any };

	type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	interface Logger {
		fatal: (...args: any[]) => void;
		error: (...args: any[]) => void;
		warn: (...args: any[]) => void;
		info: (...args: any[]) => void;
		debug: (...args: any[]) => void;
		trace: (...args: any[]) => void;
	}

	class LoggerInstance {
		fatal(...args: any[]): void;
		error(...args: any[]): void;
		warn(...args: any[]): void;
		info(...args: any[]): void;
		debug(...args: any[]): void;
		trace(...args: any[]): void;
	}

	type ActionHandler<T = any> = ((ctx: Context) => PromiseLike<T> | T) & ThisType<Service>;
	type ActionParamSchema = { [key: string]: any };
	type ActionParamTypes = "boolean" | "number" | "string" | "object" | "array" | ActionParamSchema;
	type ActionParams = { [key: string]: ActionParamTypes };

	type MetricsParamsFuncType = (params: ActionParams) => any;
	type MetricsMetaFuncType = (meta: object) => any;
	type MetricsOptions = { params?: boolean | string[] | MetricsParamsFuncType, meta?: boolean | string[] | MetricsMetaFuncType };

	interface BulkheadOptions {
		enabled?: boolean;
		concurrency?: number;
		maxQueueSize?: number;
	}

	interface ActionCacheOptions {
		ttl?: number;
		keys?: Array<string>;
	}

	type ActionVisibility = "published" | "public" | "protected" | "private"

	interface Action {
		name?: string;
		visibility?: ActionVisibility;
		params?: ActionParams;
		service?: Service;
		cache?: boolean | ActionCacheOptions;
		handler: ActionHandler;
		metrics?: MetricsOptions;
		bulkhead?: BulkheadOptions;
		circuitBreaker?: BrokerCircuitBreakerOptions;
		retryPolicy?: RetryPolicyOptions;
		fallback?: string | FallbackHandler;

		[key: string]: any;
	}

	interface BrokerNode {
		id: string;
		available: boolean;
		local: boolean;
		hostname: boolean;
	}

	type ServiceActions = { [key: string]: Action | ActionHandler; };
	type Actions = ServiceActions;


	class Context<P = GenericObject, M = GenericObject> {
		constructor(broker: ServiceBroker, endpoint: Endpoint);
		id: string;
		broker: ServiceBroker;
		endpoint: Endpoint;
		action: Action;
		service?: Service;
		nodeID?: string;

		options: CallingOptions;

		parentID?: string;

		metrics?: boolean;
		level: number;

		params: P;
		meta: M;

		requestID?: string;
		duration: number;

		cachedResult: boolean;

		setParams(newParams: P, cloning?: boolean): void;
		call<T = any, P extends GenericObject = GenericObject>(actionName: string, params?: P, opts?: GenericObject): PromiseLike<T>;
		emit(eventName: string, data: any, groups: Array<string>): void;
		emit(eventName: string, data: any, groups: string): void;
		emit(eventName: string, data: any): void;
		broadcast(eventName: string, data: any, groups: Array<string>): void;
		broadcast(eventName: string, data: any, groups: string): void;
		broadcast(eventName: string, data: any): void;

		static create(broker: ServiceBroker, endpoint: Endpoint, params: GenericObject, opts: GenericObject): Context;
		static create(broker: ServiceBroker, endpoint: Endpoint, params: GenericObject): Context;
		static create(broker: ServiceBroker, endpoint: Endpoint): Context;
	}

	interface ServiceSettingSchema {
		$noVersionPrefix?: boolean;
		$noServiceNamePrefix?: boolean;
		$dependencyTimeout?: number;
		[name: string]: any;
	}

	type ServiceEventHandler = ((payload: any, sender: string, eventName: string) => void) & ThisType<Service>;

	interface ServiceEvent {
		name?: string;
		group?: string;
		handler: ServiceEventHandler;
	}

	type ServiceEvents = { [key: string]: ServiceEventHandler | ServiceEvent };

	type ServiceMethods = { [key: string]: ((...args: any[]) => any) } & ThisType<Service>;

	type MiddlewareFunc = (handler: ActionHandler, action: Action) => any;
	
	type Middleware = { [key: string]: MiddlewareFunc }

	interface MiddlewareHandler {
		list: Middleware[];

		add(mw: Middleware): void;
		wrapHandler(method: string, handler: ActionHandler, def: GenericObject): typeof handler;
		callHandlers(method: string, args: any[], reverse: boolean): Promise<void>;
		callSyncHandlers(method: string, args: any[], reverse: boolean): void;
		count(): number;
		wrapBrokerMethods(): void;
		wrapMethod(method: string, handler: ActionHandler, bindTo: any): typeof handler;
	}

	interface ServiceSchema {
		name: string;
		version?: string | number;
		settings?: ServiceSettingSchema;
		dependencies?: string | GenericObject | Array<string> | Array<GenericObject>;
		metadata?: GenericObject;
		actions?: ServiceActions;
		mixins?: Array<ServiceSchema>;
		methods?: ServiceMethods;

		events?: ServiceEvents;
		created?: () => void;
		started?: () => PromiseLike<void>;
		stopped?: () => PromiseLike<void>;
		[name: string]: any;
	}

	class Service implements ServiceSchema {
		constructor(broker: ServiceBroker, schema?: ServiceSchema);

		protected parseServiceSchema(schema: ServiceSchema): void;

		name: string;
		version?: string | number;
		settings: ServiceSettingSchema;
		metadata: GenericObject;
		dependencies: string | GenericObject | Array<string> | Array<GenericObject>;
		schema: ServiceSchema;
		broker: ServiceBroker;
		logger: LoggerInstance;
		actions?: ServiceActions;
		Promise: PromiseConstructorLike;

		waitForServices(serviceNames: string | Array<string> | Array<GenericObject>, timeout?: number, interval?: number): PromiseLike<void>;

		_init(): void;
		_start(): PromiseLike<void>;
		_stop(): PromiseLike<void>;
		[name: string]: any;
	}

	type CheckRetryable = (err: Error) => boolean;

	interface BrokerCircuitBreakerOptions {
		enabled?: boolean,
		threshold?: number;
		windowTime?: number;
		minRequestCount?: number;
		halfOpenTime?: number;
		check?: CheckRetryable;
	}

	interface RetryPolicyOptions {
		enabled?: boolean,
		retries?: number;
		delay?: number;
		maxDelay?: number;
		factor?: number;
		check: CheckRetryable;
	}

	interface BrokerRegistryOptions {
		strategy?: Function | string;
		strategyOptions?: GenericObject;
		preferLocal?: boolean;
	}

	interface BrokerTransitOptions {
		maxQueueSize?: number;
		packetLogFilter?: Array<string>;
		disableReconnect?: boolean;
	}

	interface BrokerTrackingOptions {
		enabled?: boolean;
		shutdownTimeout?: number;
	}

	interface LogLevelConfig {
		[module: string]: boolean | LogLevels;
	}

	interface BrokerOptions {
		namespace?: string;
		nodeID?: string;

		logger?: Logger | boolean;
		logLevel?: LogLevels | LogLevelConfig;
		logFormatter?: Function | string;
		logObjectPrinter?: Function;

		transporter?: Transporter | string | GenericObject;
		requestTimeout?: number;
		retryPolicy?: RetryPolicyOptions;

		maxCallLevel?: number;
		heartbeatInterval?: number;
		heartbeatTimeout?: number

		trackContext?: boolean;
		gracefulStopTimeout?: number;

		tracking?: BrokerTrackingOptions;

		disableBalancer?: boolean;

		registry?: BrokerRegistryOptions;

		circuitBreaker?: BrokerCircuitBreakerOptions;

		bulkhead?: BulkheadOptions;

		transit?: BrokerTransitOptions;

		cacher?: Cacher | string | GenericObject;
		serializer?: Serializer | string | GenericObject;

		validation?: boolean;
		validator?: Validator;
		metrics?: boolean;
		metricsRate?: number;
		internalServices?: boolean;
		internalMiddlewares?: boolean;

		hotReload?: boolean;

		middlewares?: Array<Middleware>;
		replCommands?: Array<GenericObject>;

		ServiceFactory?: Service;
		ContextFactory?: Context;

		created?: (broker: ServiceBroker) => void;
		started?: (broker: ServiceBroker) => void;
		stopped?: (broker: ServiceBroker) => void;

		/**
		 * If true, process.on("beforeExit/exit/SIGINT/SIGTERM", ...) handler won't be registered!
		 * You have to register this manually and stop broker in this case!
		 */
		skipProcessEventRegistration?: boolean;
	}

	interface NodeHealthStatus {
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
		transit: {
			stat: GenericObject;
		} | null,
		time: {
			now: number;
			iso: string;
			utc: string;
		};
	}

	type FallbackHandler = (ctx: Context, err: Errors.MoleculerError) => PromiseLike<any>;
	type FallbackResponse = string | number | GenericObject;
	type FallbackResponseHandler = (ctx: Context, err: Errors.MoleculerError) => PromiseLike<any>;

	interface CallingOptions {
		timeout?: number;
		retries?: number;
		fallbackResponse?: FallbackResponse | Array<FallbackResponse> | FallbackResponseHandler;
		nodeID?: string;
		meta?: GenericObject;
		parentCtx?: Context;
		requestID?: string;
	}

	type CallDefinition<P extends GenericObject = GenericObject> = {
		action: string;
		params: P;
	};

	interface Endpoint {
		broker: ServiceBroker;

		id: string;
		node: GenericObject;

		local: boolean;
		state: boolean;
	}

	interface ActionEndpoint extends Endpoint {
		service: Service;
		action: Action;
	}

	interface PongResponse {
		nodeID: string;
		elapsedTime: number;
		timeDiff: number
	}

	interface PongResponses {
		[name: string]: PongResponse;
	}

	class ServiceBroker {
		constructor(options?: BrokerOptions);

		Promise: PromiseConstructorLike;

		namespace: string;
		nodeID: string;
		logger: LoggerInstance;
		cacher?: Cacher;
		serializer?: Serializer;
		validator?: Validator;
		transit: GenericObject;
		middlewares: MiddlewareHandler;

		start(): PromiseLike<void>;
		stop(): PromiseLike<void>;

		repl(): void;

		getLogger(module: string, props?: string | GenericObject): LoggerInstance;
		fatal(message: string, err?: Error, needExit?: boolean): void;
		loadServices(folder?: string, fileMask?: string): number;
		loadService(filePath: string): Service;
		watchService(service: Service): void;
		hotReloadService(service: Service): Service;
		createService(schema: ServiceSchema, schemaMods?: ServiceSchema): Service;
		destroyService(service: Service): PromiseLike<void>;

		getLocalService(serviceName: string, version?: string | number): Service;
		waitForServices(serviceNames: string | Array<string> | Array<GenericObject>, timeout?: number, interval?: number, logger?: LoggerInstance): PromiseLike<void>;

		/**
		 *
		 * @param mws
		 * @deprecated
		 */
		use(...mws: Array<Function>): void;

		findNextActionEndpoint(actionName: string, opts?: GenericObject): ActionEndpoint | Errors.MoleculerRetryableError;

		/**
		 * Call an action (local or global)
		 *
		 * @param {any} actionName	name of action
		 * @param {any} params		params of action
		 * @param {any} opts		options of call (optional)
		 * @returns
		 *
		 * @memberof ServiceBroker
		 */
		call<T = any, P extends GenericObject = GenericObject>(actionName: string, params?: P, opts?: CallingOptions): PromiseLike<T>;

		/**
		 * Multiple action calls.
		 *
		 * @param {Array<CallDefinition> | { [name: string]: CallDefinition }} def Calling definitions.
		 * @returns {PromiseLike<Array<GenericObject>|GenericObject>}
		 * | (broker: ServiceBroker): Service)
		 * @example
		 * Call `mcall` with an array:
		 * ```js
		 * broker.mcall([
		 * 	{ action: "posts.find", params: { limit: 5, offset: 0 } },
		 * 	{ action: "users.find", params: { limit: 5, sort: "username" }, opts: { timeout: 500 } }
		 * ]).then(results => {
		 * 	let posts = results[0];
		 * 	let users = results[1];
		 * })
		 * ```
		 *
		 * @example
		 * Call `mcall` with an Object:
		 * ```js
		 * broker.mcall({
		 * 	posts: { action: "posts.find", params: { limit: 5, offset: 0 } },
		 * 	users: { action: "users.find", params: { limit: 5, sort: "username" }, opts: { timeout: 500 } }
		 * }).then(results => {
		 * 	let posts = results.posts;
		 * 	let users = results.users;
		 * })
		 * ```
		 * @throws MoleculerError - If the `def` is not an `Array` and not an `Object`.
		 *
		 * @memberof ServiceBroker
		 */
		mcall<T = any>(def: Array<CallDefinition> | { [name: string]: CallDefinition }): PromiseLike<Array<T> | T>;

		/**
		 * Emit an event (global & local)
		 *
		 * @param {any} eventName
		 * @param {any} payload
		 * @returns
		 *
		 * @memberof ServiceBroker
		 */
		emit(eventName: string, payload?: any, groups?: string | Array<string>): void;

		/**
		 * Emit an event for all local & remote services
		 *
		 * @param {string} eventName
		 * @param {any} payload
		 * @param {Array<string>?} groups
		 * @returns
		 *
		 * @memberof ServiceBroker
		 */
		broadcast(eventName: string, payload?: any, groups?: string | Array<string>): void

		/**
		 * Emit an event for all local services
		 *
		 * @param {string} eventName
		 * @param {any} payload
		 * @param {Array<string>?} groups
		 * @returns
		 *
		 * @memberof ServiceBroker
		 */
		broadcastLocal(eventName: string, payload?: any, groups?: string | Array<string>): void;

		ping(): PromiseLike<PongResponses>;
		ping(nodeID: string, timeout?: number): PromiseLike<PongResponse>;
		ping(nodeID: Array<string>, timeout?: number): PromiseLike<PongResponses>;

		getHealthStatus(): NodeHealthStatus;
		getLocalNodeInfo(): {
			ipList: string[];
			hostname: string;
			client: any;
			config: any;
			port: any;
			services: Array<any>;
		};

		getCpuUsage(): PromiseLike<any>;

		MOLECULER_VERSION: string;
		PROTOCOL_VERSION: string;
		[name: string]: any;

		static MOLECULER_VERSION: string;
		static PROTOCOL_VERSION: string;
		static defaultOptions: BrokerOptions;
	}

	class Packet {
		constructor(type: string, target: string, payload?: any);
	}

	namespace Packets {
		type PROTOCOL_VERSION = "3";
		type PACKET_UNKNOWN = "???";
		type PACKET_EVENT = "EVENT";
		type PACKET_REQUEST = "REQ";
		type PACKET_RESPONSE = "RES";
		type PACKET_DISCOVER = "DISCOVER";
		type PACKET_INFO = "INFO";
		type PACKET_DISCONNECT = "DISCONNECT";
		type PACKET_HEARTBEAT = "HEARTBEAT";
		type PACKET_PING = "PING";
		type PACKET_PONG = "PONG";

		type PACKET_GOSSIP_REQ = "GOSSIP_REQ";
		type PACKET_GOSSIP_RES = "GOSSIP_RES";
		type PACKET_GOSSIP_HELLO = "GOSSIP_HELLO";

		const PROTOCOL_VERSION: PROTOCOL_VERSION;
		const PACKET_UNKNOWN: PACKET_UNKNOWN;
		const PACKET_EVENT: PACKET_EVENT;
		const PACKET_REQUEST: PACKET_REQUEST;
		const PACKET_RESPONSE: PACKET_RESPONSE;
		const PACKET_DISCOVER: PACKET_DISCOVER;
		const PACKET_INFO: PACKET_INFO;
		const PACKET_DISCONNECT: PACKET_DISCONNECT;
		const PACKET_HEARTBEAT: PACKET_HEARTBEAT;
		const PACKET_PING: PACKET_PING;
		const PACKET_PONG: PACKET_PONG;

		const PACKET_GOSSIP_REQ: PACKET_GOSSIP_REQ;
		const PACKET_GOSSIP_RES: PACKET_GOSSIP_RES;
		const PACKET_GOSSIP_HELLO: PACKET_GOSSIP_HELLO;

		interface PacketPayload {
			ver: PROTOCOL_VERSION;
			sender: string | null;
		}

		interface Packet {
			type: PACKET_UNKNOWN | PACKET_EVENT | PACKET_DISCONNECT | PACKET_DISCOVER |
			PACKET_INFO | PACKET_HEARTBEAT | PACKET_REQUEST | PACKET_PING | PACKET_PONG | PACKET_RESPONSE | PACKET_GOSSIP_REQ | PACKET_GOSSIP_RES | PACKET_GOSSIP_HELLO;
			target?: string;
			payload: PacketPayload
		}
	}

	class Transporter {
		constructor(opts?: GenericObject);
		init(transit: Transit, messageHandler: (cmd: string, msg: string) => void, afterConnect: (wasReconnect: boolean) => void): void;
		connect(): PromiseLike<any>;
		disconnect(): PromiseLike<any>;

		makeSubscriptions(topics: Array<GenericObject>): PromiseLike<void>;
		subscribe(cmd: string, nodeID?: string): PromiseLike<void>;
		subscribeBalancedRequest(action: string): PromiseLike<void>;
		subscribeBalancedEvent(event: string, group: string): PromiseLike<void>;
		unsubscribeFromBalancedCommands(): PromiseLike<void>;

		incomingMessage(cmd: string, msg: Buffer): PromiseLike<void>;

		prepublish(packet: Packet): PromiseLike<void>;
		publish(packet: Packet): PromiseLike<void>;
		publishBalancedEvent(packet: Packet, group: string): PromiseLike<void>;
		publishBalancedRequest(packet: Packet): PromiseLike<void>;

		getTopicName(cmd: string, nodeID?: string): string;
		makeBalancedSubscriptions(): PromiseLike<void>;

		serialize(packet: Packet): Buffer;
		deserialize(type: string, data: Buffer): Packet;
	}

	class Cacher {
		constructor(opts?: GenericObject);
		init(broker: ServiceBroker): void;
		close(): PromiseLike<any>;
		get(key: string): PromiseLike<null | GenericObject>;
		set(key: string, data: any, ttl?: number): PromiseLike<any>;
		del(key: string|Array<string>): PromiseLike<any>;
		clean(match?: string|Array<string>): PromiseLike<any>;
	}

	class Serializer {
		constructor();
		init(broker: ServiceBroker): void;
		serialize(obj: GenericObject, type: string): Buffer;
		deserialize(buf: Buffer, type: string): string;
	}

	class Validator {
		constructor();
		init(broker: ServiceBroker): void;
		compile(schema: GenericObject): Function;
		validate(params: GenericObject, schema: GenericObject): boolean;
	}

	class LoggerHelper {
		static extend(logger: LoggerInstance): LoggerInstance;
		static createDefaultLogger(baseLogger: LoggerInstance, bindings: GenericObject, logLevel?: string, logFormatter?: Function): LoggerInstance;
		static createDefaultLogger(bindings: GenericObject, logLevel?: string, logFormatter?: Function): LoggerInstance;
	}

	abstract class BaseStrategy {
		init(broker: ServiceBroker): void;
		select(list: any[]): any;
	}

	class RoundRobinStrategy extends BaseStrategy {
	}

	class RandomStrategy extends BaseStrategy {
	}

	class CpuUsageStrategy extends BaseStrategy {
	}

	class LatencyStrategy extends BaseStrategy {
	}

	namespace Transporters {
		type MessageHandler = ((cmd: string, msg: any) => PromiseLike<void>) & ThisType<Base>;
		type AfterConnectHandler = ((wasReconnect?: boolean) => PromiseLike<void>) & ThisType<Base>;

		class Base {
			constructor(opts?: GenericObject);

			public init(transit: Transit, messageHandler: MessageHandler, afterConnect: AfterConnectHandler): void;
			public init(transit: Transit, messageHandler: MessageHandler): void;

			public connect(): PromiseLike<any>;
			public onConnected(wasReconnect?: boolean): PromiseLike<void>;
			public disconnect(): PromiseLike<void>;

			public getTopicName(cmd: string, nodeID?: string): string;
			public makeSubscriptions(topics: Array<GenericObject>): PromiseLike<void>;
			public subscribe(cmd: string, nodeID: string): PromiseLike<void>;
			public subscribeBalancedRequest(action: string): PromiseLike<void>;
			public subscribeBalancedEvent(event: string, group: string): PromiseLike<void>;
			public unsubscribeFromBalancedCommands(): PromiseLike<void>;

			protected incomingMessage(cmd: string, msg: Buffer): PromiseLike<void>;

			public publish(packet: Packet): PromiseLike<void>;
			public publishBalancedEvent(packet: Packet, group: string): PromiseLike<void>;
			public publishBalancedRequest(packet: Packet): PromiseLike<void>;
			public prepublish(packet: Packet): PromiseLike<void>;

			public serialize(packet: Packet): Buffer;
			public deserialize(type: string, data: Buffer): Packet;


			protected opts: GenericObject;
			protected connected: boolean;
			protected hasBuiltInBalancer: boolean;
			protected transit: Transit;
			protected broker: ServiceBroker;
			protected nodeID: string;
			protected logger: Logger;
			protected prefix: string;
			protected messageHandler: MessageHandler;
			protected afterConnect?: AfterConnectHandler;
		}

		class Fake extends Base { }
		class NATS extends Base { }
		class MQTT extends Base { }
		class Redis extends Base { }
		class AMQP extends Base { }
		class Kafka extends Base { }
		class STAN extends Base { }
		class TCP extends Base { }
	}

	const Cachers: {
		Memory: Cacher,
		Redis: Cacher
	};
	const Serializers: {
		JSON: Serializer,
		Avro: Serializer,
		MsgPack: Serializer,
		ProtoBuf: Serializer,
		Thrift: Serializer,
		Notepack: Serializer
	};

	namespace Errors {
		class MoleculerError extends Error {
			public code: number;
			public type: string;
			public data: any;
			public retryable: boolean;

			constructor(message: string, code: number, type: string, data: any);
			constructor(message: string, code: number, type: string);
			constructor(message: string, code: number);
			constructor(message: string);
		}
		class MoleculerRetryableError extends MoleculerError { }
		class MoleculerServerError extends MoleculerRetryableError { }
		class MoleculerClientError extends MoleculerError { }

		class ServiceNotFoundError extends MoleculerRetryableError {
			constructor(data: any);
		}
		class ServiceNotAvailableError extends MoleculerRetryableError {
			constructor(data: any);
		}

		class RequestTimeoutError extends MoleculerRetryableError {
			constructor(data: any);
		}
		class RequestSkippedError extends MoleculerError {
			constructor(data: any);
		}
		class RequestRejectedError extends MoleculerRetryableError {
			constructor(data: any);
		}

		class QueueIsFullError extends MoleculerRetryableError {
			constructor(data: any);
		}
		class ValidationError extends MoleculerClientError {
			constructor(message: string, type: string, data: GenericObject);
			constructor(message: string, type: string);
			constructor(message: string);
		}
		class MaxCallLevelError extends MoleculerError {
			constructor(data: any);
		}

		class ServiceSchemaError extends MoleculerError {
			constructor(message: string, data: any);
		}

		class BrokerOptionsError extends MoleculerError {
			constructor(message: string, data: any);
		}

		class GracefulStopTimeoutError extends MoleculerError {
			constructor(data: any);
		}

		class ProtocolVersionMismatchError extends MoleculerError {
			constructor(data: any);
		}

		class InvalidPacketDataError extends MoleculerError {
			constructor(data: any);
		}


	}

	namespace Strategies {
		abstract class BaseStrategy {
			init(broker: ServiceBroker): void;
			select(list: any[]): any;
		}

		class RoundRobinStrategy extends BaseStrategy {
		}

		class RandomStrategy extends BaseStrategy {
		}

		class CpuUsageStrategy extends BaseStrategy {
		}

		class LatencyStrategy extends BaseStrategy {
		}
	}

	interface TransitRequest {
		action: string;
		nodeID: string;
		ctx: Context;
		resolve: (value: any) => void;
		reject: (reason: any) => void;
	}

	interface Transit {
		afterConnect(wasReconnect: boolean): PromiseLike<void>;
		connect(): PromiseLike<void>;
		disconnect(): PromiseLike<void>;
		sendDisconnectPacket(): PromiseLike<void>;
		makeSubscriptions(): PromiseLike<Array<void>>;
		messageHandler(cmd: string, msg: GenericObject): boolean | PromiseLike<void> | undefined;
		request(ctx: Context): PromiseLike<void>;
		sendBroadcastEvent(nodeID: string, eventName: string, data: GenericObject, nodeGroups: GenericObject): void;
		sendBalancedEvent(eventName: string, data: GenericObject, nodeGroups: GenericObject): void;
		sendEventToGroups(eventName: string, data: GenericObject, groups: Array<string>): void;
		sendEventToGroups(eventName: string, data: GenericObject): void;
		removePendingRequest(id: string): void;
		removePendingRequestByNodeID(nodeID: string): void;
		sendResponse(nodeID: string, id: string, data: GenericObject, err: Error): PromiseLike<void>;
		sendResponse(nodeID: string, id: string, data: GenericObject): PromiseLike<void>;
		discoverNodes(): PromiseLike<void>;
		discoverNode(nodeID: string): PromiseLike<void>;
		sendNodeInfo(nodeID: string): PromiseLike<void | Array<void>>;
		sendPing(nodeID: string): PromiseLike<void>;
		sendPong(payload: GenericObject): PromiseLike<void>;
		processPong(payload: GenericObject): void;
		sendHeartbeat(localNode: NodeHealthStatus): PromiseLike<void>;
		subscribe(topic: string, nodeID: string): PromiseLike<void>;
		publish(packet: Packet): PromiseLike<void>;

		pendingRequests: Map<string, TransitRequest>
		nodeID: string;
	}

	const CIRCUIT_CLOSE: string;
	const CIRCUIT_HALF_OPEN: string;
	const CIRCUIT_OPEN: string;
}

export = Moleculer;
