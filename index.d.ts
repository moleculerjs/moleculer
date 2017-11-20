import * as bluebird from "bluebird";
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

	type ActionHandler = ((ctx: Context) => bluebird.Promise<any>) & ThisType<Service>;
	type ActionParamSchema = { [key: string]: any };
	type ActionParamTypes = "boolean" | "number" | "string" | "object" | "array" | ActionParamSchema;
	type ActionParams = { [key: string]: ActionParamTypes };

	interface Action {
		name: string;
		params?: ActionParams;
		service?: Service;
		cache?: boolean;
		handler: ActionHandler;
	}

	type Actions = { [key: string]: Action | ActionHandler; };

	class Context {
		constructor(broker: ServiceBroker, action: Action);
		id: string;
		broker: ServiceBroker;
		action: Action;
		nodeID?: string;
		parentID?: string;

		metrics: boolean;
		level?: number;

		timeout: number;
		retryCount: number;

		params: GenericObject;
		meta: GenericObject;

		requestID?: string;
		callerNodeID?: string;
		duration: number;

		cachedResult: boolean;

		generateID(): string;
		setParams(newParams: GenericObject, cloning?: boolean): void;
		call(actionName: string, params?: GenericObject, opts?: GenericObject): bluebird.Promise<any>;
		emit(eventName: string, data: any): void;

		static create(broker: ServiceBroker, action: Action, nodeID: string, params: GenericObject, opts: GenericObject): Context;
		static create(broker: ServiceBroker, action: Action, nodeID: string, opts: GenericObject): Context;
		static create(broker: ServiceBroker, action: Action, opts: GenericObject): Context;

		static createFromPayload(broker: ServiceBroker, payload: GenericObject): Context;
	}

	interface ServiceSettingSchema {
		$noVersionPrefix?: boolean;
		$noServiceNamePrefix?: boolean;
		[name: string]: any;
	}

	type ServiceEventHandler = (payload: any, sender: any, eventName: string) => void;
	type ServiceLocalEventHandler = (node: GenericObject) => void;
	type ServiceEvents = { [key: string]: ServiceEventHandler | ServiceLocalEventHandler } & ThisType<Service>;

	type ServiceMethods = { [key: string]: (...args: any[]) => any } & ThisType<Service>;

	interface ServiceSchema {
		name: string;
		version?: string | number;
		settings?: ServiceSettingSchema;
		metadata?: GenericObject;
		actions?: Actions;
		mixins?: Array<ServiceSchema>;
		methods?: ServiceMethods;

		events?: ServiceEvents;
		created?: () => void;
		started?: () => bluebird.Promise<void>;
		stopped?: () => bluebird.Promise<void>;
		[name: string]: any;
	}

	class Service implements ServiceSchema {
		constructor(broker: ServiceBroker, schema: ServiceSchema);

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
		Promise: bluebird.Promise<any>;

		waitForServices(serviceNames: string | Array<string>, timeout?: number, interval?: number): bluebird.Promise<void>;

		events?: ServiceEvents;
		created: () => void;
		started: () => bluebird.Promise<void>;
		stopped: () => bluebird.Promise<void>;
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
		strategy?: Function;
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
		statistics?: boolean;
		internalServices?: boolean;

		hotReload?: boolean;

		ServiceFactory?: Service;
		ContextFactory?: Context;
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
	type FallbackResponseHandler = (ctx: Context, err: Errors.MoleculerError) => bluebird.Promise<any>;

	interface CallOptions {
		timeout?: number;
		retryCount?: number;
		fallbackResponse?: FallbackResponse | Array<FallbackResponse> | FallbackResponseHandler;
		nodeID?: string;
		meta?: GenericObject;
	}

	class ServiceBroker {
		constructor(options?: BrokerOptions);

		Promise: bluebird.Promise<any>;

		namespace: string;
		nodeID: string;
		logger: LoggerInstance;
		cacher?: Cacher;
		serializer?: Serializer;
		validator?: Validator;
		transit: GenericObject;

		start(): bluebird.Promise<void>;
		stop(): bluebird.Promise<void>;

		repl(): void;

		getLogger(module: string, service?: string, version?: number | string): LoggerInstance;
		fatal(message: string, err?: Error, needExit?: boolean): void;
		loadServices(folder?: string, fileMask?: string): number;
		loadService(filePath: string): Service;
		watchService(service: Service): void;
		hotReloadService(service: Service): Service;
		createService(schema: ServiceSchema): Service;
		destroyService(service: Service): bluebird.Promise<void>;

		getLocalService(serviceName: string): Service;
		waitForServices(serviceNames: string | Array<string>, timeout?: number, interval?: number, logger?: LoggerInstance): bluebird.Promise<void>;

		use(...mws: Array<Function>): void;

		getAction(actionName: string): Action;
		findNextActionEndpoint(actionName: string, opts?: GenericObject): string;

		/**
		 * Call an action (local or global)
		 *
		 * @param {any} actionName	name of action
		 * @param {any} params		params of action
		 * @param {any} opts		options of call (optional)
		 * @returns
		 *
		 * @memberOf ServiceBroker
		 */
		call(actionName: string, params?: GenericObject, opts?: CallOptions): bluebird.Promise<any>;

		/**
		 * Multiple action calls.
		 *
		 * @param {Array<GenericObject>|GenericObject} def Calling definitions.
		 * @returns {bluebird.Promise<Array<GenericObject>|GenericObject>}
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
		 * @memberOf ServiceBroker
		 */
		mcall(def: Array<GenericObject> | GenericObject): bluebird.Promise<Array<any> | any>;

		/**
		 * Emit an event (global & local)
		 *
		 * @param {any} eventName
		 * @param {any} payload
		 * @returns
		 *
		 * @memberOf ServiceBroker
		 */
		emit(eventName: string, payload?: any, groups?: string | Array<string>): void;

		/**
		 * Emit an event for all local & remote services
		 *
		 * @param {string} eventName
		 * @param {any} payload
		 * @returns
		 *
		 * @memberOf ServiceBroker
		 */
		broadcast(eventName: string, payload?: any): void

		/**
		 * Emit an event for all local services
		 *
		 * @param {string} eventName
		 * @param {any} payload
		 * @param {Array<string>?} groups
		 * @param {String?} nodeID
		 * @returns
		 *
		 * @memberOf ServiceBroker
		 */
		broadcastLocal(eventName: string, payload?: any, groups?: string | Array<string>, nodeID?: string): void;

		sendPing(nodeID?: string): bluebird.Promise<void>;
		getHealthStatus(): NodeHealthStatus;
		getLocalNodeInfo(): {
			ipList: string[];
			client: any;
			config: any;
			port: any;
			services: Array<any>;
		};

		MOLECULER_VERSION: string;
		[name: string]: any;

		static MOLECULER_VERSION: string;
		static defaultOptions: BrokerOptions;
	}

	class Packet {
		constructor(transit: any, type: string, target: string);
		serialize(): string | Buffer;
		static deserialize(transit: any, type: string, msg: string): Packet;
	}

	namespace Packets {
		type PROTOCOL_VERSION = "2";
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

		interface PacketPayload {
			ver: PROTOCOL_VERSION;
			sender: string | null;
		}

		interface Packet {
			type: PACKET_UNKNOWN;
			transit?: Transit;
			target?: string;
			payload: PacketPayload
		}
		interface PacketEvent extends Packet {
			type: PACKET_EVENT;
			payload: PacketPayload & {
				event: string;
				data: any | null;
				groups: any | null;
			};
		}
		interface PacketDisconnect extends Packet {
			type: PACKET_DISCONNECT;
		}
		interface PacketDiscover extends Packet {
			type: PACKET_DISCOVER;
		}
		interface PacketInfo extends Packet {
			type: PACKET_INFO;
			payload: PacketPayload & {
				services?: any;
				ipList?: Array<string>;
				client?: any;
				port?: any;
				config?: any;
			}
		}
		interface PacketHeartbeat extends Packet {
			type: PACKET_HEARTBEAT;
			payload: PacketPayload & { cpu: number };
		}
		interface PacketRequest extends Packet {
			type: PACKET_REQUEST;
			payload: PacketPayload & {
				id?: string;
				action?: string;
				params?: GenericObject;
				meta?: GenericObject;
				timeout?: number;
				level?: number;
				metrics?: GenericObject;
				parentID?: string;
				requestID?: string;
			};
		}
		interface PacketResponse extends Packet {
			type: PACKET_RESPONSE;
			payload: PacketPayload & {
				id: string;
				success: boolean;
				data?: GenericObject;

				error?: {
					name: string;
					message: string;
					nodeID: string;
					code: number;
					type: string;
					stack: string;
					data: GenericObject;
				};
			};
		}
		interface PacketPing extends Packet {
			type: PACKET_PING;
			payload: PacketPayload & { time: number };
		}
		interface PacketPong extends Packet {
			type: PACKET_PONG;
			payload: PacketPayload & { time: number, arrived: number };
		}
	}

	class Transporter {
		constructor(opts?: GenericObject);
		init(broker: ServiceBroker, messageHandler: (cmd: string, msg: string) => void): void;
		connect(): bluebird.Promise<any>;
		disconnect(): bluebird.Promise<any>;
		subscribe(cmd: string, nodeID?: string): bluebird.Promise<void>;
		publish(packet: Packet): bluebird.Promise<void>;
	}

	class Cacher {
		constructor(opts?: GenericObject);
		init(broker: ServiceBroker): void;
		close(): bluebird.Promise<any>;
		get(key: string): bluebird.Promise<null | GenericObject>;
		set(key: string, data: any): bluebird.Promise<any>;
		del(key: string): bluebird.Promise<any>;
		clean(match?: string): bluebird.Promise<any>;
	}

	class Serializer {
		constructor();
		init(broker: ServiceBroker): void;
		serialize(obj: GenericObject, type: string): string | Buffer;
		deserialize(str: string, type: string): string;
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

	namespace Transporters {
		type MessageHandler = ((cmd: string, msg: any) => bluebird.Promise<void>) & ThisType<BaseTransporter>;
		type AfterConnectHandler = ((wasReconnect: boolean) => bluebird.Promise<void>) & ThisType<BaseTransporter>;

		class BaseTransporter {
			constructor(opts?: GenericObject);

			public init(transit: Transit, messageHandler: MessageHandler, afterConnect: AfterConnectHandler): void;
			public init(transit: Transit, messageHandler: MessageHandler): void;
			public connect(): bluebird.Promise<any>;
			public onConnected(wasReconnect: boolean): bluebird.Promise<void>;
			public disconnect(): bluebird.Promise<void>;
			public subscribe(cmd: string, nodeID: string): bluebird.Promise<void>;
			public subscribeBalancedRequest(action: string): bluebird.Promise<void>;
			public subscribeBalancedEvent(event: string, group: string): bluebird.Promise<void>;
			public unsubscribeFromBalancedCommands(): bluebird.Promise<void>;
			public publish(packet: Packet): bluebird.Promise<void>;
			public publishBalancedEvent(packet: Packet, group: string): bluebird.Promise<void>;
			public publishBalancedRequest(packet: Packet): bluebird.Promise<void>;
			public getTopicName(cmd: string, nodeID: string): string;
			public prepublish(packet: Packet): bluebird.Promise<void>;

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

		class Fake extends BaseTransporter { }
		class NATS extends BaseTransporter { }
		class MQTT extends BaseTransporter { }
		class Redis extends BaseTransporter { }
		class AMQP extends BaseTransporter { }
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
			constructor(message: string, code: number, type: string, data: any);
			constructor(message: string, code: number, type: string);
			constructor(message: string, code: number);
			constructor(message: string);
		}
		class MoleculerRetryableError extends MoleculerError { }
		class MoleculerServerError extends MoleculerRetryableError { }
		class MoleculerClientError extends MoleculerError { }

		class ServiceNotFoundError extends MoleculerError {
			constructor(action: string, nodeID: string);
			constructor(action: string);
		}
		class ServiceNotAvailable extends MoleculerError {
			constructor(action: string, nodeID: string);
			constructor(action: string);
		}

		class RequestTimeoutError extends MoleculerRetryableError {
			constructor(action: string, nodeID: string);
		}
		class RequestSkippedError extends MoleculerError {
			constructor(action: string, nodeID: string);
		}
		class RequestRejected extends MoleculerRetryableError {
			constructor(action: string, nodeID: string);
		}

		class QueueIsFull extends MoleculerRetryableError {
			constructor(action: string, nodeID: string, size: number, limit: number);
		}
		class ValidationError extends MoleculerClientError {
			constructor(message, type, data);
			constructor(message, type);
			constructor(message);
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
		class InvalidPacketData extends MoleculerError {
			constructor(packet: Packet);
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
	}

	interface TransitRequest {
		action: string;
		nodeID: string;
		ctx: Context;
		resolve: (value: any) => void;
		reject: (reason: any) => void;
	}

	interface Transit {
		afterConnect(wasReconnect: boolean): bluebird.Promise<void>;
		connect(): bluebird.Promise<void>;
		disconnect(): bluebird.Promise<void>;
		sendDisconnectPacket(): bluebird.Promise<void>;
		makeSubscriptions(): bluebird.Promise<Array<void>>;
		messageHandler(cmd: string, msg: GenericObject): boolean | bluebird.Promise<void> | undefined;
		request(ctx: Context): bluebird.Promise<void>;
		sendEvent(nodeID: string, eventName: string, data: GenericObject): void;
		sendBalancedEvent(eventName: string, data: GenericObject, nodeGroups: GenericObject): void;
		sendEventToGroups(eventName: string, data: GenericObject, groups: Array<string>): void;
		sendEventToGroups(eventName: string, data: GenericObject): void;
		removePendingRequest(id: string): void;
		removePendingRequestByNodeID(nodeID: string): void;
		sendResponse(nodeID: string, id: string, data: GenericObject, err: Error): bluebird.Promise<void>;
		sendResponse(nodeID: string, id: string, data: GenericObject): bluebird.Promise<void>;
		discoverNodes(): bluebird.Promise<void>;
		discoverNode(nodeID: string): bluebird.Promise<void>;
		sendNodeInfo(nodeID: string): bluebird.Promise<void | Array<void>>;
		sendPing(nodeID: string): bluebird.Promise<void>;
		sendPong(payload: GenericObject): bluebird.Promise<void>;
		processPong(payload: GenericObject): void;
		sendHeartbeat(localNode: NodeHealthStatus): bluebird.Promise<void>;
		subscribe(topic: string, nodeID: string): bluebird.Promise<void>;
		publish(packet: Packet): bluebird.Promise<void>;
		serialize(obj: GenericObject, type: string): Buffer;
		deserialize(buf: Buffer, type: string): any;
		deserialize(buf: Buffer): any;

		pendingRequests: Map<string, TransitRequest>
		nodeID: string;
	}

	const CIRCUIT_CLOSE: string;
	const CIRCUIT_HALF_OPEN: string;
	const CIRCUIT_OPEN: string;
}

export = Moleculer;
