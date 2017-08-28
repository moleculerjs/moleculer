/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Endpoint = require("./endpoint");

class ActionEndpoint extends Endpoint {

	constructor(registry, broker, node, service, action) {
		super(registry, broker, node);

		this.service = service;
		this.action = action;
	}

	get isAvailable() {
		return this.state;
	}

	updateAction(action) {
		this.action = action;
	}
}

module.exports = ActionEndpoint;
