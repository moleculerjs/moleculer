/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

/**
 * Transporter for NATS
 * 
 * More info: http://nats.io/
 * 
 * @class NatsTransporter
 * @extends {Transporter}
 */
class NatsTransporter extends Transporter {

	/**
	 * Creates an instance of NatsTransporter.
	 * 
	 * @param {any} opts
	 * 
	 * @memberOf NatsTransporter
	 */
	constructor(opts) {
		super(opts);
		
		this.client = null;
	}

	/**
	 * Connect to a NATS server
	 * 
	 * @memberOf NatsTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let Nats = require("nats");
			this.client = Nats.connect(this.opts);

			this.client.on("connect", () => {
				this.logger.info("NATS connected!");

				resolve();
			});

			/* istanbul ignore next */
			this.client.on("error", (e) => {
				this.logger.error("NATS error", e);
				if (e.toString().indexOf("ECONNREFUSED") != -1) {
					this.reconnectAfterTime();
				}

				if (!this.client.connected)
					reject(e);
			});

			/* istanbul ignore next */
			this.client.on("close", () => {
				this.logger.warn("NATS disconnected!");
			});			
		});
	}

	/**
	 * Disconnect from a NATS server
	 * 
	 * @memberOf NatsTransporter
	 */
	disconnect() {
		if (this.client) {
			this.client.close();
			this.client = null;
		}
	}

	/**
	 * Reconnect to server after x seconds
	 * 
	 * @memberOf BaseTransporter
	 */
	reconnectAfterTime() {
		//this.logger.info("Reconnecting after 5 sec...");
		setTimeout(() => {
			this.connect();
		}, 5 * 1000);
	}	

	/**
	 * Subscribe to a topic
	 * 
	 * @param {Array} topic 
	 * 
	 * @memberOf NatsTransporter
	 */
	subscribe(topic) {
		this.client.subscribe([this.prefix].concat(topic), (msg, reply, subject) => {
			this.messageHandler(subject.slice(1), msg);
		});
	}

	/**
	 * Publish a message on the topic
	 * 
	 * @param {Array} topic 
	 * @param {String} packet 
	 * 
	 * @memberOf NatsTransporter
	 */
	publish(topic, packet) {
		this.client.publish([this.prefix].concat(topic), packet);
	}

}

module.exports = NatsTransporter;