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

		params: GenericObject;
		meta: GenericObject;

		requestID?: string;
		callerNodeID?: string;
		duration: number;

		cachedResult: boolean;

		generateID(): string;
		setParams(newParams: GenericObject, cloning?: boolean): void;
		call(actionName: string, params?: GenericObject, opts?: GenericObject): Promise<any>;
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
		metadata?: GenericObject;
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
		metadata: GenericObject;
		dependencies: string | GenericObject | Array<string> | Array<GenericObject>;
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

	class ServiceBroker {
		constructor(options?: BrokerOptions);

		Promise: Promise<any>;

		namespace: string;
		nodeID: string;
		logger: LoggerInstance;
		cacher?: Cacher;
		serializer?: Serializer;
		validator?: Validator;
		transit: GenericObject;

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
		call(actionName: string, params?: GenericObject, opts?: GenericObject): Promise<any>;

		/**
		 * Multiple action calls.
		 *
		 * @param {Array<GenericObject>|GenericObject} def Calling definitions.
		 * @returns {Promise<Array<GenericObject>|GenericObject>}
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
		mcall(def: Array<GenericObject> | GenericObject): Promise<Array<any> | any>;

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
				stat: GenericObject;
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
		constructor(opts?: GenericObject);
		init(broker: ServiceBroker, messageHandler: (cmd: string, msg: string) => void): void;
		connect(): Promise<any>;
		disconnect(): Promise<any>;
		subscribe(cmd: string, nodeID?: string): Promise<void>;
		publish(packet: Packet): Promise<void>;
	}

	class Cacher {
		constructor(opts?: GenericObject);
		init(broker: ServiceBroker): void;
		close(): Promise<any>;
		get(key: string): Promise<null | GenericObject>;
		set(key: string, data: any): Promise<any>;
		del(key: string): Promise<any>;
		clean(match?: string): Promise<any>;
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
		type MessageHandler = (cmd: string, msg: any) => Promise<void>;
		type AfterConnectHandler = (wasReconnect: boolean) => Promise<void>;

		class BaseTransporter {
			constructor(opts?: object);
			public init(transit: object, messageHandler: MessageHandler, afterConnect?: AfterConnectHandler): void;
			public connect(): Promise<any>;
			public onConnected(wasReconnect: boolean): Promise<void>;
			public disconnect(): Promise<void>;
			public subscribe(cmd: string, nodeID: string): Promise<void>;
			public subscribe(): Promise<void>;
			public subscribeBalancedRequest(action: string): Promise<void>;
			public subscribeBalancedRequest(): Promise<void>;
			public subscribeBalancedEvent(event: string, group: string): Promise<void>;
			public subscribeBalancedEvent(): Promise<void>;
			public unsubscribeFromBalancedCommands(): Promise<void>;
			public publish(packet: Packet): Promise<void>;
			public publish(): Promise<void>;
			public publishBalancedEvent(packet: Packet, group: string): Promise<void>;
			public publishBalancedEvent(): Promise<void>;
			public publishBalancedRequest(packet: Packet): Promise<void>;
			public publishBalancedRequest(): Promise<void>;
			public getTopicName(cmd: string, nodeID: string): string;
			public prepublish(packet: Packet): Promise<void>;
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
	class Transit {

		/**
		 * Create an instance of Transit.
		 *
		 * @param {ServiceBroker} Broker instance
		 * @param {Transporter} Transporter instance
		 * @param {Object?} opts
		 *
		 * @memberOf Transit
		 */
		constructor(broker: ServiceBroker, transporter: Transporter, opts);

		/**
		 * It will be called after transporter connected or reconnected.
		 *
		 * @param {any} wasReconnect
		 * @returns {Promise}
		 *
		 * @memberof Transit
		 */
		afterConnect(wasReconnect) {
			return Promise.resolve()

				.then(() => {
					if (!wasReconnect)
						return this.makeSubscriptions();
				})

				.then(() => this.discoverNodes())
				.then(() => this.sendNodeInfo())
				.delay(200) // Waiting for incoming INFO packets

				.then(() => {
					this.connected = true;

					this.broker.broadcastLocal("$transporter.connected");

					if (this.__connectResolve) {
						this.__connectResolve();
						this.__connectResolve = null;
					}
				});
		}

		/**
		 * Connect with transporter. If failed, try again after 5 sec.
		 *
		 * @memberOf Transit
		 */
		connect() {
			this.logger.info("Connecting to the transporter...");
			return new Promise(resolve => {
				this.__connectResolve = resolve;

				const doConnect = () => {
					/* istanbul ignore next */
					this.tx.connect().catch(err => {
						if (this.disconnecting) return;

						this.logger.warn("Connection is failed.", err.message);
						this.logger.debug(err);

						setTimeout(() => {
							this.logger.info("Reconnecting...");
							doConnect();
						}, 5 * 1000);
					});
				};

				doConnect();

			});
		}

		/**
		 * Disconnect with transporter
		 *
		 * @memberOf Transit
		 */
		disconnect() {
			this.connected = false;
			this.disconnecting = true;

			this.broker.broadcastLocal("$transporter.disconnected", { graceFul: true });

			if (this.tx.connected) {
				return this.sendDisconnectPacket()
					.then(() => this.tx.disconnect());
			}
			/* istanbul ignore next */
			return Promise.resolve();
		}

		/**
		 * Send DISCONNECT to remote nodes
		 *
		 * @returns {Promise}
		 *
		 * @memberOf Transit
		 */
		sendDisconnectPacket() {
			return this.publish(new P.PacketDisconnect(this));
		}

		/**
		 * Subscribe to topics for transportation
		 *
		 * @memberOf Transit
		 */
		makeSubscriptions() {
			this.subscribing = Promise.all([
				// Subscribe to broadcast events
				this.subscribe(P.PACKET_EVENT, this.nodeID),

				// Subscribe to requests
				this.subscribe(P.PACKET_REQUEST, this.nodeID),

				// Subscribe to node responses of requests
				this.subscribe(P.PACKET_RESPONSE, this.nodeID),

				// Discover handler
				this.subscribe(P.PACKET_DISCOVER),
				this.subscribe(P.PACKET_DISCOVER, this.nodeID),

				// NodeInfo handler
				this.subscribe(P.PACKET_INFO), // Broadcasted INFO. If a new node connected
				this.subscribe(P.PACKET_INFO, this.nodeID), // Response INFO to DISCOVER packet

				// Disconnect handler
				this.subscribe(P.PACKET_DISCONNECT),

				// Heartbeat handler
				this.subscribe(P.PACKET_HEARTBEAT),

				// Ping handler
				this.subscribe(P.PACKET_PING), // Broadcasted
				this.subscribe(P.PACKET_PING, this.nodeID), // Targeted

				// Pong handler
				this.subscribe(P.PACKET_PONG, this.nodeID)

			])
				.then(() => {
					this.subscribing = null;
				});
			return this.subscribing;
		}

		/**
		 * Message handler for incoming packets
		 *
		 * @param {Array} topic
		 * @param {String} msg
		 * @returns {Boolean} If packet is processed return with `true`
		 *
		 * @memberOf Transit
		 */
		messageHandler(cmd, msg) {
			try {

				if (msg == null) {
					throw new E.MoleculerServerError("Missing packet.", 500, "MISSING_PACKET");
				}

				this.stat.packets.received = this.stat.packets.received + 1;

				const packet = P.Packet.deserialize(this, cmd, msg);
				const payload = packet.payload;

				// Check payload
				if (!payload) {
					/* istanbul ignore next */
					throw new E.MoleculerServerError("Missing response payload.", 500, "MISSING_PAYLOAD");
				}

				// Check protocol version
				if (payload.ver != P.PROTOCOL_VERSION) {
					throw new E.ProtocolVersionMismatchError(payload.sender,P.PROTOCOL_VERSION, payload.ver || "1");
				}

				// Skip own packets (if built-in balancer disabled)
				if (payload.sender == this.nodeID && (cmd !== P.PACKET_EVENT && cmd !== P.PACKET_REQUEST && cmd !== P.PACKET_RESPONSE))
					return;


				this.logger.debug(`Incoming ${cmd} packet from '${payload.sender}'`);

				// Request
				if (cmd === P.PACKET_REQUEST) {
					return this._requestHandler(payload);
				}

				// Response
				else if (cmd === P.PACKET_RESPONSE) {
					this._responseHandler(payload);
				}

				// Event
				else if (cmd === P.PACKET_EVENT) {
					this._eventHandler(payload);
				}

				// Discover
				else if (cmd === P.PACKET_DISCOVER) {
					this.sendNodeInfo(payload.sender);
				}

				// Node info
				else if (cmd === P.PACKET_INFO) {
					this.broker.registry.processNodeInfo(payload);
				}

				// Disconnect
				else if (cmd === P.PACKET_DISCONNECT) {
					this.broker.registry.nodeDisconnected(payload);
				}

				// Heartbeat
				else if (cmd === P.PACKET_HEARTBEAT) {
					this.broker.registry.nodeHeartbeat(payload);
				}

				// Ping
				else if (cmd === P.PACKET_PING) {
					this.sendPong(payload);
				}

				// Pong
				else if (cmd === P.PACKET_PONG) {
					this.processPong(payload);
				}

				return true;
			} catch(err) {
				this.logger.error(err, cmd, msg);
			}
			return false;
		}

		/**
		 * Handle incoming event
		 *
		 * @param {any} payload
		 * @memberof Transit
		 */
		_eventHandler(payload) {
			this.logger.debug(`Event '${payload.event}' received from '${payload.sender}' node` + (payload.groups ? ` in '${payload.groups.join(", ")}' group(s)` : "") + ".");

			this.broker.emitLocalServices(payload.event, payload.data, payload.groups, payload.sender);
		}

		/**
		 * Handle incoming request
		 *
		 * @param {Object} payload
		 *
		 * @memberOf Transit
		 */
		_requestHandler(payload) {
			this.logger.debug(`Request '${payload.action}' received from '${payload.sender}' node.`);

			// Recreate caller context
			const ctx = this.broker.ContextFactory.createFromPayload(this.broker, payload);

			return this.broker._handleRemoteRequest(ctx)
				.then(res => this.sendResponse(payload.sender, payload.id,  res, null))
				.catch(err => this.sendResponse(payload.sender, payload.id, null, err));
		}

		/**
		 * Process incoming response of request
		 *
		 * @param {Object} packet
		 *
		 * @memberOf Transit
		 */
		_responseHandler(packet) {
			const id = packet.id;
			const req = this.pendingRequests.get(id);

			// If not exists (timed out), we skip to process the response
			if (req == null) return;

			// Remove pending request
			this.removePendingRequest(id);

			this.logger.debug(`Response '${req.action.name}' received from '${packet.sender}'.`);
			// Update nodeID in context (if it use external balancer)
			req.ctx.nodeID = packet.sender;

			if (!packet.success) {
				// Recreate exception object
				let err = new Error(packet.error.message + ` (NodeID: ${packet.sender})`);
				// TODO create the original error object if it's available
				//   let constructor = errors[packet.error.name]
				//   let error = Object.create(constructor.prototype);
				err.name = packet.error.name;
				err.code = packet.error.code;
				err.type = packet.error.type;
				err.nodeID = packet.error.nodeID || packet.sender;
				err.data = packet.error.data;
				if (packet.error.stack)
					err.stack = packet.error.stack;

				req.reject(err);
			} else {
				req.resolve(packet.data);
			}
		}

		/**
		 * Send a request to a remote service. It returns a Promise
		 * what will be resolved when the response received.
		 *
		 * @param {<Context>} ctx			Context of request
		 * @returns	{Promise}
		 *
		 * @memberOf Transit
		 */
		request(ctx) {
			if (this.opts.maxQueueSize && this.pendingRequests.size > this.opts.maxQueueSize)
				return Promise.reject(new E.QueueIsFull(ctx.action.name, ctx.nodeID, this.pendingRequests.length, this.opts.maxQueueSize));

			// Expanded the code that v8 can optimize it.  (TryCatchStatement disable optimizing)
			return new Promise((resolve, reject) => this._sendRequest(ctx, resolve, reject));
		}

		/**
		 * Send a remote request
		 *
		 * @param {<Context>} ctx 		Context of request
		 * @param {Function} resolve 	Resolve of Promise
		 * @param {Function} reject 	Reject of Promise
		 *
		 * @memberOf Transit
		 */
		_sendRequest(ctx, resolve, reject) {
			const request = {
				action: ctx.action,
				nodeID: ctx.nodeID,
				ctx,
				resolve,
				reject
			};

			const packet = new P.PacketRequest(this, ctx.nodeID, ctx);

			this.logger.debug(`Send '${ctx.action.name}' request to '${ctx.nodeID ? ctx.nodeID : "some"}' node.`);

			// Add to pendings
			this.pendingRequests.set(ctx.id, request);

			//return resolve(ctx.params);

			// Publish request
			this.publish(packet);
		}

		/**
		 * Send an event to a remote node
		 *
		 * @param {String} nodeID
		 * @param {String} eventName
		 * @param {any} data
		 *
		 * @memberOf Transit
		 */
		sendEvent(nodeID, eventName, data) {
			this.logger.debug(`Send '${eventName}' event to '${nodeID}'.`);

			this.publish(new P.PacketEvent(this, nodeID, eventName, data));
		}

		/**
		 * Send a grouped event to remote nodes.
		 * The event is balanced internally.
		 *
		 * @param {String} eventName
		 * @param {any} data
		 * @param {Object} nodeGroups
		 *
		 * @memberOf Transit
		 */
		sendBalancedEvent(eventName, data, nodeGroups) {
			_.forIn(nodeGroups, (groups, nodeID) => {
				this.logger.debug(`Send '${eventName}' event to '${nodeID}' node` + (groups ? ` in '${groups.join(", ")}' group(s)` : "") + ".");

				this.publish(new P.PacketEvent(this, nodeID, eventName, data, groups));
			});
		}

		/**
		 * Send an event to groups.
		 * The transporter should make balancing
		 *
		 * @param {String} eventName
		 * @param {any} data
		 * @param {Object} groups
		 *
		 * @memberOf Transit
		 */
		sendEventToGroups(eventName, data, groups) {
			if (!groups || groups.length == 0)
				groups = this.broker.getEventGroups(eventName);

			if (groups.length == 0)
				return;

			this.logger.debug(`Send '${eventName}' event to '${groups.join(", ")}' group(s).`);
			this.publish(new P.PacketEvent(this, null, eventName, data, groups));
		}

		/**
		 * Remove a pending request
		 *
		 * @param {any} id
		 *
		 * @memberOf Transit
		 */
		removePendingRequest(id) {
			this.pendingRequests.delete(id);
		}

		/**
		 * Remove a pending request
		 *
		 * @param {String} nodeID
		 *
		 * @memberOf Transit
		 */
		removePendingRequestByNodeID(nodeID) {
			this.logger.debug("Remove pending requests");
			this.pendingRequests.forEach((req, id) => {
				if (req.nodeID == nodeID) {
					this.pendingRequests.delete(id);

					// Reject the request
					req.reject(new E.RequestRejected(req.action.name, req.nodeID));
				}
			});
		}

		/**
		 * Send back the response of request
		 *
		 * @param {String} nodeID
		 * @param {String} id
		 * @param {any} data
		 * @param {Error} err
		 *
		 * @memberOf Transit
		 */
		sendResponse(nodeID, id, data, err) {
			// Publish the response
			return this.publish(new P.PacketResponse(this, nodeID, id, data, err));
		}

		/**
		 * Discover other nodes. It will be called after success connect.
		 *
		 * @memberOf Transit
		 */
		discoverNodes() {
			return this.publish(new P.PacketDiscover(this));
		}

		/**
		 * Discover a node. It will be called if we got message from a node
		 * what we don't know.
		 *
		 * @memberOf Transit
		 */
		discoverNode(nodeID) {
			return this.publish(new P.PacketDiscover(this, nodeID));
		}

		/**
		 * Send node info package to other nodes.
		 *
		 * @memberOf Transit
		 */
		sendNodeInfo(nodeID) {
			const info = this.broker.getLocalNodeInfo();

			let p = Promise.resolve();
			if (!nodeID)
				p = this.tx._makeServiceSpecificSubscriptions();

			return p.then(() => this.publish(new P.PacketInfo(this, nodeID, info)));
		}

		/**
		 * Send ping to a node (or all nodes if nodeID is null)
		 *
		 * @param {String?} nodeID
		 * @returns
		 * @memberof Transit
		 */
		sendPing(nodeID) {
			return this.publish(new P.PacketPing(this, nodeID, Date.now()));
		}

		/**
		 * Send back pong response
		 *
		 * @param {Object} payload
		 * @returns
		 * @memberof Transit
		 */
		sendPong(payload) {
			return this.publish(new P.PacketPong(this, payload.sender, payload.time, Date.now()));
		}

		/**
		 * Process incoming PONG packet.
		 * Measure ping time & current time difference.
		 *
		 * @param {Object} payload
		 * @memberof Transit
		 */
		processPong(payload) {
			const now = Date.now();
			const elapsedTime = now - payload.time;
			const timeDiff = Math.round(now - payload.arrived - elapsedTime / 2);

			// this.logger.debug(`PING-PONG from '${payload.sender}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms`);

			this.broker.broadcastLocal("$node.pong", { nodeID: payload.sender, elapsedTime, timeDiff }, payload.sender);
		}

		/**
		 * Send a node heart-beat. It will be called with timer
		 *
		 * @memberOf Transit
		 */
		sendHeartbeat(localNode) {
			return this.publish(new P.PacketHeartbeat(this, localNode.cpu));
		}

		/**
		 * Subscribe via transporter
		 *
		 * @param {String} topic
		 * @param {String=} nodeID
		 *
		 * @memberOf Transit
		 */
		subscribe(topic, nodeID) {
			return this.tx.subscribe(topic, nodeID);
		}

		/**
		 * Publish via transporter
		 *
		 * @param {Packet} Packet
		 *
		 * @memberOf Transit
		 */
		publish(packet) {
			this.logger.debug(`Send ${packet.type} packet to '${packet.target || "all nodes"}'`);

			if (this.subscribing) {
				return this.subscribing
					.then(() => {
						this.stat.packets.sent = this.stat.packets.sent + 1;
						return this.tx.prepublish(packet);
					});
			}
			this.stat.packets.sent = this.stat.packets.sent + 1;
			return this.tx.prepublish(packet);
		}

		/**
		 * Serialize the object
		 *
		 * @param {Object} obj
		 * @returns {Buffer}
		 *
		 * @memberOf Transit
		 */
		serialize(obj, type) {
			return this.broker.serializer.serialize(obj, type);
		}

		/**
		 * Deserialize the incoming Buffer to object
		 *
		 * @param {Buffer} buf
		 * @returns {any}
		 *
		 * @memberOf Transit
		 */
		deserialize(buf, type) {
			if (buf == null) return null;

			return this.broker.serializer.deserialize(buf, type);
		}

	}

	const CIRCUIT_CLOSE: string;
	const CIRCUIT_HALF_OPEN: string;
	const CIRCUIT_OPEN: string;
}

export = Moleculer;
