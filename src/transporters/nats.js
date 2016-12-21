"use strict";

let Transporter = require("./base");
let utils = require("../utils");

let PREFIX = "ICE";

class NatsTransporter extends Transporter {

	constructor(opts) {
		super(opts);
		this.client = null;
		
		if (this.opts.prefix)
			PREFIX = this.opts.prefix;
	}

	init(broker) {
		super.init(broker);
		this.nodeID = broker.nodeID;
		this.logger = broker.getLogger("NATS");
	}

	connect() {
		let Nats = require("nats");
		this.client = Nats.connect(this.opts);

		this.client.on("connect", () => {
			this.logger.info("NATS client connected!");

			// Subscribe to broadcast events
			let eventSubject = [PREFIX, "EVENT", ">"].join(".");
			this.client.subscribe(eventSubject, (msg, reply, subject) => {
				let event = utils.String2Json(msg);
				if (event.nodeID !== this.nodeID) {
					this.logger.debug("Event received", event);
					this.broker.emitLocal(subject.slice(eventSubject.length - 1), ...event.args);
				}
			});

			// Subscribe to node requests
			let reqSubject = [PREFIX, "REQ", this.nodeID, ">"].join(".");
			this.client.subscribe(reqSubject, (msg, reply, subject) => {
				let actionName = subject.slice(reqSubject.length - 1);
				this.logger.debug("Request received", actionName);
				let params;
				if (msg != "")
					params = utils.String2Json(msg);

				this.broker.call(actionName, params).then(res => {
					let payload = utils.Json2String(res);
					this.logger.debug("Response", actionName, params, "Length: ", payload.length, "bytes");
					this.client.publish(reply, payload);
				});
			});

			// Discover handlers
			this.client.subscribe([PREFIX, "DISCOVER"].join("."), (msg, reply, subject) => {
				let nodeInfo = utils.String2Json(msg);
				if (nodeInfo.nodeID !== this.nodeID) {
					this.logger.debug("Discovery received from " + nodeInfo.nodeID);
					this.broker.processNodeInfo(nodeInfo);

					this.sendNodeInfoPackage(reply);
				}					
			});

			this.client.subscribe([PREFIX, "INFO", this.nodeID].join("."), (msg) => {
				let nodeInfo = utils.String2Json(msg);
				if (nodeInfo.nodeID !== this.nodeID) {
					this.logger.debug("Node info received from " + nodeInfo.nodeID);
					this.broker.processNodeInfo(nodeInfo);
				}
			});

			this.discoverNodes();
		});

		this.client.on("error", (e) => {
			this.logger.error("NATS client error", e);
		});

		this.client.on("close", () => {
			this.logger.warn("NATS disconnected!");
		});
	}

	disconnect() {
		if (this.client)
			this.client.close();
	}

	emit(eventName, ...args) {
		let subject = [PREFIX, "EVENT", eventName].join(".");
		let event = {
			nodeID: this.nodeID,
			args
		};
		let payload = utils.Json2String(event);
		this.logger.debug("Emit Event", event);
		this.client.publish(subject, payload);
	}

	subscribe(eventName, handler) {
		this.client.subscribe(PREFIX + eventName, handler);
	}

	request(nodeID, requestID, actionName, params) {
		return new Promise((resolve) => {
			let replySubject = [PREFIX, "RESP", requestID].join(".");
			let sid = this.client.subscribe(replySubject, (response) => {
				if (response != "")
					resolve(utils.String2Json(response));
				else
					resolve(null);
					
				this.client.unsubscribe(sid);
			});

			let subj = [PREFIX, "REQ", nodeID, actionName].join(".");
			let payload = utils.Json2String(params);
			this.client.publish(subj, payload, replySubject);
		});
	}

	discoverNodes() {
		return this.sendNodeInfoPackage([PREFIX, "DISCOVER"].join("."), [PREFIX, "INFO", this.nodeID].join("."));
	}

	sendNodeInfoPackage(subject, replySubject) {
		let actionList = this.broker.getLocalActionList();
		let payload = utils.Json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});
		this.client.publish(subject, payload, replySubject);
	}
}

module.exports = NatsTransporter;