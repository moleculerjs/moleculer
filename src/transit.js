/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const utils 		= require("./utils");
const { RequestTimeoutError } = require("./errors");

// Prefix for logger
const LOG_PREFIX = "TRANSIT";

// Topic names
const TOPIC_EVENT = "EVENT";
const TOPIC_REQ = "REQ";
const TOPIC_RES = "RES";
const TOPIC_DISCOVER = "DISCOVER";
const TOPIC_INFO = "INFO";
const TOPIC_DISCONNECT = "DISCONNECT";
const TOPIC_HEARTBEAT = "HEARTBEAT";

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
		let message = {
			nodeID: this.nodeID
		};
		this.logger.debug("Send DISCONNECT to nodes", message);
		let payload = utils.json2String(message);

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
		this.logger.debug("Emit Event", event);
		let payload = utils.json2String(event);
		this.publish([TOPIC_EVENT], payload);
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
	messageHandler(topic, packet) {
		let msg;
		if (packet)
			msg = utils.string2Json(packet);

		// Check payload
		if (!msg) {
			throw new Error("Missing response payload!");
		}

		if (msg.nodeID == this.nodeID) return Promise.resolve(); 

		switch(topic[0]) {

		// Event
		case TOPIC_EVENT: {
			this.logger.debug("Event received", msg);
			this.broker.emitLocal(msg.event, msg.param);
				
			return;
		}

		// Request
		case TOPIC_REQ: {
			this.logger.debug(`Request from ${msg.nodeID}.`, msg.action, msg.params);

			return this.broker.call(msg.action, msg.params)
				.then(res => this.sendResponse(msg.nodeID, msg.requestID,  res))
				.catch(err => this.sendResponse(msg.nodeID, msg.requestID, null, err));
		}

		// Response
		case TOPIC_RES: {
			let req = this.pendingRequests.get(msg.requestID);

			// If not exists (timed out), we skip to process the response
			if (!req) return Promise.resolve();

			// Remove pending request
			this.pendingRequests.delete(msg.requestID);

			// Stop timeout timer
			if (req.timer) {
				/* istanbul ignore next */
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

		// Node info
		case TOPIC_INFO:
		case TOPIC_DISCOVER: {
			this.logger.debug("Discovery received from " + msg.nodeID);
			this.broker.processNodeInfo(msg.nodeID, msg);

			if (topic[0] == "DISCOVER")
				this.sendNodeInfo(msg.nodeID);

			return;
		}

		// Disconnect
		case TOPIC_DISCONNECT: {
			this.logger.debug(`Node '${msg.nodeID}' disconnected`);
			this.broker.nodeDisconnected(msg.nodeID, msg);

			return;
		}

		// Heartbeat
		case TOPIC_HEARTBEAT: {
			this.logger.debug("Node heart-beat received from " + msg.nodeID);
			this.broker.nodeHeartbeat(msg.nodeID, msg);

			return;
		}
		}
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
		return new Promise((resolve, reject) => {

			let req = {
				nodeID: ctx.nodeID,
				ctx,
				//opts,
				resolve,
				reject,
				timer: null
			};

			let message = {
				nodeID: this.nodeID,
				requestID: ctx.id,
				action: ctx.action.name,
				params: ctx.params
			};
			this.logger.debug(`Send request '${ctx.action.name}' action to '${ctx.nodeID}' node...`, message);
			let payload = utils.json2String(message);

			// Handle request timeout
			if (opts.timeout > 0) {
				req.timer = setTimeout(() => {
					// Remove from pending requests
					this.pendingRequests.delete(ctx.id);

					this.logger.warn(`Request timed out when call '${ctx.action.name}' action on '${ctx.nodeID}' node! (timeout: ${opts.timeout / 1000} sec)`, message);
					
					reject(new RequestTimeoutError(message, ctx.nodeID));
				}, opts.timeout);

				req.timer.unref();
			}

			// Add to pendings
			this.pendingRequests.set(ctx.id, req);

			// Publish request
			this.publish([TOPIC_REQ, ctx.nodeID], payload);
		});
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
		let msg = {
			success: !err,
			nodeID: this.nodeID,
			requestID,
			data
		};
		if (err) {
			msg.error = {
				name: err.name,
				message: err.message,
				code: err.code,
				data: err.data
			};
		}
		let payload = utils.json2String(msg);
		this.logger.debug(`Response to ${nodeID}`, "Length: ", payload.length, "bytes");

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
		let payload = utils.json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});
		return this.publish([TOPIC_DISCOVER], payload);
	}

	/**
	 * Send node info package to other nodes. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendNodeInfo(targetNodeID) {
		let actionList = this.broker.getLocalActionList();
		let payload = utils.json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});
		return this.publish([TOPIC_INFO, targetNodeID], payload);
	}

	/**
	 * Send a node heart-beat. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendHeartbeat() {
		let payload = utils.json2String({
			nodeID: this.broker.nodeID
		});
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
	 * @param {String} packet 
	 * 
	 * @memberOf NatsTransporter
	 */
	publish(topic, packet) {
		return this.tx.publish(topic, packet);
	}
}

module.exports = Transit;