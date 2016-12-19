"use strict";

class Transporter {

	constructor(opts) {
		this.opts = opts;
	}

	init(broker) {
		this.broker = broker;
	}

	connect() {

	}

	disconnect() {

	}

	emit(eventName, data) {
		throw new Error("Not implemented!");
	}

	subscribe(eventName, handler) {
		throw new Error("Not implemented!");
	}

	request(actionName, params) {
		return new Promise((resolve, reject) => {
			reject("Not implemented");
		});
	}

}

module.exports = Transporter;