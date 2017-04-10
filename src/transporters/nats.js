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
		super(opts);
		
		if (typeof this.opts == "string")
			this.opts = { nats: this.opts };
		
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
			this.client = Nats.connect(this.opts.nats);

			this.client.on("connect", () => {
				this.logger.info("NATS connected!");
				this.connected = true;

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
				this.connected = false;
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
	}

	/**
	 * Publish a packet
	 * 
	 * @param {Packet} packet 
	 * 
	 * @memberOf NatsTransporter
	 */
	publish(packet) {
		const data = packet.serialize();
		this.client.publish(this.getTopicName(packet.type, packet.target), data);
	}

}

module.exports = NatsTransporter;