/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Endpoint = require("./endpoint");

/**
 * Endpoint class for actions
 *
 * @class ActionEndpoint
 * @extends {Endpoint}
 */
class ActionEndpoint extends Endpoint {
	/**
	 * Creates an instance of ActionEndpoint.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Node} node
	 * @param {ServiceItem} service
	 * @param {any} action
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
	 * @param {any} action
	 * @memberof ActionEndpoint
	 */
	update(action) {
		this.action = action;
	}
}

module.exports = ActionEndpoint;
