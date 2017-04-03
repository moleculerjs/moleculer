/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const utils 		= require("./utils");
const { RequestTimeoutError } = require("./errors");

// Prefix for logger
const LOG_PREFIX 		= "TRANSIT";

// Topic names
const TOPIC_EVENT 		= "EVENT";
const TOPIC_REQ 		= "REQ";
const TOPIC_RES 		= "RES";
const TOPIC_DISCOVER 	= "DISCOVER";
const TOPIC_INFO 		= "INFO";
const TOPIC_DISCONNECT 	= "DISCONNECT";
const TOPIC_HEARTBEAT 	= "HEARTBEAT";

/**
 * Transit class
 * 
 * @class Transit
 */
class Transit {

	/**
	 * Creates an instance of Transit.
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

		this.publish([TOPIC_DISCONNECT], {});
		return Promise.resolve();
	}

	/**
	 * Subscribe to topics for transportation
	 * 
	 * @memberOf Transit
	 */
	makeSubscriptions() {

		// Subscribe to broadcast events
		this.subscribe([TOPIC_EVENT]);

		// Subscribe to requests
		this.subscribe([TOPIC_REQ, this.nodeID]);

		// Subscribe to node responses of requests
		this.subscribe([TOPIC_RES, this.nodeID]);

		// Discover handler
		this.subscribe([TOPIC_DISCOVER]);

		// NodeInfo handler
		this.subscribe([TOPIC_INFO, this.nodeID]);

		// Disconnect handler
		this.subscribe([TOPIC_DISCONNECT]);

		// Heart-beat handler
		this.subscribe([TOPIC_HEARTBEAT]);
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
		const event = {
			event: eventName,
			data
		};
		// this.logger.debug("Emit Event", event);
		this.publish([TOPIC_EVENT], event);
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
	messageHandler(topics, msg) {
		const packet = this.deserialize(msg);

		// Check payload
		if (!packet) {
			throw new Error("Missing response payload!");
		}

		if (packet.sender == this.nodeID) 
			return Promise.resolve(); 

		const cmd = topics[0];

		// Request
		if (cmd === TOPIC_REQ) {
			return this._requestHandler(packet);
		}

		// Response
		else if (cmd === TOPIC_RES) {
			return this._responseHandler(packet);
		}

		// Event
		else if (cmd === TOPIC_EVENT) {
			//this.logger.debug("Event received", packet);
			this.broker.emitLocal(packet.event, packet.data);				
			return;
		}

		// Node info
		else if (cmd === TOPIC_INFO || cmd === TOPIC_DISCOVER) {
			this.broker.processNodeInfo(packet.sender, packet);

			if (cmd == "DISCOVER") {
				//this.logger.debug("Discover received from " + packet.sender);
				this.sendNodeInfo(packet.sender);
			}
			return;
		}

		// Disconnect
		else if (cmd === TOPIC_DISCONNECT) {
			this.logger.warn(`Node '${packet.sender}' disconnected`);
			this.broker.nodeDisconnected(packet.sender, packet);
			return;
		}

		// Heartbeat
		else if (cmd === TOPIC_HEARTBEAT) {
			//this.logger.debug("Node heart-beat received from " + packet.sender);
			this.broker.nodeHeartbeat(packet.sender, packet);
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

		const payload = {
			requestID: ctx.id,
			action: ctx.action.name,
			params: ctx.params,
		};

		this.logger.info(`Call '${ctx.action.name}' action on '${ctx.nodeID}' node...`/*, payload*/);

		// Handle request timeout
		if (opts.timeout > 0) {
			// TODO: Globális timer 100ms-ekkel és azt nézi lejárt-e valamelyik.
			// a req-be egy expiration prop amibe az az érték van, ami azt jelenti lejárt.
			
			request.timer = setTimeout(() => {
				// Remove from pending requests
				this.pendingRequests.delete(ctx.id);

				this.logger.warn(`Request timed out when call '${ctx.action.name}' action on '${ctx.nodeID}' node! (timeout: ${opts.timeout / 1000} sec)`/*, payload*/);
				
				reject(new RequestTimeoutError(payload, ctx.nodeID));
			}, opts.timeout);
			
			request.timer.unref();
		}

		// Add to pendings
		this.pendingRequests.set(ctx.id, request);

		//return resolve(ctx.params);
		
		// Publish request
		this.publish([TOPIC_REQ, ctx.nodeID], payload);		
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
		const payload = {
			requestID,
			success: err == null,
			data
		};
		if (err) {
			payload.error = {
				name: err.name,
				message: err.message,
				code: err.code,
				data: err.data				
			};
		}

		this.logger.debug(`Send response back to '${nodeID}'`);

		// Publish the response
		return this.publish([TOPIC_RES, nodeID], payload);
	}	

	/**
	 * Discover other nodes. It will be called after success connect.
	 * 
	 * @memberOf Transit
	 */
	discoverNodes() {
		const actionList = this.broker.getLocalActionList();
		const payload = {
			actions: actionList
		};
		return this.publish([TOPIC_DISCOVER], payload);
	}

	/**
	 * Send node info package to other nodes. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendNodeInfo(nodeID) {
		const actionList = this.broker.getLocalActionList();
		const payload = {
			actions: actionList
		};
		return this.publish([TOPIC_INFO, nodeID], payload);
	}

	/**
	 * Send a node heart-beat. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendHeartbeat() {
		this.publish([TOPIC_HEARTBEAT], {});
	}

	/**
	 * Subscribe via transporter
	 * 
	 * @param {Array} topic 
	 * 
	 * @memberOf NatsTransporter
	 */
	subscribe(topic) {
		return this.tx.subscribe(topic);
	}

	/**
	 * Publish via transporter
	 * 
	 * @param {Array} topic 
	 * @param {Object} payload
	 * 
	 * @memberOf NatsTransporter
	 */
	publish(topic, payload) {
		payload.sender = this.nodeID;
		return this.tx.publish(topic, this.serialize(payload));
	}

	/**
	 * Serialize the payload object
	 * 
	 * @param {any} payload 
	 * @returns {String}
	 * 
	 * @memberOf Transit
	 */
	serialize(payload) {
		return this.broker.serializer.serialize(payload);
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
	deserialize(str) {
		if (str == null) return null;
		
		return this.broker.serializer.deserialize(str);
		//return str;
	}
}

module.exports = Transit;