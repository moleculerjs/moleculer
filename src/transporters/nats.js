"use strict";

let Transporter = require("./transporter");

let Nats = require("nats");

const PREFIX = "IS.";

class NatsTransporter extends Transporter {

	constructor(opts) {
		super(opts);
		this.client = null;
	}

	init(broker) {
		super.init(broker);
	}

	connect() {
		this.client = Nats.connect(this.opts);

		this.client.on("error", (e) => {
			console.log("NATS error", e);
		});

		this.client.on("close", () => {
			console.log("NATS connection closed!");
		});

		this.client.subscribe(PREFIX + ">", (msg, reply, subject) => {
			this.broker.emitLocal(subject.slice(PREFIX.length), JSON.parse(msg));
		});
	}

	disconnect() {
		if (this.client)
			this.client.close();
	}

	emit(eventName, data) {
		this.client.publish(PREFIX + eventName, JSON.stringify(data));
	}

	subscribe(eventName, handler) {
		this.client.subscribe(PREFIX + eventName, handler);
	}

	request(actionName, params) {
		return new Promise((resolve) => {
			this.client.request(PREFIX + actionName, JSON.stringify(params), { max: 1 }, (response) => {
				resolve(JSON.parse(response));
			});
		});
	}

}

module.exports = NatsTransporter;