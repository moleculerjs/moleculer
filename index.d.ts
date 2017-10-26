declare namespace Moleculer {
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

	type ActionHandler = (ctx: Context) => Promise<any>;
	type ActionParamTypes = "number" | "string" | "object";
	type ActionParams = {[key: string]: ActionParamTypes};

	interface Action {
		name: string;
		params?: ActionParams;
		service?: Service;
		cache?: boolean;
		handler: ActionHandler;
	}

	type Actions = { [key: string]: Action; } | { [key: string]: ActionHandler; }

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

		params: object;
		meta: object;

		requestID?: string;
		callerNodeID?: string;
		duration: number;

		cachedResult: boolean;

		generateID(): string;
		setParams(newParams: object, cloning?: boolean): void;
		call(actionName: string, params?: object, opts?: object): Promise<any>;
		emit(eventName: string, data: any): void;

		static create(broker: ServiceBroker, action: Action, nodeID: string, params: object, opts: object): Context;
		static create(broker: ServiceBroker, action: Action, nodeID: string, opts: object): Context;
		static create(broker: ServiceBroker, action: Action, opts: object): Context;

		static createFromPayload(broker: ServiceBroker, payload: object): Context;
	}

	interface ServiceSettingSchema {
		$noVersionPrefix?: boolean;
		$noServiceNamePrefix?: boolean;
		[name: string]: any;
	}

	type ServiceEventHandler = (payload: any, sender: any, eventName: string) => void;
	type ServiceLocalEventHandler = (node: object) => void;
	type ServiceEvents = { [key: string]: ServiceEventHandler | ServiceLocalEventHandler };

	interface RouteSchema {
		path?: string;
		mappingPolicy?: string;
		whitelist?: string[];
		bodyParsers?: any;
		aliases?: { [alias: string]: string };
	}

	interface ServiceSchema {
		name: string;
		version?: string | number;
		settings?: ServiceSettingSchema;
		metadata?: object;
		actions?: Actions;
		mixins?: Array<ServiceSchema>;
		methods?: {[key: string]: Function};

		events?: ServiceEvents;
		created?: () => void;
		started?: () => Promise<void>;
		stopped?: () => Promise<void>;
		[name: string]: any;
	}

	class Service implements ServiceSchema {
		constructor(broker: ServiceBroker, schema: ServiceSchema);

		name: string;
		version?: string | number;
		settings: ServiceSettingSchema;
		metadata: object;
		dependencies: string | object | Array<string> | Array<object>;
		schema: ServiceSchema;
		broker: ServiceBroker;
		logger: LoggerInstance;
		actions?: Actions;
		mixins?: Array<ServiceSchema>;
		methods?: {[key: string]: Function};
		Promise: Promise<any>;

		waitForServices(serviceNames: string | Array<string>, timeout?: number, interval?: number): Promise<void>;

		events?: ServiceEvents;
		created: () => void;
		started: () => Promise<void>;
		stopped: () => Promise<void>;
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

		transporter?: Transporter | string | object;
		requestTimeout?: number;
		requestRetry?: number;
		maxCallLevel?: number;
		heartbeatInterval?: number;
		heartbeatTimeout?: number;

		disableBalancer?: boolean;

		transit?: BrokerTransitOptions;

		registry?: BrokerRegistryOptions;

		circuitBreaker?: BrokerCircuitBreakerOptions;

		cacher?: Cacher | string | object;
		serializer?: Serializer | string | object;

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

	class ServiceBroker {
		constructor(options?: BrokerOptions);

		Promise: Promise<any>;

		namespace: string;
		nodeID: string;
		logger: LoggerInstance;
		cacher?: Cacher;
		serializer?: Serializer;
		validator?: Validator;
		transit: object;

		start(): Promise<void>;
		stop(): Promise<void>;

		repl(): void;

		getLogger(module: string, service?: string, version?: number | string): LoggerInstance;
		fatal(message: string, err?: Error, needExit?: boolean): void;
		loadServices(folder?: string, fileMask?: string): number;
		loadService(filePath: string): Service;
		watchService(service: Service): void;
		hotReloadService(service: Service): Service;
		createService(schema: ServiceSchema): Service;
		destroyService(service: Service): Promise<void>;

		getLocalService(serviceName: string): Service;
		waitForServices(serviceNames: string | Array<string>, timeout?: number, interval?: number, logger?: LoggerInstance): Promise<void>;

		use(...mws: Array<Function>): void;

		getAction(actionName: string): Action;
		findNextActionEndpoint(actionName: string, opts?: object): string;

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
		call(actionName: string, params?: object, opts?: object): Promise<any>;

		/**
		 * Multiple action calls.
		 *
		 * @param {Array<object>|object} def Calling definitions.
		 * @returns {Promise<Array<object>|object>}
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
		mcall(def: Array<object> | object): Promise<Array<any> | any>;

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

		sendPing(nodeID?: string): Promise<void>;
		getHealthStatus(): {
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
				stat: object;
			} | null,
			time: {
				now: number;
				iso: string;
				utc: string;
			};
		};
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

	class Transporter {
		constructor(opts?: object);
		init(broker: ServiceBroker, messageHandler: (cmd: string, msg: string) => void): void;
		connect(): Promise<any>;
		disconnect(): Promise<any>;
		subscribe(cmd: string, nodeID?: string): Promise<void>;
		publish(packet: Packet): Promise<void>;
	}

	class Cacher {
		constructor(opts?: object);
		init(broker: ServiceBroker): void;
		close(): Promise<any>;
		get(key: string): Promise<null | object>;
		set(key: string, data: any): Promise<any>;
		del(key: string): Promise<any>;
		clean(match?: string): Promise<any>;
	}

	class Serializer {
		constructor();
		init(broker: ServiceBroker): void;
		serialize(obj: object, type: string): string | Buffer;
		deserialize(str: string, type: string): string;
	}

	class Validator {
		constructor();
		init(broker: ServiceBroker): void;
		compile(schema: object): Function;
		validate(params: object, schema: object): boolean;
	}

	class LoggerHelper {
		static extend(logger: LoggerInstance): LoggerInstance;
		static createDefaultLogger(baseLogger: LoggerInstance, bindings: object, logLevel?: string, logFormatter?: Function): LoggerInstance;
		static createDefaultLogger(bindings: object, logLevel?: string, logFormatter?: Function): LoggerInstance;
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
		class Fake extends Transporter { }
		class NATS extends Transporter { }
		class MQTT extends Transporter { }
		class Redis extends Transporter { }
		class AMQP extends Transporter { }
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
		class MoleculerError extends Error { }
		class MoleculerRetryableError extends MoleculerError { }
		class MoleculerServerError extends MoleculerError { }
		class MoleculerClientError extends MoleculerError { }

		class ServiceNotFoundError extends MoleculerError { }
		class ServiceNotAvailable extends MoleculerError { }

		class ValidationError extends MoleculerError { }
		class RequestTimeoutError extends MoleculerError { }
		class RequestSkippedError extends MoleculerError { }
		class RequestRejected extends MoleculerError { }
		class QueueIsFull extends MoleculerError { }
		class MaxCallLevelError extends MoleculerError { }

		class ServiceSchemaError extends MoleculerError { }

		class ProtocolVersionMismatchError extends MoleculerError { }
		class InvalidPacketData extends MoleculerError { }
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

	const CIRCUIT_CLOSE: string;
	const CIRCUIT_HALF_OPEN: string;
	const CIRCUIT_OPEN: string;
}

export = Moleculer;
