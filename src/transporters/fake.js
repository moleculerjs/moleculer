/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Transporter = require("./base");
const EventEmitter2 = require("eventemitter2").EventEmitter2;

/**
 * Import types
 *
 * @typedef {import("./fake")} FakeTransporterClass
 */

// Put to global to transfer messages between brokers in the same process
global.bus = new EventEmitter2({
	wildcard: true,
	maxListeners: 100
});

/**
 * Fake Transporter
 *
 * @class FakeTransporter
 * @extends {Transporter}
 * @implements {FakeTransporterClass}
 */
class FakeTransporter extends Transporter {
	/**
	 * Creates an instance of FakeTransporter.
	 *
	 * @param {Record<string, any>} opts
	 *
	 * @memberof FakeTransporter
	 */
	constructor(opts) {
		super(opts);

		// Local event bus
		this.bus = global.bus;
		this.hasBuiltInBalancer = true;

		this.subscriptions = [];
	}

	/**
	 * Connect to a NATS server
	 *
	 * @memberof FakeTransporter
	 */
	connect() {
		return this.onConnected();
	}

	/**
	 * Disconnect from a NATS server
	 *
	 * @memberof FakeTransporter
	 */
	disconnect() {
		this.connected = false;
		this.subscriptions.forEach(({ topic, handler }) => this.bus.off(topic, handler));
		this.subscriptions = [];

		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof FakeTransporter
	 */
	subscribe(cmd, nodeID) {
		const t = this.getTopicName(cmd, nodeID);
		const handler = msg => this.receive(cmd, msg);
		this.subscriptions.push({ topic: t, handler });

		this.bus.on(t, handler);
		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedRequest() {
		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedEvent() {
		return this.broker.Promise.resolve();
	}

	/**
	 * Send data buffer.
	 *
	 * @param {String} topic
	 * @param {Buffer} data
	 *
	 * @returns {Promise}
	 */
	send(topic, data) {
		this.bus.emit(topic, data);
		return this.broker.Promise.resolve();
	}
}

module.exports = FakeTransporter;
