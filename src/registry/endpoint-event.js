/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Endpoint = require("./endpoint");

class EventEndpoint extends Endpoint {

	constructor(registry, broker, node, service, event) {
		super(registry, broker, node);

		this.service = service;
		this.event = event;
	}

	get isAvailable() {
		return this.state;
	}

	update(event) {
		this.event = event;
	}
}

module.exports = EventEndpoint;
