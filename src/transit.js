/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise					= require("bluebird");
const { RequestTimeoutError } 	= require("./errors");
const P 						= require("./packets");

// Prefix for logger
const LOG_PREFIX 				= "TRANSIT";

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
	 * @param {any} opts
	 * 
	 * @memberOf Transit
	 */
	constructor(broker, transporter, opts) {
		this.broker = broker;
		this.logger = broker.getLogger(LOG_PREFIX);
		this.nodeID = broker.nodeID;		
		this.tx = transporter;
		this.opts = opts;

		this.pendingRequests = new Map();

		this.tx.init(broker, this.messageHandler.bind(this));
	}

	/**
	 * Connect with transporter
	 * 
	 * @memberOf Transit
	 */
	connect() {
		return this.tx.connect()
			.then(() => this.makeSubscriptions())
			.then(() => this.discoverNodes());
	}

	/**
	 * Disconnect with transporter
	 * 
	 * @memberOf Transit
	 */
	disconnect() {
		if (this.tx.connected) {
			return this.sendDisconnectPacket()
				.then(() => this.tx.disconnect());
		}
	}

	/**
	 * Send DISCONNECT to remote nodes
	 * 
	 * @returns {Promise}
	 * 
	 * @memberOf Transit
	 */
	sendDisconnectPacket() {
		this.logger.debug("Send DISCONNECT to nodes");

		this.publish(new P.PacketDisconnect(this));
		return Promise.resolve();
	}

	/**
	 * Subscribe to topics for transportation
	 * 
	 * @memberOf Transit
	 */
	makeSubscriptions() {

		// Subscribe to broadcast events
		this.subscribe(P.PACKET_EVENT);

		// Subscribe to requests
		this.subscribe(P.PACKET_REQUEST, this.nodeID);

		// Subscribe to node responses of requests
		this.subscribe(P.PACKET_RESPONSE, this.nodeID);

		// Discover handler
		this.subscribe(P.PACKET_DISCOVER);

		// NodeInfo handler
		this.subscribe(P.PACKET_INFO, this.nodeID);

		// Disconnect handler
		this.subscribe(P.PACKET_DISCONNECT);

		// Heart-beat handler
		this.subscribe(P.PACKET_HEARTBEAT);
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

		const packet = P.Packet.deserialize(this, cmd, msg);
		const payload = packet.payload;

		// Check payload
		if (!payload) {
			throw new Error("Missing response payload!");
		}

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
			this.broker.emitLocal(payload.event, payload.data);				
			return;
		}

		// Node info
		else if (cmd === P.PACKET_INFO || cmd === P.PACKET_DISCOVER) {
			this.broker.processNodeInfo(payload.sender, payload);

			if (cmd == "DISCOVER") {
				//this.logger.debug("Discover received from " + payload.sender);
				this.sendNodeInfo(payload.sender);
			}
			return;
		}

		// Disconnect
		else if (cmd === P.PACKET_DISCONNECT) {
			this.logger.warn(`Node '${payload.sender}' disconnected`);
			this.broker.nodeDisconnected(payload.sender, payload);
			return;
		}

		// Heartbeat
		else if (cmd === P.PACKET_HEARTBEAT) {
			//this.logger.debug("Node heart-beat received from " + payload.sender);
			this.broker.nodeHeartbeat(payload.sender, payload);
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
	_requestHandler({ sender, action, requestID, params }) {
		this.logger.info(`Request '${action}' from '${sender}'. Params:`, params);
		return this.broker.call(action, params, {}) // empty {} opts to avoid deoptimizing
			.then(res => this.sendResponse(sender, requestID,  res, null))
			.catch(err => this.sendResponse(sender, requestID, null, err));
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
		const requestID = packet.requestID;
		const req = this.pendingRequests.get(requestID);

		// If not exists (timed out), we skip to process the response
		if (req == null) return Promise.resolve();

		// Remove pending request
		this.pendingRequests.delete(requestID);

		// Stop timeout timer
		if (req.timer) {
			// istanbul ignore next
			clearTimeout(req.timer);
		}

		if (!packet.success) {
			// Recreate exception object
			let err = new Error(packet.error.message + ` (NodeID: ${packet.sender})`);
			err.name = packet.error.name;
			err.code = packet.error.code;
			err.nodeID = packet.sender;
			err.data = packet.error.data;

			return req.reject(err);
		}

		return req.resolve(packet.data);
	}	

	/**
	 * Send a request to a remote service. It returns a Promise
	 * what will be resolved when the response received.
	 * 
	 * @param {Context} ctx			Context of request
	 * @param {any} opts			Options of request
	 * @returns	{Promise}
	 * 
	 * @memberOf Transit
	 */
	request(ctx, opts = {}) {
		// Expanded the code that v8 can optimize it.  (TryCatchStatement disable optimizing)
		return new Promise((resolve, reject) => this._doRequest(ctx, opts, resolve, reject));
	}

	/**
	 * Do a remote request
	 * 
	 * @param {Context} ctx 		Context of request
	 * @param {any} opts 			Options of request
	 * @param {Function} resolve 	Resolve of Promise
	 * @param {Function} reject 	Reject of Promise
	 * 
	 * @memberOf Transit
	 */
	_doRequest(ctx, opts, resolve, reject) {
		const request = {
			nodeID: ctx.nodeID,
			//ctx,
			//opts,
			resolve,
			reject,
			timer: null
		};

		const packet = new P.PacketRequest(this, ctx.nodeID, ctx.id, ctx.action.name, ctx.params);

		this.logger.info(`Call '${ctx.action.name}' action on '${ctx.nodeID}' node...`/*, payload*/);

		// Handle request timeout
		if (opts.timeout > 0) {
			// TODO: Globális timer 100ms-ekkel és azt nézi lejárt-e valamelyik.
			// a req-be egy expiration prop amibe az az érték van, ami azt jelenti lejárt.
			
			request.timer = setTimeout(() => {
				// Remove from pending requests
				this.pendingRequests.delete(ctx.id);

				this.logger.warn(`Request timed out when call '${ctx.action.name}' action on '${ctx.nodeID}' node! (timeout: ${opts.timeout / 1000} sec)`/*, payload*/);
				
				reject(new RequestTimeoutError(packet.payload, ctx.nodeID));
			}, opts.timeout);
			
			request.timer.unref();
		}

		// Add to pendings
		this.pendingRequests.set(ctx.id, request);

		//return resolve(ctx.params);
		
		// Publish request
		this.publish(packet);		
	}

	/**
	 * Send back the response of request
	 * 
	 * @param {String} nodeID 
	 * @param {String} requestID 
	 * @param {any} data 
	 * @param {Error} err 
	 * 
	 * @memberOf Transit
	 */
	sendResponse(nodeID, requestID, data, err) {
		this.logger.debug(`Send response back to '${nodeID}'`);

		// Publish the response
		return this.publish(new P.PacketResponse(this, nodeID, requestID, data, err));
	}	

	/**
	 * Discover other nodes. It will be called after success connect.
	 * 
	 * @memberOf Transit
	 */
	discoverNodes() {
		const actions = this.broker.getLocalActionList();
		return this.publish(new P.PacketDiscover(this, actions));
	}

	/**
	 * Send node info package to other nodes. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendNodeInfo(nodeID) {
		const actions = this.broker.getLocalActionList();
		return this.publish(new P.PacketInfo(this, nodeID, actions));
	}

	/**
	 * Send a node heart-beat. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendHeartbeat() {
		this.publish(new P.PacketHeartbeat(this));
	}

	/**
	 * Subscribe via transporter
	 * 
	 * @param {String} topic 
	 * @param {String} nodeID
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
		return this.tx.publish(packet);
	}

	/**
	 * Serialize the object
	 * 
	 * @param {Object} obj 
	 * @returns {String}
	 * 
	 * @memberOf Transit
	 */
	serialize(obj, type) {
		return this.broker.serializer.serialize(obj, type);
		//return payload;
	}

	/**
	 * Deserialize the incoming string to object
	 * 
	 * @param {String} str 
	 * @returns {any}
	 * 
	 * @memberOf Transit
	 */
	deserialize(str, type) {
		if (str == null) return null;
		
		return this.broker.serializer.deserialize(str, type);
		//return str;
	}
}

module.exports = Transit;