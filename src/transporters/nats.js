/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
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
		if (typeof opts == "string")
			opts = { nats: { url: opts } };

		super(opts);

		// Use the 'preserveBuffers' option as true as default
		if (!this.opts.nats || this.opts.nats.preserveBuffers !== false) {
			if (!this.opts.nats)
				this.opts.nats = {};

			this.opts.nats.preserveBuffers = true;
		}

		this.client = null;
	}

	/**
	 * Connect to a NATS server
	 *
	 * @memberOf NatsTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let Nats;
			try {
				Nats = require("nats");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'nats' package is missing! Please install it with 'npm install nats --save' command.", err, true);
			}
			const client = Nats.connect(this.opts.nats);
			this._client = client; // For tests

			client.on("connect", () => {
				this.client = client;
				this.logger.info("NATS client is connected.");

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			client.on("reconnect", () => {
				this.logger.info("NATS client is reconnected.");
				this.onConnected(true);
			});

			/* istanbul ignore next */
			client.on("reconnecting", () => {
				this.logger.warn("NATS client is reconnecting...");
			});

			/* istanbul ignore next */
			client.on("disconnect", () => {
				if (this.connected) {
					this.logger.warn("NATS client is disconnected.");
					this.connected = false;
				}
			});

			/* istanbul ignore next */
			client.on("error", e => {
				this.logger.error("NATS error.", e.message);
				this.logger.debug(e);

				if (!client.connected)
					reject(e);
			});

			/* istanbul ignore next */
			client.on("close", () => {
				this.connected = false;
				// Hint: It won't try reconnecting again, so we kill the process.
				this.broker.fatal("NATS connection closed.");
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
	/*reconnectAfterTime() {
		//this.logger.info("Reconnecting after 5 sec...");
		setTimeout(() => {
			this.connect();
		}, 5 * 1000);
	}*/

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf NatsTransporter
	 */
	subscribe(cmd, nodeID) {
		const t = this.getTopicName(cmd, nodeID);
		this.client.subscribe(t, (msg) => this.messageHandler(cmd, msg));
		return Promise.resolve();
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf NatsTransporter
	 */
	publish(packet) {
		if (!this.client) return;
		const data = packet.serialize();
		return new Promise(resolve => {
			this.client.publish(this.getTopicName(packet.type, packet.target), data, resolve);
		});
	}

}

module.exports = NatsTransporter;
