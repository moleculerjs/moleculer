declare class LoggerInstance {
	fatal(...args);
	error(...args);
	warn(...args);
	info(...args);
	debug(...args);
	trace(...args);
}

declare interface Action {
	name: String;
	service: Service;
	cache: Boolean;
	handler: Function;
}

declare class Context {
	constructor(broker: ServiceBroker, action: Action);
	id: String;
	broker: ServiceBroker;
	action: Action;
	nodeID?: String;
	parentID?: String;

	metrics: Boolean;
	level?: Number;

	timeout: Number;
	retryCount: Number;

	params: Object;
	meta: Object;

	requestID?: String;
	duration: Number;

	cachedResult: Boolean;

	generateID();
	setParams(newParams: Object, cloning?: boolean);
	call(actionName: String, params?: Object, opts?: Object): Promise<any>;
	emit(eventName: string, data: any);

	static create(broker: ServiceBroker, action: Action, nodeID?: String, params?: Object, opts: Object): Context;

	static createFromPayload(broker: ServiceBroker, payload: Object);
}

declare class Service {
	constructor(broker: ServiceBroker, schema: Object);

	name: String;
	version?: String|Number;
	settings: Object;
	metadata: Object;
	schema: Object;
	broker: ServiceBroker;
	logger: LoggerInstance;
	actions: Object;
	Promise: typeof Promise;

	waitForServices(serviceNames: String|Array<String>, timeout?: Number, interval?: Number): Promise<any>;

	created: Function;
	started: Function;
	stopped: Function;
}

declare interface BrokerCircuitBreakerOptions {
	enabled?: Boolean;
	maxFailures?: Number;
	halfOpenTime?: Number;
	failureOnTimeout?: Boolean;
	failureOnReject?: Boolean;
}

declare interface BrokerRegistryOptions {
	strategy?: Function;
	preferLocal?: Boolean;
}

declare interface BrokerOptions {
	namespace?: String;
	nodeID?: String;

	logger?: Function|LoggerInstance;
	logLevel?: String;
	logFormatter?: Function|String;

	transporter?: Transporter|String|Object;
	requestTimeout?: Number;
	requestRetry?: Number;
	maxCallLevel?: Number;
	heartbeatInterval?: Number;
	heartbeatTimeout?: Number;

	disableBalancer?: Boolean;

	registry?: BrokerRegistryOptions;

	circuitBreaker?: BrokerCircuitBreakerOptions;

	cacher?: Cacher|String|Object;
	serializer?: Serializer|String|Object;

	validation?: Boolean;
	validator?: Validator;
	metrics?: Boolean;
	metricsRate?: Number;
	statistics?: Boolean;
	internalServices?: Boolean;

	hotReload?: Boolean;

	ServiceFactory?: Service;
	ContextFactory?: Context;
}

declare class ServiceBroker {
	constructor(options?: BrokerOptions);

	Promise: typeof Promise;

	namespace: string;
	nodeID: string;
	logger: LoggerInstance;
	cacher?: Cacher;
	serializer?: Serializer;
	validator?: Validator;

	start(): Promise<any>;
	stop(): Promise<any>;

	repl();

	getLogger(module: String, service?: String, version?: Number|String): LoggerInstance;
	fatal(message: String, err?: Error, needExit?: boolean = true);
	loadServices(folder?: String, fileMask?: String): Number;
	loadService(filePath: String): Service;
	watchService(service: Service);
	hotReloadService(service: Service): Service;
	createService(schema: Object): Service;
	destroyService(service: Service): Promise<any>;

	getLocalService(serviceName: String): Service;
	waitForServices(serviceNames: String|Array<String>, timeout?: Number, interval?: Number, logger?: LoggerInstance): Promise<any>;

	use(...mws: Array<Function>);

	getAction(actionName: String): any;
	findNextActionEndpoint(actionName: String, opts?: Object): any;

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
	call(actionName: String, params?: Object, opts?: Object): Promise<any>;

