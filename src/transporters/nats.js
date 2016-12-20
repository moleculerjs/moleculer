"use strict";

let Transporter = require("./transporter");
let utils = require("../utils");

let Nats = require("nats");

const PREFIX = "ICE";

class NatsTransporter extends Transporter {

	constructor(opts) {
		super(opts);
		this.client = null;
	}

	init(broker) {
		super.init(broker);
		this.nodeID = broker.nodeID;
	}

	connect() {
		this.client = Nats.connect(this.opts);

		this.client.on("connect", () => {
			console.log(`[${this.nodeID}] NATS connected!`);

			// Subscribe to broadcast events
			let eventSubject = [PREFIX, "EVENT", ">"].join(".");
			this.client.subscribe(eventSubject, (msg, reply, subject) => {
				this.broker.emitLocal(subject.slice(eventSubject.length - 1), utils.String2Json(msg));
			});

			// Subscribe to node requests
			let reqSubject = [PREFIX, "REQ", this.nodeID, ">"].join(".");
			this.client.subscribe(reqSubject, (msg, reply, subject) => {
				let params;
				if (msg != "")
					params = utils.String2Json(msg);

				let actionName = subject.slice(reqSubject.length - 1);
				this.broker.call(actionName, params).then(res => {
					console.log("REQUEST RECEIVED", actionName, params);
					let payload = utils.Json2String(res);
					this.client.publish(reply, payload);
				});
			});

			// Discover handlers
			this.client.subscribe([PREFIX, "DISCOVER"].join("."), (msg, reply, subject) => {
				let nodeInfo = utils.String2Json(msg);
				if (nodeInfo.nodeID !== this.nodeID) {
					this.processNodeInfos(nodeInfo);

					this.sendNodeInfoPackage(reply);
				}					
			});

			this.client.subscribe([PREFIX, "INFO", this.nodeID].join("."), (msg) => {
				let nodeInfo = utils.String2Json(msg);
				if (nodeInfo.nodeID !== this.nodeID)
					this.processNodeInfos(nodeInfo);
			});

			this.discoverNodes();
		});

		this.client.on("error", (e) => {
			console.log("NATS error", e);
		});

		this.client.on("close", () => {
			console.log("NATS connection closed!");
		});
	}

	disconnect() {
		if (this.client)
			this.client.close();
	}

	emit(eventName, data) {
		let subject = [PREFIX, "EVENT", eventName].join(".");
		this.client.publish(subject, utils.Json2String(data));
	}

	subscribe(eventName, handler) {
		this.client.subscribe(PREFIX + eventName, handler);
	}

	request(node, requestID, actionName, params) {
		return new Promise((resolve) => {
			let replySubject = [PREFIX, "RESP", requestID].join(".");
			let sid = this.client.subscribe(replySubject, (response) => {
				if (response != "")
					resolve(utils.String2Json(response));
				else
					resolve(null);
					
				this.client.unsubscribe(sid);
			});

			let pubSubject = [PREFIX, node.id, actionName].join(".");
			//let payload = utils.Json2String(Object.assign({}, params, { $requestID: requestID }));
			let payload = utils.Json2String(params);
			this.client.publish(pubSubject, payload, replySubject);
		});
	}

	discoverNodes() {
		return this.sendNodeInfoPackage([PREFIX, "DISCOVER"].join("."), [PREFIX, "INFO", this.nodeID].join("."));
	}

	sendNodeInfoPackage(subject, replySubject) {
		let actionList = this.broker.getLocalActionList();
		// Send actionList
		let payload = utils.Json2String({
			nodeID: this.broker.nodeID,
			actions: actionList
		});

		//console.log(payload);
		this.client.publish(subject, payload, replySubject);
	}

	processNodeInfos(actionList) {
		if (actionList.nodeID != this.nodeID)
			console.log(`[${this.nodeID}] Incoming action list!`, actionList);
	}
}

module.exports = NatsTransporter;