/*
 * servicer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/servicer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");
const utils 		= require("../utils");
const { RequestTimeoutError } = require("../errors");

/**
 * Internal transporter via NATS
 * 
 * More info: http://nats.io/
 * 
 * @class NatsTransporter
 * @extends {Transporter}
 */
class NatsTransporter extends Transporter {

	/**
	 * Creates an instance of NatsTransporter.
	 * 
	 * @param {any} opts
	 * 
	 * @memberOf NatsTransporter
	 */
	constructor(opts) {
		super(opts);
		this.client = null;
		this.prefix = "SVC";
		
		if (this.opts.prefix) {
			this.prefix = this.opts.prefix;
		}
	}

	/**
	 * Initialize transporter
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf NatsTransporter
	 */
	init(broker) {
		super.init(broker);
		this.nodeID = broker.nodeID;
		this.logger = broker.getLogger("NATS");
	}

	/**
	 * Connect to a NATS server
	 * 
	 * @memberOf NatsTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let Nats = require("nats");
			this.client = Nats.connect(this.opts);

			this.client.on("connect", () => {
				this.logger.info("NATS connected!");

				this.registerEventHandlers();
				this.discoverNodes();

				resolve();
			});

			/* istanbul ignore next */
			this.client.on("error", (e) => {
				this.logger.error("NATS error", e);
				if (e.toString().indexOf("ECONNREFUSED") != -1) {
					this.logger.info("Reconnecting after 5 sec...");
					setTimeout(() => {
						this.connect();
					}, 5 * 1000);
				}
				else {
					reject(e);
				}
			});

