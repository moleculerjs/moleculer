/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise			= require("bluebird");
const P 				= require("./packets");
const { getCpuInfo } 	= require("./health");

const { ProtocolVersionMismatchError } = require("./errors");

/**
 * Transit class
 *
 * @class Transit
 */
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
	constructor(broker, transporter, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("transit");
		this.nodeID = broker.nodeID;
		this.tx = transporter;
		this.opts = opts;

		this.pendingRequests = new Map();

		this.stat = {
			packets: {
				sent: 0,
				received: 0
			}
		};

		this.connected = false;
		this.disconnecting = false;

		if (this.tx)
			this.tx.init(this, this.messageHandler.bind(this), this.afterConnect.bind(this));

		this.__connectResolve = null;
	}

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

			.then(() => {
				this.connected = true;

				this.broker.emitLocal("$transporter.connected");

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

					this.logger.warn("Connection is failed!", err.message);
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

		this.broker.emitLocal("$transporter.disconnected", { graceFul: true });

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
			this.subscribe(P.PACKET_EVENT),

			// Subscribe to requests
			this.subscribe(P.PACKET_REQUEST, this.nodeID),

			// Subscribe to node responses of requests
			this.subscribe(P.PACKET_RESPONSE, this.nodeID),

			// Discover handler
			this.subscribe(P.PACKET_DISCOVER),

			// NodeInfo handler
			this.subscribe(P.PACKET_INFO), // Broadcasted INFO. If a new node connected
			this.subscribe(P.PACKET_INFO, this.nodeID), // Response INFO to DISCOVER packet

			// Disconnect handler
			this.subscribe(P.PACKET_DISCONNECT),

			// Heart-beat handler
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
	 * Emit an event to remote nodes
	 *
	 * @param {any} eventName
	 * @param {any} data
	 *
	 * @memberOf Transit
	 */
	emit(eventName, data) {
		this.publish(new P.PacketEvent(this, eventName, data));
	}

	/**
	 * Message handler for incoming packets
	 *
	 * @param {Array} topic
	 * @param {String} msg
	 * @returns
	 *
	 * @memberOf Transit
	 */
	messageHandler(cmd, msg) {
		if (msg == null) {
			throw new Error("Missing packet!");
		}

		this.stat.packets.received = this.stat.packets.received + 1;

		const packet = P.Packet.deserialize(this, cmd, msg);
		const payload = packet.payload;

		// Check payload
		if (!payload) {
			/* istanbul ignore next */
			throw new Error("Missing response payload!");
		}

		// Check protocol version
		if (payload.ver != P.PROTOCOL_VERSION) {
			let err = new ProtocolVersionMismatchError(payload.sender,P.PROTOCOL_VERSION, payload.ver || "1");
			this.logger.error(err);
			return Promise.reject(err);
		}

		// Skip own packets
		if (payload.sender == this.nodeID)
			return Promise.resolve();

		// Request
		if (cmd === P.PACKET_REQUEST) {
			return this._requestHandler(payload);
		}

		// Response
		else if (cmd === P.PACKET_RESPONSE) {
			return this._responseHandler(payload);
		}

		// Event
		else if (cmd === P.PACKET_EVENT) {
			//this.logger.debug("Event received", payload);
			this.broker.emitLocal(payload.event, payload.data, payload.sender);
			return;
		}

		// Discover
		else if (cmd === P.PACKET_DISCOVER) {
			this.sendNodeInfo(payload.sender);
			return;
		}

		// Node info
		else if (cmd === P.PACKET_INFO) {
			this.broker.registry.nodes.processNodeInfo(payload);
			return;
		}

		// Disconnect
		else if (cmd === P.PACKET_DISCONNECT) {
			this.broker.registry.nodes.disconnected(payload.sender, false);
			return;
		}

		// Heartbeat
		else if (cmd === P.PACKET_HEARTBEAT) {
			this.broker.registry.nodes.heartbeat(payload);
			return;
		}

		// Ping
		else if (cmd === P.PACKET_PING) {
			this.sendPong(payload);
			return;
		}

		// Ping
		else if (cmd === P.PACKET_PONG) {
			this.processPong(payload);
			return;
		}
	}

	/**
	 * Handle incoming request
	 *
	 * @param {Object} packet
	 * @returns {Promise}
	 *
	 * @memberOf Transit
	 */
	_requestHandler(payload) {
		this.logger.debug(`Request '${payload.action}' received from '${payload.sender}' node.`);

		// Recreate caller context
		const ctx = this.broker.ContextFactory.create(this.broker, {
			name: payload.action
		}, this.broker.nodeID, payload.params, {
			meta: payload.meta
		});
		ctx.id = payload.id;
		ctx.parentID = payload.parentID;
		ctx.level = payload.level;
		ctx.metrics = payload.metrics;
		ctx.callerNodeID = payload.sender;

		return this.broker.call(payload.action, payload.params, { ctx: ctx })
			.then(res => this.sendResponse(payload.sender, payload.id,  res, null))
			.catch(err => this.sendResponse(payload.sender, payload.id, null, err));
	}

	/**
	 * Process incoming response of request
	 *
	 * @param {Object} packet
	 * @returns {Promise}
	 *
	 * @memberOf Transit
	 */
	_responseHandler(packet) {
		const id = packet.id;
		const req = this.pendingRequests.get(id);

		// If not exists (timed out), we skip to process the response
		if (req == null) return Promise.resolve();

		// Remove pending request
		this.removePendingRequest(id);

		this.logger.debug(`Response '${req.action.name}' received from '${req.nodeID}'.`);

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

			return req.reject(err);
		}

		return req.resolve(packet.data);
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
		// Expanded the code that v8 can optimize it.  (TryCatchStatement disable optimizing)
		return new Promise((resolve, reject) => this._doRequest(ctx, resolve, reject));
	}

	/**
	 * Do a remote request
	 *
	 * @param {<Context>} ctx 		Context of request
	 * @param {Function} resolve 	Resolve of Promise
	 * @param {Function} reject 	Reject of Promise
	 *
	 * @memberOf Transit
	 */
	_doRequest(ctx, resolve, reject) {
		const request = {
			nodeID: ctx.nodeID,
			action: ctx.action,
			//ctx,
			resolve,
			reject
		};

		const packet = new P.PacketRequest(this, ctx.nodeID, ctx);

		this.logger.debug(`Send '${ctx.action.name}' request to '${ctx.nodeID}' node.`);

		// Add to pendings
		this.pendingRequests.set(ctx.id, request);

		//return resolve(ctx.params);

		// Publish request
		this.publish(packet);
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
		//this.logger.debug(`Send response back to '${nodeID}'`);

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
	 * Send node info package to other nodes.
	 *
	 * @memberOf Transit
	 */
	sendNodeInfo(nodeID) {
		const info = this.broker.registry.getLocalNodeInfo();
		//this.logger.info("---> INFO:", info, info.services); // TODO

		return this.publish(new P.PacketInfo(this, nodeID, info));
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

		this.logger.info(`PING-PONG from '${payload.sender}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms `);

		this.broker.emitLocal("$node.ping", { elapsedTime, timeDiff });
	}

	/**
	 * Send a node heart-beat. It will be called with timer
	 *
	 * @memberOf Transit
	 */
	sendHeartbeat() {
		const cpu = getCpuInfo();
		return this.publish(new P.PacketHeartbeat(this, cpu.utilization));
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
		if (this.subscribing) {
			return this.subscribing
				.then(() => {
					this.stat.packets.sent = this.stat.packets.sent + 1;
					return this.tx.publish(packet);
				});
		}
		this.stat.packets.sent = this.stat.packets.sent + 1;
		return this.tx.publish(packet);
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

module.exports = Transit;
