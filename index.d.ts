import * as Bluebird from "bluebird";
declare namespace Moleculer {
	type GenericObject = { [name: string]: any };

	interface Logger {
		fatal?: (...args: any[]) => void;
		error: (...args: any[]) => void;
		warn: (...args: any[]) => void;
		info: (...args: any[]) => void;
		debug?: (...args: any[]) => void;
		trace?: (...args: any[]) => void;
	}

	class LoggerInstance {
		fatal(...args: any[]): void;
		error(...args: any[]): void;
		warn(...args: any[]): void;
		info(...args: any[]): void;
		debug(...args: any[]): void;
		trace(...args: any[]): void;
	}

	type ActionHandler<T = any> = ((ctx: Context) => Bluebird<T> | T) & ThisType<Service>;
	type ActionParamSchema = { [key: string]: any };
	type ActionParamTypes = "boolean" | "number" | "string" | "object" | "array" | ActionParamSchema;
	type ActionParams = { [key: string]: ActionParamTypes };

	type MetricsParamsFuncType= (params: ActionParams) => any;
	type MetricsMetaFuncType= (meta: object) => any;
	type MetricsOptions = { params?: boolean | string[] | MetricsParamsFuncType, meta?: boolean | string[] | MetricsMetaFuncType };

	interface Action {
		name: string;
		params?: ActionParams;
		service?: Service;
		cache?: boolean;
		handler: ActionHandler;
		metrics?: MetricsOptions;
		[key: string]: any;
	}

	interface Node {
		id: string;
		available: boolean;
		local: boolean;
		hostname: boolean;
	}

	type Actions = { [key: string]: Action | ActionHandler; };

	class Context<P = GenericObject, M = GenericObject> {
		constructor(broker: ServiceBroker, endpoint: Endpoint);
		id: string;
		broker: ServiceBroker;
		endpoint: Endpoint;
		action: Action;
		service: Service;
		nodeID?: string;

		options: GenericObject;

		parentID?: string;
		callerNodeID?: string;

		metrics?: boolean;
		level?: number;

		params: P;
		meta: M;

		requestID?: string;
		duration: number;

		cachedResult: boolean;

		setParams(newParams: P, cloning?: boolean): void;
		call<T = any, P extends GenericObject = GenericObject>(actionName: string, params?: P, opts?: GenericObject): Bluebird<T>;
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
		[name: string]: any;
	}

	type ServiceEventHandler = ((payload: any, sender: string, eventName: string) => void) & ThisType<Service>;
	type ServiceLocalEventHandler = ((node: GenericObject) => void) & ThisType<Service>;

	interface ServiceEvent {
		name: string;
		group?: string;
		handler: ServiceEventHandler | ServiceLocalEventHandler;
	}

	type ServiceEvents = { [key: string]: ServiceEventHandler | ServiceLocalEventHandler };

	type ServiceMethods = { [key: string]: ((...args: any[]) => any) } & ThisType<Service>;

	type Middleware = (handler: ActionHandler, action: Action) => any;

	interface ServiceSchema {
		name: string;
		version?: string | number;
		settings?: ServiceSettingSchema;
		dependencies?: string | GenericObject | Array<string> | Array<GenericObject>;
		metadata?: GenericObject;
		actions?: Actions;
		mixins?: Array<ServiceSchema>;
		methods?: ServiceMethods;

		events?: ServiceEvents;
		created?: () => void;
		started?: () => Bluebird<void>;
		stopped?: () => Bluebird<void>;
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
		actions?: Actions;
		mixins?: Array<ServiceSchema>;
		methods?: ServiceMethods;
		Promise: typeof Bluebird;

		waitForServices(serviceNames: string | Array<string>, timeout?: number, interval?: number): Bluebird<void>;

		events?: ServiceEvents;
		created: () => void;
		started: () => Bluebird<void>;
		stopped: () => Bluebird<void>;
		[name: string]: any;
	}

	interface BrokerCircuitBreakerOptions {
		enabled?: boolean;
		maxFailures?: number;
		halfOpenTime?: number;
		failureOnTimeout?: boolean;
		failureOnReject?: boolean;
	}

	interface BrokerRegistryOptions {
		strategy?: Function | string;
		strategyOptions?: GenericObject;
		preferLocal?: boolean;
	}

	interface BrokerTransitOptions {
		maxQueueSize?: number;
	}

	interface BrokerOptions {
		namespace?: string;
		nodeID?: string;

		logger?: Logger | boolean;
		logLevel?: string;
		logFormatter?: Function | string;

		transporter?: Transporter | string | GenericObject;
		requestTimeout?: number;
		requestRetry?: number;
		maxCallLevel?: number;
		heartbeatInterval?: number;
		heartbeatTimeout?: number;

