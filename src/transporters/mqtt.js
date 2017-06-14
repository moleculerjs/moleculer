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
			let mqtt;
			try {
				mqtt = require("mqtt");
			} catch(err) {
				this.broker.fatal("The 'mqtt' package is missing! Please install it with 'npm install mqtt --save' command!", err, true);
			}			
			
			const client = mqtt.connect(this.opts.mqtt);
			this._client = client; // For tests

			client.on("connect", () => {
				this.client = client;
				this.logger.info("MQTT connected!");

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			client.on("error", (e) => {
				this.logger.error("MQTT error!", e.message);

				if (!client.connected)
					reject(e);
			});

			/* istanbul ignore next */
			client.on("reconnect", () => {
				this.logger.warn("MQTT reconnecting...");
			});			

			client.on("message", (topic, msg) => {
				const cmd = topic.split(".")[1];
				this.messageHandler(cmd, msg);
			});

			/* istanbul ignore next */
			client.on("close", () => {
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
	 * Subscribe to a command
	 * 
	 * @param {String} cmd 
	 * @param {String} nodeID 
	 * 
	 * @memberOf MqttTransporter
	 */
	subscribe(cmd, nodeID) {
		this.client.subscribe(this.getTopicName(cmd, nodeID));
	}

	/**
	 * Publish a packet
	 * 
	 * @param {Packet} packet
	 * 
	 * @memberOf MqttTransporter
	 */
	publish(packet) {
		const data = packet.serialize();		
		this.client.publish(this.getTopicName(packet.type, packet.target), data);
	}

}

module.exports = MqttTransporter;