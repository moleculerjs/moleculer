"use strict";

let bus = require("./service-bus");

class Context {

	constructor() {

	}


	emit(eventName, data) {
		return bus.emit(eventName, data);
	}
}

module.exports = Context;