		disableBalancer?: boolean;

		transit?: BrokerTransitOptions;

		registry?: BrokerRegistryOptions;

		circuitBreaker?: BrokerCircuitBreakerOptions;

		cacher?: Cacher | string | GenericObject;
		serializer?: Serializer | string | GenericObject;

		validation?: boolean;
		validator?: Validator;
		metrics?: boolean;
		metricsRate?: number;
		internalServices?: boolean;

		hotReload?: boolean;

		ServiceFactory?: Service;
		ContextFactory?: Context;

		middlewares?: Array<Middleware>;

		created?: (broker: ServiceBroker) => void;
		started?: (broker: ServiceBroker) => void;
		stopped?: (broker: ServiceBroker) => void;
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

	type FallbackResponse = string | number | GenericObject;
	type FallbackResponseHandler = (ctx: Context, err: Errors.MoleculerError) => Bluebird<any>;

	interface CallOptions {
		timeout?: number;
		retries?: number;
		fallbackResponse?: FallbackResponse | Array<FallbackResponse> | FallbackResponseHandler;
		nodeID?: string;
		meta?: GenericObject;
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
		state:boolean;
	}

	interface ActionEndpoint extends Endpoint {
		service: Service;
		action: Action;
	}

	class ServiceBroker {
		constructor(options?: BrokerOptions);

		Promise: typeof Bluebird;

		namespace: string;
		nodeID: string;
		logger: LoggerInstance;
		cacher?: Cacher;
		serializer?: Serializer;
		validator?: Validator;
		transit: GenericObject;

		start(): Bluebird<void>;
		stop(): Bluebird<void>;

		repl(): void;

		getLogger(module: string, service?: string, version?: number | string): LoggerInstance;
		fatal(message: string, err?: Error, needExit?: boolean): void;
		loadServices(folder?: string, fileMask?: string): number;
		loadService(filePath: string): Service;
		watchService(service: Service): void;
		hotReloadService(service: Service): Service;
		createService(schema: ServiceSchema): Service;
		destroyService(service: Service): Bluebird<void>;

		getLocalService(serviceName: string, version?: string | number): Service;
		waitForServices(serviceNames: string | Array<string>, timeout?: number, interval?: number, logger?: LoggerInstance): Bluebird<void>;

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
		call<T = any, P extends GenericObject = GenericObject>(actionName: string, params?: P, opts?: CallOptions): Bluebird<T>;

