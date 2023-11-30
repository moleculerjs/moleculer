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
 * @typedef {import("./endpoint-action")} ActionEndpointClass
 * @typedef {import("./node")} Node
 * @typedef {import("../service")} Service
 * @typedef {import("../service").ActionSchema} ActionSchema
 */

/**
 * Endpoint class for actions
 *
 * @class ActionEndpoint
 * @extends {Endpoint}
 * @implements {ActionEndpointClass}
 */
class ActionEndpoint extends Endpoint {
	/**
	 * Creates an instance of ActionEndpoint.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Node} node
	 * @param {Service} service
	 * @param {ActionSchema} action
	 * @memberof ActionEndpoint
	 */
	constructor(registry, broker, node, service, action) {
		super(registry, broker, node);

		this.service = service;
		this.action = action;

		this.name = `${this.id}:${this.action.name}`;
	}

	/**
	 * Update properties
	 *
	 * @param {ActionSchema} action
	 * @memberof ActionEndpoint
	 */
	update(action) {
		this.action = action;
	}
}

module.exports = ActionEndpoint;
