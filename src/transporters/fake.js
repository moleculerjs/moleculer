/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

const EventEmitter2 = require("eventemitter2").EventEmitter2;

// Put to global to transfer messages between brokers in the process
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
		this.connected = true;
	}

	/**
	 * Connect to a NATS server
	 * 
	 * @memberOf FakeTransporter
	 */
	connect() {
		return Promise.resolve();
	}

	/**
	 * Disconnect from a NATS server
	 * 
	 * @memberOf FakeTransporter
	 */
	disconnect() {
		this.connected = true;
	}

	/**
	 * Subscribe to a topic
	 * 
	 * @param {Array} topic 
	 * 
	 * @memberOf FakeTransporter
	 */
	subscribe(topic) {
		const self = this;
		const t = [this.prefix].concat(topic).join(".");
		this.bus.on(t, function subscriptionHandler(msg) {
			const event = this.event.split(".").slice(1);
			self.messageHandler(event, msg);
		});
	}

	/**
	 * Publish a message on the topic
	 * 
	 * @param {Array} topic 
	 * @param {String} packet 
	 * 
	 * @memberOf FakeTransporter
	 */
	publish(topic, packet) {
		const t = [this.prefix].concat(topic).join(".");
		this.bus.emit(t, packet);
	}

}

module.exports = FakeTransporter;