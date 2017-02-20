/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const utils 		= require("../utils");
const { RequestTimeoutError } = require("../errors");

class Transit {

	/**
	 * Creates an instance of Transit.
	 * 
	 * @param {any} opts
	 * 
	 * @memberOf Transit
	 */
	constructor(broker, transporter, opts) {
		this.broker = broker;
		this.nodeID = broker.nodeID;		
		this.tx = transporter;
		this.opts = opts;

		this.pendingRequests = new Map();
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
	 * Reconnect to server after x seconds
	 * 
	 * @memberOf BaseTransporter
	 */
	reconnectAfterTime() {
		//this.logger.info("Reconnecting after 5 sec...");
		setTimeout(() => {
			this.connect();
		}, 5 * 1000);
	}	

	sendDisconnectPacket() {
		let message = {
			nodeID: this.nodeID
		};
		this.logger.debug("Send DISCONNECT to nodes", message);
		let payload = utils.json2String(message);

		return Promise(resolve => {
			this.tx.publish(this.tx.getTopicName(["DISCONNECT"]), payload, resolve);
		});
	}

	/**
	 * Subscribe to topics for transportation
	 * 
	 * @memberOf Transit
	 */
	makeSubscriptions() {

		// Subscribe to broadcast events
		this.tx.subscribe(["EVENT"]);

		// Subscribe to requests
		this.tx.subscribe(["REQ", this.nodeID, "*"]);

		// Subscribe to node responses of requests
		this.tx.subscribe(["RES", this.nodeID, "*"]);

		// Discover handler
		this.tx.subscribe(["DISCOVER"]);

		// NodeInfo handler
		this.tx.subscribe(["INFO", this.nodeID]);

		// Disconnect handler
		this.tx.subscribe(["DISCONNECT"]);

		// Heart-beat handler
		this.tx.subscribe(["HEARTBEAT"]);
	}

	messageHandler(topic, packet) {
		let msg;
		if (packet)
			msg = utils.string2Json(packet);

		let topics = this.tx.splitTopicName(topic);

		if (msg.nodeID == this.nodeID) return; 

		switch(topics[0]) {
		case "EVENT": {
			this.logger.debug("Event received", msg);
			this.broker.emitLocal(msg.event, msg.args);
				
			break;
		}
		case "REQ": {
			if (!msg) {
				return Promise.reject("Invalid request!");
			}
			this.logger.debug(`Request from ${msg.nodeID}.`, msg.action, msg.params);

			this.broker.call(msg.action, msg.params)
				.then(res => this.sendResponse(msg.nodeID, null, res))
				.catch(err => this.sendResponse(msg.nodeID, err, null));
			
			break;
		}

		case "RES": {
			let req = this.pendingRequests.get(topics[2]);

			// If not exists (timed out), we skip to process the response
			if (!req) break;

			// Stop timeout timer
			if (req.timer) {
				/* istanbul ignore next */
				clearTimeout(req.timer);
			}

			// Check payload
			if (!msg) {
				/* istanbul ignore next */
				req.reject(new Error("Missing response payload!"));
				break;
			}
			
			if (msg.success) {
				req.resolve(msg.data);
			} else {
				// Recreate exception object
				let err = new Error(msg.error.message + ` (NodeID: ${msg.nodeID})`);
				err.name = msg.error.name;
				err.code = msg.error.code;
				err.nodeID = msg.nodeID;
				err.data = msg.error.data;

				req.reject(err);
			}

			break;
		}

		case "INFO":
		case "DISCOVER": {
			this.logger.debug("Discovery received from " + msg.nodeID);
			this.broker.processNodeInfo(msg.nodeID, msg);

			if (topics[0] == "DISCOVER")
				this.sendNodeInfo();

			break;
		}

		case "DISCONNECT": {
			this.logger.debug(`Node '${msg.nodeID}' disconnected`);
			this.broker.nodeDisconnected(msg.nodeID, msg);

			break;
		}

		case "HEARTBEAT": {
			this.logger.debug("Node heart-beat received from " + msg.nodeID);
			this.broker.nodeHeartbeat(msg.nodeID, msg);

			break;
		}
		}
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
		this.tx.publish(this.tx.getTopicName(["EVENT", eventName]), payload);
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
			this.logger.debug(`Send request '${message.action}' action to '${ctx.nodeID}' node...`, message);
			let payload = utils.json2String(message);

			// Handle request timeout
			if (opts.timeout > 0) {
				// Jest mock: http://facebook.github.io/jest/docs/timer-mocks.html#run-all-timers
				req.timer = setTimeout(() => {
					// Remove from pending requests
					this.pendingRequests.delete(ctx.id);

					this.logger.warn(`Request timed out when call '${message.action}' action on '${ctx.nodeID}' node! (timeout: ${opts.timeout / 1000} sec)`, message);
					
					reject(new RequestTimeoutError(message, ctx.nodeID));
				}, opts.timeout);

				req.timer.unref();
			}

			this.pendingRequests.set(ctx.id, req);

			this.tx.publish(this.tx.getTopicName(["REQ", ctx.id]), payload);
		});
	}

	sendResponse(nodeID, err, data) {
		let msg = {
			success: !err,
			nodeID: this.nodeID,
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
		this.logger.debug(`Response to ${nodeID}`, /*message.action, message.params,*/ "Length: ", payload.length, "bytes");
		this.tx.publish(this.tx.getTopicName(["RES", nodeID]), payload);
	}	

	/**
	 * Discover other nodes. It will be called after success connect.
	 * 
	 * @returns
	 * 
	 * @memberOf Transit
	 */
	discoverNodes() {
		let actionList = this.broker.getLocalActionList();
		let payload = utils.json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});
		return this.tx.publish(this.tx.getTopicName(["DISCOVER"]), payload);
	}

	/**
	 * Send node info package to other nodes. It will be called with timer
	 * 
	 * @memberOf Transit
	 */
	sendNodeInfo() {
		let actionList = this.broker.getLocalActionList();
		let payload = utils.json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});
		return this.tx.publish(this.tx.getTopicName(["INFO"]), payload);
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
		this.tx.publish(this.tx.getTopicName(["HEARTBEAT"]), payload);
	}

}

module.exports = Transit;