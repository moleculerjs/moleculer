/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");
const utils 		= require("../utils");

let PREFIX = "ICE";

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
		
		if (this.opts.prefix) {
			PREFIX = this.opts.prefix;
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
			this.client.publish([PREFIX, "DISCONNECT"].join("."), payload, () => {
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
		let eventSubject = [PREFIX, "EVENT", ">"].join(".");
		this.client.subscribe(eventSubject, (msg) => {
			let message = utils.string2Json(msg);
			if (message.nodeID !== this.nodeID) {
				this.logger.debug("Event received", message);
				this.broker.emitLocal(message.event, ...message.args);
			}
		});

		// Subscribe to node requests
		let reqSubject = [PREFIX, "REQ", this.nodeID, ">"].join(".");
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
				let payload = utils.json2String(res);
				this.logger.debug("Response", message.action, message.params, "Length: ", payload.length, "bytes");
				this.client.publish(reply, payload);
			});
		});

		// Discover handler
		this.client.subscribe([PREFIX, "DISCOVER"].join("."), (msg, reply) => {
			let nodeInfo = utils.string2Json(msg);
			let nodeID = nodeInfo.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Discovery received from " + nodeID);
				this.broker.processNodeInfo(nodeID, nodeInfo);

				this.sendNodeInfoPackage(reply);
			}					
		});

		// NodeInfo handler
		this.client.subscribe([PREFIX, "INFO", this.nodeID].join("."), (msg) => {
			let nodeInfo = utils.string2Json(msg);
			let nodeID = nodeInfo.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Node info received from " + nodeID);
				this.broker.processNodeInfo(nodeID, nodeInfo);
			}
		});		

		// Disconnect handler
		this.client.subscribe([PREFIX, "DISCONNECT"].join("."), (msg) => {
			let message = utils.string2Json(msg);
			let nodeID = message.nodeID;
			if (nodeID !== this.nodeID) {
				this.logger.debug("Node disconnect event received from " + nodeID);
				this.broker.nodeDisconnected(nodeID, message);
			}
		});	

		// Heart-beat handler
		this.client.subscribe([PREFIX, "HEARTBEAT"].join("."), (msg) => {
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
	 * @param {any} args
	 * 
	 * @memberOf NatsTransporter
	 */
	emit(eventName, ...args) {
		let subject = [PREFIX, "EVENT", eventName].join(".");
		let event = {
			nodeID: this.nodeID,
			event: eventName,
			args
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
		this.client.subscribe([PREFIX, eventName].join("."), handler);
	}

	/**
	 * Send a request to a remote service. It returns a Promise
	 * what will be resolved when the response received.
	 * 
	 * TODO: request timeout, with reject
	 * 
	 * @param {any} targetNodeID	Remote Node ID
	 * @param {any} ctx				Context of request
	 * @returns	{Promise}
	 * 
	 * @memberOf NatsTransporter
	 */
	request(targetNodeID, ctx) {
		return new Promise((resolve) => {
			let replySubject = [PREFIX, "RESP", ctx.id].join(".");

			let sid = this.client.subscribe(replySubject, (response) => {
				if (response != "") {
					resolve(utils.string2Json(response));
				}
				/* istanbul ignore next */
				else {
					resolve(null);
				}
					
				this.client.unsubscribe(sid);
			});

			let message = {
				nodeID: this.nodeID,
				requestID: ctx.id,
				action: ctx.action.name,
				params: ctx.params
			};
			this.logger.debug("Request action", message);
			let payload = utils.json2String(message);

			let subj = [PREFIX, "REQ", targetNodeID, message.action].join(".");
			this.client.publish(subj, payload, replySubject);
		});
	}
	/*request(targetNodeID, ctx) {
		return new Promise((resolve) => {
			let message = {
				nodeID: this.nodeID,
				requestID: ctx.id,
				action: ctx.action.name,
				params: ctx.params
			};
			this.logger.debug("Request action", message);
			let payload = utils.json2String(message);

			let subj = [PREFIX, "REQ", targetNodeID, message.action].join(".");
			this.client.request(subj, payload, { max: 1}, (response) => {
				if (response != "") {
					resolve(utils.string2Json(response));
				}
				//* istanbul ignore next *
				else {
					resolve(null);
				}
			});
		});
	}*/

	/**
	 * Discover other nodes. It will be called internally after success connect.
	 * 
	 * @returns
	 * 
	 * @memberOf NatsTransporter
	 */
	discoverNodes() {
		return this.sendNodeInfoPackage([PREFIX, "DISCOVER"].join("."), [PREFIX, "INFO", this.nodeID].join("."));
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
		this.client.publish([PREFIX, "HEARTBEAT"].join("."), payload);
	}
}

module.exports = NatsTransporter;