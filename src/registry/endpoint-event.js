/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Endpoint = require("./endpoint");

/**
 * Endpoint class for events
 *
 * @class EventEndpoint
 * @extends {Endpoint}
 */
class EventEndpoint extends Endpoint {

	/**
	 * Creates an instance of EventEndpoint.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Node} node
	 * @param {Service} service
	 * @param {any} event
	 * @memberof EventEndpoint
	 */
	constructor(registry, broker, node, service, event) {
		super(registry, broker, node);

		this.service = service;
		this.event = event;
	}

	/**
	 * Update properties
	 *
	 * @param {any} event
	 * @memberof EventEndpoint
	 */
	update(event) {
		this.event = event;
	}
}

module.exports = EventEndpoint;
