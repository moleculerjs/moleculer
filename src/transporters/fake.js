/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

//const EventEmitter2 = require("eventemitter2").EventEmitter2;
const EventEmitter = require("events").EventEmitter;

// Put to global to transfer messages between brokers in the process
global.bus = new EventEmitter({
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
	}

	/**
	 * Connect to a NATS server
	 * 
	 * @memberOf FakeTransporter
	 */
	connect() {
		this.connected = true;
		return Promise.resolve();
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
	 * Subscribe to a topic
	 * 
	 * @param {Array} topic 
	 * 
	 * @memberOf FakeTransporter
	 */
	subscribe(topic) {
		const t = [this.prefix].concat(topic).join(".");
		/*
		const self = this;
		this.bus.on(t, function subscriptionHandler(msg) {
			//const event = this.event.split(".").slice(1);
			self.messageHandler(topic, msg);
		});
		*/

		this.bus.on(t, msg => this.messageHandler(topic, msg));
	}

	/**
	 * Publish a message on the topic
	 * 
	 * @param {Packet} packet
	 * 
	 * @memberOf FakeTransporter
	 */
	publish(packet) {
		const t = this.prefix + "." + packet.getTopic().join("."); // Faster than [].concat
		const data = packet.serialize();
		this.bus.emit(t, data);
	}

}

module.exports = FakeTransporter;