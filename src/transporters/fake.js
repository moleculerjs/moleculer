/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
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
	 * @memberOf FakeTransporter
	 */
	constructor(opts) {
		super(opts);

		// Local event bus
		this.bus = global.bus;
		this.hasBuiltInBalancer = true;
	}

	/**
	 * Connect to a NATS server
	 *
	 * @memberOf FakeTransporter
	 */
	connect() {
		return this.onConnected();
	}

	/**
	 * Disconnect from a NATS server
	 *
	 * @memberOf FakeTransporter
	 */
	disconnect() {
		this.connected = false;
		return Promise.resolve();
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf FakeTransporter
	 */
	subscribe(cmd, nodeID) {
		const t = this.getTopicName(cmd, nodeID);
		this.bus.on(t, msg => this.messageHandler(cmd, msg));
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
	 * @memberOf FakeTransporter
	 */
	publish(packet) {
		const data = packet.serialize();
		this.bus.emit(this.getTopicName(packet.type, packet.target), data);
		return Promise.resolve();
	}

	/**
	 * Publish a balanced EVENT packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 *
	 * @memberOf BaseTransporter
	 */
	publishBalancedEvent(/*packet, group*/) {
		return Promise.resolve();
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 *
	 * @memberOf BaseTransporter
	 */
	publishBalancedRequest(/*packet*/) {
		return Promise.resolve();
	}

}

module.exports = FakeTransporter;
