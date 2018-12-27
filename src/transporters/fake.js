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
		this.subscriptions.forEach(event => this.bus.removeAllListeners(event));
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
		this.subscriptions.push(t);

		this.bus.on(t, msg => this.incomingMessage(cmd, msg));
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
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof FakeTransporter
	 */
	publish(packet) {
		this.bus.emit(this.getTopicName(packet.type, packet.target), this.serialize(packet));
		return Promise.resolve();
	}

	/**
	 * Publish a balanced EVENT packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	publishBalancedEvent(/*packet, group*/) {
		/* istanbul ignore next */
		return Promise.resolve();
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	publishBalancedRequest(/*packet*/) {
		/* istanbul ignore next */
		return Promise.resolve();
	}

}

module.exports = FakeTransporter;
