/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

const EventEmitter2 = require("eventemitter2").EventEmitter2;

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
 */
class FakeTransporter extends Transporter {

	/**
	 * Creates an instance of FakeTransporter.
	 *
	 * @param {any} opts
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

		return Promise.resolve();
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
		const handler = msg => this.incomingMessage(cmd, msg);
		this.subscriptions.push({ topic: t, handler });

		this.bus.on(t, handler);
		return Promise.resolve();
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedRequest(/*action*/) {
		return Promise.resolve();
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedEvent(/*event, group*/) {
		return Promise.resolve();
	}

	/**
	 * Send data buffer.
	 *
	 * @param {String} topic
	 * @param {Buffer} data
	 * @param {Object} meta
	 *
	 * @returns {Promise}
	 */
	send(topic, data) {
		this.bus.emit(topic, data);
		return Promise.resolve();
	}
}

module.exports = FakeTransporter;
