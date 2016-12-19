"use strict";

let Transporter = require("./transporter");

let Nats = require("nats");

const PREFIX = "ICE";

class NatsTransporter extends Transporter {

	constructor(opts) {
		super(opts);
		this.client = null;
	}

	init(broker, nodeID) {
		super.init(broker);
		this.nodeID = nodeID;
	}

	connect() {
		this.client = Nats.connect(this.opts);

		this.client.on("connect", () => {
			console.log("NATS connected!");

			// Subscribe to broadcast events
			let eventSubject = [PREFIX, "EVENT", ">"].join(".");
			this.client.subscribe(eventSubject, (msg, reply, subject) => {
				this.broker.emitLocal(subject.slice(eventSubject.length - 1), JSON.parse(msg));
			});

			// Subscribe to node requests
			let reqSubject = [PREFIX, this.nodeID, ">"].join(".");
			this.client.subscribe(reqSubject, (msg, reply, subject) => {
				let params = JSON.parse(msg);
				this.broker.call(subject.slice(reqSubject.length - 1), params).then(res => {
					console.log("REQUEST RECEIVED", params);
					let payload = JSON.stringify(res);
					this.client.publish([PREFIX, "REQ", params.$requestID].join("."), payload);
				});
			});
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
		this.client.publish(subject, JSON.stringify(data));
	}

	subscribe(eventName, handler) {
		this.client.subscribe(PREFIX + eventName, handler);
	}

	request(node, requestID, actionName, params) {
		return new Promise((resolve) => {
			let subject = [PREFIX, node.id, actionName].join(".");
			let sid = this.client.subscribe([PREFIX, "REQ", requestID].join("."), (response) => {
				resolve(JSON.parse(response));
				this.client.unsubscribe(sid);
			});

			let payload = JSON.stringify(Object.assign({}, params, { $requestID: requestID }));
			this.client.publish(subject, payload);
		});
	}

}

module.exports = NatsTransporter;