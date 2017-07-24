declare class Logger {
	fatal(...args);
	error(...args);
	warn(...args);
	info(...args);
	debug(...args);
	trace(...args);
}

declare interface Action {
	name: String;
	handler: Function;
	version?: String|Number;
	service: Service;
	cache: Boolean;
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
}

declare class Service {
	constructor(broker: ServiceBroker, schema: Object);

	name: String;
	version?: String|Number;
	settings: Object;
	schema: Object;
	broker: ServiceBroker;
	logger: Logger;

}

declare interface BrokerCircuitBreakerOptions {
	enabled?: Boolean;
	maxFailures?: Number;
	halfOpenTime?: Number;
	failureOnTimeout?: Boolean;
	failureOnReject?: Boolean;
}

declare interface BrokerOptions {
	nodeID?: String;
	
	logger?: Object;
	logLevel?: String|Object;
	
	transporter?: Transporter;
	requestTimeout?: Number;
	requestRetry?: Number;
	heartbeatInterval?: Number;
	heartbeatTimeout?: Number;
	maxCallLevel?: Number;

	circuitBreaker?: BrokerCircuitBreakerOptions;
	
	cacher?: Cacher;
	serializer?: Serializer;

	validation?: Boolean;
	metrics?: Boolean;
	metricsRate?: Number;
	statistics?: Boolean;
	internalActions?: Boolean;

	ServiceFactory?: Service;
	ContextFactory?: Context;
}

declare class ServiceBroker {
	constructor(options?: BrokerOptions);
	Promise: typeof Promise;
	nodeID?: string;
	logger: Logger;
	cacher?: Cacher;

	start(): Promise<any>;
	stop();

	repl();

	getLogger(name?: String): Logger;
	loadServices(folder?: String, fileMask?: String): Number;
	loadService(filePath: String): Service;
	createService(schema: Object): Service;
	registerLocalService(service: Service);
	registerRemoteService(nodeID: String, service: Service);

	registerAction(nodeID?: String, action: Action);
	unregisterServicesByNode(nodeID?: String);
	unregisterAction(nodeID?: String, action: Action);

	on(name: String, handler: Function);
	once(name: String, handler: Function);
	off(name: String, handler: Function);

	getService(serviceName: String): Service;
	hasAction(actionName: String): Boolean;
	getAction(actionName: String): any;
	isActionAvailable(actionName: String): Boolean;

	use(...mws: Array<Function>);

	/**
	 * Create a new Context instance
	 * 
	 * @param {Object} action 
	 * @param {String?} nodeID 
	 * @param {Object?} params 
	 * @param {Object} opts 
	 * @returns {Context}
	 * 
	 * @memberof ServiceBroker
	 */
	createNewContext(action: Action, nodeID?: String, params?: Object, opts: Object): Context;

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
	 * Emit an event (global & local)
	 * 
	 * @param {any} eventName
	 * @param {any} payload
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	emit(eventName: String, payload?: any);

	/**
	 * Emit an event only local
	 * 
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {string} nodeID of server
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */	
	emitLocal(eventName: String, payload?: any, sender?: String);

	static MOLECULER_VERSION: String;
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
	publish(packet: Packet);
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

export = {
	Context: Context,
	Service: Service,
	ServiceBroker: ServiceBroker,

	Transporters: {
		Fake: Transporter,
		NATS: Transporter,
		MQTT: Transporter,
		Redis: Transporter
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
		ServiceNotFoundError: Error,
		ValidationError: Error,
		RequestTimeoutError: Error,
		RequestSkippedError: Error,
		MaxCallLevelError: Error
	},

	STRATEGY_ROUND_ROBIN: Number,
	STRATEGY_RANDOM: Number,

	CIRCUIT_CLOSE: String, 
	CIRCUIT_HALF_OPEN: String, 
	CIRCUIT_OPEN: String	
}
