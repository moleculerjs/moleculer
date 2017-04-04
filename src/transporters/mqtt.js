/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

/**
 * Transporter for MQTT
 * 
 * @class MqttTransporter
 * @extends {Transporter}
 */
class MqttTransporter extends Transporter {

	/**
	 * Creates an instance of MqttTransporter.
	 * 
	 * @param {any} opts
	 * 
	 * @memberOf MqttTransporter
	 */
	constructor(opts) {
		super(opts);

		if (typeof this.opts == "string")
			this.opts = { mqtt: this.opts };
		
		this.client = null;
	}

	/**
	 * Connect to the server
	 * 
	 * @memberOf MqttTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let mqtt = require("mqtt");
			this.client = mqtt.connect(this.opts.mqtt);

			this.client.on("connect", () => {
				this.logger.info("MQTT connected!");
				this.connected = true;

				resolve();
			});

			/* istanbul ignore next */
			this.client.on("error", (e) => {
				this.logger.error("MQTT error", e);

				if (!this.client.connected)
					reject(e);
			});

			/* istanbul ignore next */
			this.client.on("reconnect", () => {
				this.logger.warn("MQTT reconnecting...");
			});			

			this.client.on("message", (topic, msg) => {
				const t = topic.split(".").slice(1);
				this.messageHandler(t, msg);
			});

			/* istanbul ignore next */
			this.client.on("close", () => {
				this.connected = true;
				this.logger.warn("MQTT disconnected!");
			});			
		});
	}

	/**
	 * Disconnect from the server
	 * 
	 * @memberOf MqttTransporter
	 */
	disconnect() {
		if (this.client) {
			this.client.end();
			this.client = null;
		}
	}

	/**
	 * Subscribe to a topic
	 * 
	 * @param {Array} topic 
	 * 
	 * @memberOf MqttTransporter
	 */
	subscribe(topic) {
		const t = [this.prefix].concat(topic).join(".");
		this.client.subscribe(t);
	}

	/**
	 * Publish a message on the topic
	 * 
	 * @param {String} type of packet
	 * 
	 * @memberOf MqttTransporter
	 */
	publish(packet) {
		const t = this.prefix + "." + packet.getTopic().join("."); // Faster than [].concat
		const data = packet.serialize();
		
		this.client.publish(t, data);
	}

}

module.exports = MqttTransporter;