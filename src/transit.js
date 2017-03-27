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
const LOG_PREFIX = "TRANSIT";

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
		let payload = {
			nodeID: this.nodeID
		};
		this.logger.debug("Send DISCONNECT to nodes", payload);

		this.publish([TOPIC_DISCONNECT], payload);
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
	 * @param {any} param
	 * 
	 * @memberOf Transit
	 */
	emit(eventName, param) {
		let event = {
			nodeID: this.nodeID,
			event: eventName,
			param
		};
		// this.logger.debug("Emit Event", event);
		this.publish([TOPIC_EVENT], event);
	}

	/**
	 * Message handler for incoming packets
	 * 
	 * @param {Array} topic 
	 * @param {String} packet 
	 * @returns 
	 * 
	 * @memberOf Transit
	 */
	messageHandler(topics, packet) {
		const msg = this.deserialize(packet);

		// Check payload
		if (!msg) {
			throw new Error("Missing response payload!");
		}

		if (msg.nodeID == this.nodeID) return Promise.resolve(); 

		const cmd = topics[0];

		// Event
		if (cmd === TOPIC_EVENT) {
			this.logger.debug("Event received", msg);
			this.broker.emitLocal(msg.event, msg.param);				
			return;
		}

		// Request
		else if (cmd === TOPIC_REQ) {
			return this._requestHandler(msg);
		}

		// Response
		else if (cmd === TOPIC_RES) {
			return this._responseHandler(msg);
		}

		// Node info
		else if (cmd === TOPIC_INFO || cmd === TOPIC_DISCOVER) {
			this.broker.processNodeInfo(msg.nodeID, msg);

			if (cmd == "DISCOVER") {
				//this.logger.debug("Discover received from " + msg.nodeID);
				this.sendNodeInfo(msg.nodeID);
			}
			return;
		}

		// Disconnect
		else if (cmd === TOPIC_DISCONNECT) {
			this.logger.warn(`Node '${msg.nodeID}' disconnected`);
			this.broker.nodeDisconnected(msg.nodeID, msg);
			return;
		}

		// Heartbeat
		else if (cmd === TOPIC_HEARTBEAT) {
			//this.logger.debug("Node heart-beat received from " + msg.nodeID);
			this.broker.nodeHeartbeat(msg.nodeID, msg);
			return;
		}
	}

	/**
	 * Handle incoming request
	 * 
	 * @param {Object} msg 
	 * @returns {Promise}
	 * 
	 * @memberOf Transit
	 */
	_requestHandler(msg) {
		this.logger.info(`Request '${msg.action}' from '${msg.nodeID}'. Params:`, msg.params);
		return this.broker.call(msg.action, msg.params, {}) // empty {} opts to avoid deoptimizing
			.then(res => this.sendResponse(msg.nodeID, msg.requestID,  res, null))
			.catch(err => this.sendResponse(msg.nodeID, msg.requestID, null, err));
	}

	/**
	 * Process incoming response of request
	 * 
	 * @param {Object} msg 
	 * @returns {Promise}
	 * 
	 * @memberOf Transit
	 */
	_responseHandler(msg) {
		const requestID = msg.requestID;
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

		if (!msg.success) {
			// Recreate exception object
			let err = new Error(msg.error.message + ` (NodeID: ${msg.nodeID})`);
			err.name = msg.error.name;
			err.code = msg.error.code;
			err.nodeID = msg.nodeID;
			err.data = msg.error.data;

			return req.reject(err);
		}

		return req.resolve(msg.data);
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
		const req = {
			nodeID: ctx.nodeID,
			ctx,
			//opts,
			resolve,
			reject,
			timer: null
		};

		const payload = {
			nodeID: this.nodeID,
			requestID: ctx.id,
			action: ctx.action.name,
			params: ctx.params,
		};

		this.logger.info(`Call '${ctx.action.name}' action on '${ctx.nodeID}' node...`/*, payload*/);

		// Handle request timeout
		if (opts.timeout > 0) {
			// TODO: Globális timer 100ms-ekkel és azt nézi lejárt-e valamelyik.
			// a req-be egy expiration prop amibe az az érték van, ami azt jelenti lejárt.
			
			req.timer = setTimeout(() => {
				// Remove from pending requests
				this.pendingRequests.delete(ctx.id);

				this.logger.warn(`Request timed out when call '${ctx.action.name}' action on '${ctx.nodeID}' node! (timeout: ${opts.timeout / 1000} sec)`, payload);
				
				reject(new RequestTimeoutError(payload, ctx.nodeID));
			}, opts.timeout);
			
			req.timer.unref();
		}

		// Add to pendings
		this.pendingRequests.set(ctx.id, req);

		// return resolve(ctx.params);
		
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
			nodeID: this.nodeID,
			requestID: requestID,
			success: err == null,
			data: data
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
		let actionList = this.broker.getLocalActionList();
		let payload = {
			nodeID: this.broker.nodeID,
			actions: actionList
		};
		return this.publish([TOPIC_DISCOVER], payload);
	}

	/**
	 * Send node info package to other nodes. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendNodeInfo(targetNodeID) {
		let actionList = this.broker.getLocalActionList();
		let payload = {
			nodeID: this.broker.nodeID,
			actions: actionList
		};
		return this.publish([TOPIC_INFO, targetNodeID], payload);
	}

	/**
	 * Send a node heart-beat. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendHeartbeat() {
		let payload = {
			nodeID: this.broker.nodeID
		};
		this.publish([TOPIC_HEARTBEAT], payload);
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
		return utils.json2String(payload);
	}

	/**
	 * Deserialize the incoming string to object
	 * 
	 * @param {String} message 
	 * @returns {any}
	 * 
	 * @memberOf Transit
	 */
	deserialize(message) {
		return utils.string2Json(message);
	}
}

module.exports = Transit;