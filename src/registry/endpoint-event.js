/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Endpoint = require("./endpoint");

/**
 * Import types
 *
 * @typedef {import("./registry")} Registry
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("./endpoint-event")} EventEndpointClass
 * @typedef {import("./node")} Node
 * @typedef {import("../service")} Service
 * @typedef {import("../service").ServiceEvent} ServiceEvent
 */

/**
 * Endpoint class for events
 *
 * @class EventEndpoint
 * @extends {Endpoint}
 * @implements {EventEndpointClass}
 */
class EventEndpoint extends Endpoint {
	/**
	 * Creates an instance of EventEndpoint.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Node} node
	 * @param {Service} service
	 * @param {ServiceEvent} event
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
	 * @param {ServiceEvent} event
	 * @memberof EventEndpoint
	 */
	update(event) {
		this.event = event;
	}
}

module.exports = EventEndpoint;
