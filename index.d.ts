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
	constructor(opts: Object);
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

declare interface BrokerOptions {
	nodeID?: String;
	
	logger?: Object;
	logLevel?: String|Object;
	
	transporter?: Transporter;
	requestTimeout?: Number;
	requestRetry?: Number;
	heartbeatInterval?: Number;
	heartbeatTimeout?: Number;
	
	cacher?: Cacher;
	serializer?: Serializer;

	validation?: Boolean;
	metrics?: Boolean;
	metricsRate?: Number;
	metricsSendInterval?: Number;
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
	loadServices(folder?: String, fileMask?: String): Number;
	loadService(filePath: String): Service;
	createService(schema: Object): Service;

	on(name: String, handler: Function);
	once(name: String, handler: Function);
	off(name: String, handler: Function);

	hasAction(actionName: String): Boolean;
	getAction(actionName: String): Action;
	isActionAvailable(actionName: String): Boolean;

	use(...mws: Array<Function>);

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

	emit(eventName: String, payload?: any);
	emitLocal(eventName: String, payload?: any);
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
		ServiceNotFoundError: Error,
		RequestTimeoutError: Error,
		ValidationError: Error,
		CustomError: Error		
	}
}