		/**
		 * Multiple action calls.
		 *
		 * @param {Array<CallDefinition> | { [name: string]: CallDefinition }} def Calling definitions.
		 * @returns {Bluebird<Array<GenericObject>|GenericObject>}
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
		mcall<T = any>(def: Array<CallDefinition> | { [name: string]: CallDefinition }): Bluebird<Array<T> | T>;

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

		ping(): Bluebird<any>;
		ping(nodeID: string): Bluebird<any>;
		ping(nodeID: Array<string>): Bluebird<any>;

		getHealthStatus(): NodeHealthStatus;
		getLocalNodeInfo(force?: boolean): {
			ipList: string[];
			hostname: string;
			client: any;
			config: any;
			port: any;
			services: Array<any>;
		};

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
		init(broker: ServiceBroker, messageHandler: (cmd: string, msg: string) => void): void;
		connect(): Bluebird<any>;
		disconnect(): Bluebird<any>;

		getTopicName(cmd: string, nodeID?: string): string;
		makeSubscriptions(topics: Array<GenericObject>): Bluebird<void>;
		makeBalancedSubscriptions(): Bluebird<void>;
		subscribe(cmd: string, nodeID?: string): Bluebird<void>;
		subscribeBalancedRequest(action: string): Bluebird<void>;
		subscribeBalancedEvent(event: string, group: string): Bluebird<void>;
		unsubscribeFromBalancedCommands(): Bluebird<void>;

		incomingMessage(cmd: string, msg: Buffer): Bluebird<void>;

		prepublish(packet: Packet): Bluebird<void>;
		publish(packet: Packet): Bluebird<void>;
		publishBalancedEvent(packet: Packet, group: string): Bluebird<void>;
		publishBalancedRequest(packet: Packet): Bluebird<void>;

		serialize(packet: Packet): Buffer;
		deserialize(type: string, data: Buffer): Packet;
	}

	class Cacher {
		constructor(opts?: GenericObject);
		init(broker: ServiceBroker): void;
		close(): Bluebird<any>;
		get(key: string): Bluebird<null | GenericObject>;
		set(key: string, data: any): Bluebird<any>;
		del(key: string): Bluebird<any>;
		clean(match?: string): Bluebird<any>;
	}

	class Serializer {
		constructor();
		init(broker: ServiceBroker): void;
		serialize(obj: GenericObject, type: string): string | Buffer;
		deserialize(str: Buffer | string, type: string): string;
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
		type MessageHandler = ((cmd: string, msg: any) => Bluebird<void>) & ThisType<Base>;
		type AfterConnectHandler = ((wasReconnect?: boolean) => Bluebird<void>) & ThisType<Base>;

		class Base {
			constructor(opts?: GenericObject);

			public init(transit: Transit, messageHandler: MessageHandler, afterConnect: AfterConnectHandler): void;
			public init(transit: Transit, messageHandler: MessageHandler): void;

			public connect(): Bluebird<any>;
			public onConnected(wasReconnect?: boolean): Bluebird<void>;
			public disconnect(): Bluebird<void>;

			public getTopicName(cmd: string, nodeID?: string): string;
			public makeSubscriptions(topics: Array<GenericObject>): Bluebird<void>;
			public subscribe(cmd: string, nodeID: string): Bluebird<void>;
			public subscribeBalancedRequest(action: string): Bluebird<void>;
			public subscribeBalancedEvent(event: string, group: string): Bluebird<void>;
			public unsubscribeFromBalancedCommands(): Bluebird<void>;

			protected incomingMessage(cmd: string, msg: Buffer): Bluebird<void>;

			public publish(packet: Packet): Bluebird<void>;
			public publishBalancedEvent(packet: Packet, group: string): Bluebird<void>;
			public publishBalancedRequest(packet: Packet): Bluebird<void>;
			public prepublish(packet: Packet): Bluebird<void>;

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
		ProtoBuf: Serializer
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
			constructor(action: string, nodeID: string);
			constructor(action: string);
		}
		class ServiceNotAvailableError extends MoleculerRetryableError {
			constructor(action: string, nodeID: string);
			constructor(action: string);
		}

		class RequestTimeoutError extends MoleculerRetryableError {
			constructor(action: string, nodeID: string);
		}
		class RequestSkippedError extends MoleculerError {
			constructor(action: string, nodeID: string);
		}
		class RequestRejectedError extends MoleculerRetryableError {
			constructor(action: string, nodeID: string);
		}

		class QueueIsFullError extends MoleculerRetryableError {
			constructor(action: string, nodeID: string, size: number, limit: number);
		}
		class ValidationError extends MoleculerClientError {
			constructor(message: string, type: string, data: GenericObject);
			constructor(message: string, type: string);
			constructor(message: string);
		}
		class MaxCallLevelError extends MoleculerError {
			constructor(nodeID: string, level: number);
		}

		class ServiceSchemaError extends MoleculerError {
			constructor(message: string);
		}

		class ProtocolVersionMismatchError extends MoleculerError {
			constructor(nodeID: string, actual: string, received: string);
		}
		class InvalidPacketDataError extends MoleculerError {
			constructor(type: string, packet: Packet);
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
		afterConnect(wasReconnect: boolean): Bluebird<void>;
		connect(): Bluebird<void>;
		disconnect(): Bluebird<void>;
		sendDisconnectPacket(): Bluebird<void>;
		makeSubscriptions(): Bluebird<Array<void>>;
		messageHandler(cmd: string, msg: GenericObject): boolean | Bluebird<void> | undefined;
		request(ctx: Context): Bluebird<void>;
		sendBroadcastEvent(nodeID: string, eventName: string, data: GenericObject, nodeGroups: GenericObject): void;
		sendBalancedEvent(eventName: string, data: GenericObject, nodeGroups: GenericObject): void;
		sendEventToGroups(eventName: string, data: GenericObject, groups: Array<string>): void;
		sendEventToGroups(eventName: string, data: GenericObject): void;
		removePendingRequest(id: string): void;
		removePendingRequestByNodeID(nodeID: string): void;
		sendResponse(nodeID: string, id: string, data: GenericObject, err: Error): Bluebird<void>;
		sendResponse(nodeID: string, id: string, data: GenericObject): Bluebird<void>;
		discoverNodes(): Bluebird<void>;
		discoverNode(nodeID: string): Bluebird<void>;
		sendNodeInfo(nodeID: string): Bluebird<void | Array<void>>;
		sendPing(nodeID: string): Bluebird<void>;
		sendPong(payload: GenericObject): Bluebird<void>;
		processPong(payload: GenericObject): void;
		sendHeartbeat(localNode: NodeHealthStatus): Bluebird<void>;
		subscribe(topic: string, nodeID: string): Bluebird<void>;
		publish(packet: Packet): Bluebird<void>;

		pendingRequests: Map<string, TransitRequest>
		nodeID: string;
	}

	const CIRCUIT_CLOSE: string;
	const CIRCUIT_HALF_OPEN: string;
	const CIRCUIT_OPEN: string;
}

export = Moleculer;
