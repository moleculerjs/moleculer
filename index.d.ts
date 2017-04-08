declare namespace Moleculer {

	export class Logger {
		fatal(...args);
		error(...args);
		warn(...args);
		info(...args);
		debug(...args);
		trace(...args);
	}

	export interface Action {
		name: String;
		handler: Function;
		version?: String|Number;
		service: Service;
		cache: Boolean;
	}

	export class Context {
		constructor(opts: Object);
		id: String;
		broker: ServiceBroker;
		action: Action;
		nodeID?: String;
		parent?: Context;
		metrics: Boolean;
		level?: Number;
		requestID?: String;		

		call(actionName: String, params?: Object, opts?: Object): Promise;
		emit(eventName: string, data: any);
	}

	export class Service {
		constructor(broker: ServiceBroker, schema: Object);

		name: String;
		version?: String|Number;
		settings: Object;
		schema: Object;
		broker: ServiceBroker;
		logger: Logger;

	}

	export class ServiceBroker {
		constructor(options?: Object);
		Promise: Promise;
		nodeID?: string;
		logger: Logger;
		cacher?: Cacher;

		start(): Promise;
		stop();
		loadServices(folder?: String, fileMask?: String): Number;
		loadService(filePath: String): Service;
		createService(schema: String): Service;
		on(name: String, handler: Function);
		once(name: String, handler: Function);
		off(name: String, handler: Function);

		hasAction(actionName: String): Boolean;
		isActionAvailable(actionName: String): Boolean;

		use(mws: [Function]);

		call(actionName: String, params?: Object, opts?: Object): Promise;
		emit(eventName: String, payload?: any);
		emitLocal(eventName: String, payload?: any);
	}

	class Packet {
		constructor(transit: any, type: String, target: String);
		serialize();
		static deserialize(transit: any, type: String, msg: String);
	}

	class Transporter {
		constructor(opts?: Object);
		init(broker: ServiceBroker, messageHandler: (cmd: String, msg: String) => void);
		connect();
		disconnect();
		subscribe(cmd: String, nodeID?: String);
		publish(packet: Packet);
	}

	export interface Transporters {
		Fake: Transporter;
		NATS: Transporter;
		MQTT: Transporter;
		Redis: Transporter;
	}

	class Cacher {
		constructor(opts?: Object);
		init(broker: ServiceBroker);
		close();
		get(key: String);
		set(key: String, data: any);
		del(key: String);
		clean(match?: String);
	}

	export interface Cachers {
		Memory: Cacher;
		Redis: Cacher;
	}

	export class Serializer {
		constructor();
		init(broker: ServiceBroker);
		serialize(obj: Object, type: String): String|Buffer;
		deserialize(str: String, type: String): String;
	}

	export interface Serializers {
		JSON: Serializer;
		Avro: Serializer;
	}

	export interface Errors {
		ServiceNotFoundError: Error;
		RequestTimeoutError: Error;
		ValidationError: Error;
		CustomError: Error;
	}

}


export = Moleculer;