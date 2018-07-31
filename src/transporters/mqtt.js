/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const Transporter = require("./base");
const {defaultsDeep, omit} = require("lodash");

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
	 * @memberof MqttTransporter
	 */
	constructor(opts) {
		opts = defaultsDeep(opts, {
			qosZero: true,
		});

		super(opts);

		this.client = null;
	}

	/**
	 * Connect to the server
	 *
	 * @memberof MqttTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let mqtt;
			try {
				mqtt = require("mqtt");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'mqtt' package is missing. Please install it with 'npm install mqtt --save' command.", err, true);
			}

			const opts = omit(this.opts, ["qosZero"]);
			const client = mqtt.connect(opts);
			this._client = client; // For tests

			client.on("connect", () => {
				this.client = client;
				this.logger.info("MQTT client is connected.");

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			client.on("error", (e) => {
				this.logger.error("MQTT error.", e.message);
				this.logger.debug(e);

				if (!client.connected)
					reject(e);
			});

			/* istanbul ignore next */
			client.on("reconnect", () => {
				this.logger.warn("MQTT client is reconnecting...");
			});

			client.on("message", (topic, msg) => {
				const cmd = topic.split(".")[1];
				this.incomingMessage(cmd, msg);
			});

			/* istanbul ignore next */
			client.on("close", () => {
				this.connected = false;
				this.logger.warn("MQTT client is disconnected.");
			});
		});
	}

	/**
	 * Disconnect from the server
	 *
	 * @memberof MqttTransporter
	 */
	disconnect() {
		if (this.client) {
			return new Promise(resolve => {
				this.client.end(false, resolve);
				this.client = null;
			});
		}
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof MqttTransporter
	 */
	subscribe(cmd, nodeID) {
		return new Promise((resolve, reject) => {
			const topic = this.getTopicName(cmd, nodeID);
			const opts = this.opts.qosZero ? {qos: 0} : {qos: 1};
			this.client.subscribe(topic, opts, err => {
				if (err)
					return reject(err);
				resolve();
			});
		});
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof MqttTransporter
	 */
	publish(packet) {
		/* istanbul ignore next*/
		if (!this.client) return;

		return new Promise((resolve, reject) => {
			const data = this.serialize(packet);
			this.incStatSent(data.length);
			const topic = this.getTopicName(packet.type, packet.target);
			const opts = this.opts.qosZero ? {qos: 0} : {qos: 1};
			this.client.publish(topic, data, opts, err => {
				/* istanbul ignore next*/
				if (err)
					return reject(err);

				resolve();
			});
		});
	}

}

module.exports = MqttTransporter;
