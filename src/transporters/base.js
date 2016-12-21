"use strict";

class BaseTransporter {

	constructor(opts) {
		this.opts = opts || {};
	}

	init(broker) {
		this.broker = broker;
	}

	connect() {

	}

	disconnect() {

	}

	emit(eventName, ...args) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	subscribe(eventName, handler) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	request(actionName, params) {
		/* istanbul ignore next */
		return new Promise((resolve, reject) => {
			reject("Not implemented");
		});
	}

}

module.exports = BaseTransporter;