	/**
	 * Multiple action calls.
	 *
	 * @param {Array<Object>|Object} def Calling definitions.
	 * @returns {Promise<Array<Object>|Object>}
	 *
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
	mcall(def): Promise<any>;

	/**
	 * Emit an event (global & local)
	 *
	 * @param {any} eventName
	 * @param {any} payload
	 * @returns
	 *
	 * @memberOf ServiceBroker
	 */
	emit(eventName: String, payload?: any, groups?: String|Array<String>);

	/**
	 * Emit an event for all local & remote services
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @returns
	 *
	 * @memberOf ServiceBroker
	 */
	broadcast(eventName: String, payload?: any)

	/**
	 * Emit an event for all local services
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {Array<String>?} groups
	 * @param {String?} nodeID
	 * @returns
	 *
	 * @memberOf ServiceBroker
	 */
	broadcastLocal(eventName: String, payload?: any, groups?: String|Array<String>, nodeID?: String);

	sendPing(nodeID?: String);
	getHealthStatus();
	getLocalNodeInfo();

	MOLECULER_VERSION: String;

	static MOLECULER_VERSION: String;
	static defaultOptions: BrokerOptions;
}

declare class Packet {
	constructor(transit: any, type: String, target: String);
	serialize(): String|Buffer;
	static deserialize(transit: any, type: String, msg: String): Packet;
}

declare class Transporter {
	constructor(opts?: Object);
	init(broker: ServiceBroker, messageHandler: (cmd: String, msg: String) => void);
	connect(): Promise<any>;
	disconnect(): Promise<any>;
	subscribe(cmd: String, nodeID?: String);
	publish(packet: Packet): Promise<any>;
}

declare class Cacher {
	constructor(opts?: Object);
	init(broker: ServiceBroker);
	close();
	get(key: String): Promise<any>;
	set(key: String, data: any): Promise<any>;
	del(key: String): Promise<any>;
	clean(match?: String): Promise<any>;
}

declare class Serializer {
	constructor();
	init(broker: ServiceBroker);
	serialize(obj: Object, type: String): String|Buffer;
	deserialize(str: String, type: String): String;
}

declare class Validator {
	constructor();
	init(broker: ServiceBroker);
	compile(schema: Object): Function;
	validate(params: Object, schema: Object): Boolean;
}

declare class LoggerHelper {
	static extend(logger: LoggerInstance): LoggerInstance;
	static createDefaultLogger(baseLogger?: LoggerInstance, bindings: Object, logLevel?: String, logFormatter?: Function): LoggerInstance;
}

declare abstract class BaseStrategy {
	init(broker: ServiceBroker): void;
	select(list: any[]): any;
}

declare class RoundRobinStrategy extends BaseStrategy {
}

declare class RandomStrategy extends BaseStrategy {
}

export = {
	Context: Context,
	Service: Service,
	ServiceBroker: ServiceBroker,
	Logger: LoggerHelper,

	Transporters: {
		Fake: Transporter,
		NATS: Transporter,
		MQTT: Transporter,
		Redis: Transporter,
		AMQP: Transporter
	},
	Cachers: {
		Memory: Cacher,
		Redis: Cacher
	},
	Serializers: {
		JSON: Serializer,
		Avro: Serializer,
		MsgPack: Serializer,
		ProtoBuf: Serializer
	},

	Validator: Validator,

	Errors: {
		MoleculerError: Error,
		MoleculerRetryableError: Error,
		MoleculerServerError: Error,
		MoleculerClientError: Error,

		ServiceNotFoundError: Error,
		ServiceNotAvailable: Error,

		ValidationError: Error,
		RequestTimeoutError: Error,
		RequestSkippedError: Error,
		MaxCallLevelError: Error,

		ServiceSchemaError: Error,
		ProtocolVersionMismatchError: Error
	},

	Strategies: {
		BaseStrategy: BaseStrategy,
		RoundRobinStrategy: RoundRobinStrategy,
		RandomStrategy: RandomStrategy,
	},

	CIRCUIT_CLOSE: String,
	CIRCUIT_HALF_OPEN: String,
	CIRCUIT_OPEN: String
}