			/* istanbul ignore next */
			this.client.on("close", () => {
				this.logger.warn("NATS disconnected!");
			});			
		});
	}

	/**
	 * Disconnect from a NATS server
	 * 
	 * @memberOf NatsTransporter
	 */
	disconnect() {
		if (this.client) {
			// Send a disconnect message to remote nodes
			let message = {
				nodeID: this.nodeID
			};
			this.logger.debug("Send DISCONNECT message", message);
			let payload = utils.json2String(message);
			this.client.publish([this.prefix, "DISCONNECT"].join("."), payload, () => {
				/* istanbul ignore next */
				this.client.close();
				/* istanbul ignore next */
				this.client = null;
			});
		}
	}

	/**
	 * Register transporter event handlers
	 * 
	 * @memberOf NatsTransporter
	 */
	registerEventHandlers() {

		// Subscribe to broadcast events
		let eventSubject = [this.prefix, "EVENT", ">"].join(".");
		this.client.subscribe(eventSubject, (msg) => {
			let message = utils.string2Json(msg);
			if (message.nodeID !== this.nodeID) {
				this.logger.debug("Event received", message);
				this.broker.emitLocal(message.event, message.args);
			}
		});

		// Subscribe to node requests
		let reqSubject = [this.prefix, "REQ", this.nodeID, ">"].join(".");
		this.client.subscribe(reqSubject, (msg, reply) => {
			let message;
			if (msg != "") {
				message = utils.string2Json(msg);
			}

			/* istanbul ignore next */
			if (!message) {
				return Promise.reject("Invalid request!");
			}
			this.logger.debug(`Request received from ${message.nodeID}. Action: ${message.action}`);

			return this.broker.call(message.action, message.params).then(res => {
				let msg = {
					success: true,
					nodeID: this.nodeID,
					data: res
				};
				let payload = utils.json2String(msg);
				this.logger.debug("Response data", message.action, message.params, "Length: ", payload.length, "bytes");
				this.client.publish(reply, payload);
			}).catch(err => {
				let msg = {
					success: false,
					nodeID: this.nodeID,
					error: {
						name: err.name,
						message: err.message,
						code: err.code,
						data: err.data
					}
				};
				let payload = utils.json2String(msg);
				this.logger.debug("Response error", message.action, message.params, "Length: ", payload.length, "bytes");
				this.client.publish(reply, payload);
			});
		});

		// Discover handler
		this.client.subscribe([this.prefix, "DISCOVER"].join("."), (msg, reply) => {
			let nodeInfo = utils.string2Json(msg);
			let nodeID = nodeInfo.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Discovery received from " + nodeID);
				this.broker.processNodeInfo(nodeID, nodeInfo);

				this.sendNodeInfoPackage(reply);
			}					
		});

		// NodeInfo handler
		this.client.subscribe([this.prefix, "INFO", this.nodeID].join("."), (msg) => {
			let nodeInfo = utils.string2Json(msg);
			let nodeID = nodeInfo.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Node info received from " + nodeID);
				this.broker.processNodeInfo(nodeID, nodeInfo);
			}
		});		

		// Disconnect handler
		this.client.subscribe([this.prefix, "DISCONNECT"].join("."), (msg) => {
			let message = utils.string2Json(msg);
			let nodeID = message.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Node disconnect event received from " + nodeID);
				this.broker.nodeDisconnected(nodeID, message);
			}
		});	

		// Heart-beat handler
		this.client.subscribe([this.prefix, "HEARTBEAT"].join("."), (msg) => {
			let message = utils.string2Json(msg);
			let nodeID = message.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Node heart-beat received from " + nodeID);
				this.broker.nodeHeartbeat(nodeID, message);
			}
		});		
	}

	/**
	 * Send an event to remote nodes
	 * 
	 * @param {any} eventName
	 * @param {any} param
	 * 
	 * @memberOf NatsTransporter
	 */
	emit(eventName, param) {
		let subject = [this.prefix, "EVENT", eventName].join(".");
		let event = {
			nodeID: this.nodeID,
			event: eventName,
			param
		};
		this.logger.debug("Emit Event", event);
		let payload = utils.json2String(event);
		this.client.publish(subject, payload);
	}

	/**
	 * Subscribe to an event
	 * 
	 * @param {any} eventName
	 * @param {any} handler
	 * 
	 * @memberOf NatsTransporter
	 */
	subscribe(eventName, handler) {
		this.client.subscribe([this.prefix, eventName].join("."), handler);
	}

	/**
	 * Send a request to a remote service. It returns a Promise
	 * what will be resolved when the response received.
	 * 
	 * @param {Context} ctx			Context of request
	 * @param {any} opts			Options of request
	 * @returns	{Promise}
	 * 
	 * @memberOf NatsTransporter
	 */
	request(ctx, opts = {}) {
		return new Promise((resolve, reject) => {
			let timer = null;
			let timedOut = false;
			let replySubject = [this.prefix, "RESP", ctx.id].join(".");

			let sid = this.client.subscribe(replySubject, (response) => {
				// Unsubscribe from reply topic
				this.client.unsubscribe(sid);

				// If timed out, we skip to process the response
				if (timedOut) return;

				// Stop timeout timer
				if (timer) {
					clearTimeout(timer);
				}

				// Convert response to object
				if (response == "")
					/* istanbul ignore next */
					return reject(new Error("Missing response payload!"));
				
				let msg = utils.string2Json(response);

				if (msg.success) {
					return resolve(msg.data);
				} else {
					// Recreate exception object
					let err = new Error(msg.error.message + ` (NodeID: ${msg.nodeID})`);
					err.name = msg.error.name;
					err.code = msg.error.code;
					err.nodeID = msg.nodeID;
					err.data = msg.error.data;

					return reject(err);
				}
					
			});

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
				timer = setTimeout(() => {
					timedOut = true;
					// Unsubscribe from response
					this.client.unsubscribe(sid); 

					this.logger.warn(`Request timed out when call '${message.action}' action on '${ctx.nodeID}' node! (timeout: ${opts.timeout / 1000} sec)`, message);
					
					reject(new RequestTimeoutError(message, ctx.nodeID));
				}, opts.timeout);
				timer.unref();
			}

			let subj = [this.prefix, "REQ", ctx.nodeID, message.action].join(".");
			this.client.publish(subj, payload, replySubject);
		});
	}

	/**
	 * Discover other nodes. It will be called internally after success connect.
	 * 
	 * @returns
	 * 
	 * @memberOf NatsTransporter
	 */
	discoverNodes() {
		return this.sendNodeInfoPackage([this.prefix, "DISCOVER"].join("."), [this.prefix, "INFO", this.nodeID].join("."));
	}

	/**
	 * Send node info package to other nodes
	 * 
	 * @param {any} subject
	 * @param {any} replySubject
	 * 
	 * @memberOf NatsTransporter
	 */
	sendNodeInfoPackage(subject, replySubject) {
		let actionList = this.broker.getLocalActionList();
		let payload = utils.json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});
		this.client.publish(subject, payload, replySubject);
	}

	sendHeartbeat() {
		let payload = utils.json2String({
			nodeID: this.broker.nodeID
		});
		this.client.publish([this.prefix, "HEARTBEAT"].join("."), payload);
	}
}

module.exports = NatsTransporter;