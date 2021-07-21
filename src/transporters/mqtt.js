/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Transporter = require("./base");
const { isObject } = require("lodash");

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
		super(opts);

		this.qos = 0;
		this.topicSeparator = ".";

		if (isObject(this.opts)) {
			if (this.opts.qos !== undefined) {
				this.qos = this.opts.qos;
				delete this.opts.qos;
			}
			if (this.opts.topicSeparator !== undefined) {
				this.topicSeparator = this.opts.topicSeparator;
				delete this.opts.topicSeparator;
			}
		}

		this.client = null;
	}

	/**
	 * Connect to the server
	 *
	 * @memberof MqttTransporter
	 */
	connect() {
		return new this.broker.Promise((resolve, reject) => {
			let mqtt;
			try {
				mqtt = require("mqtt");
			} catch (err) {
				/* istanbul ignore next */
				this.broker.fatal(
					"The 'mqtt' package is missing. Please install it with 'npm install mqtt --save' command.",
					err,
					true
				);
			}

			const client = mqtt.connect(this.opts);
			this._client = client; // For tests

			client.on("connect", () => {
				this.client = client;
				this.logger.info("MQTT client is connected.");

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			client.on("error", e => {
				this.logger.error("MQTT error.", e.message);
				this.logger.debug(e);

				if (!client.connected) reject(e);
			});

			/* istanbul ignore next */
			client.on("reconnect", () => {
				this.logger.warn("MQTT client is reconnecting...");
			});

			client.on("message", (rawTopic, buf) => {
				const topic = rawTopic.substring(this.prefix.length + this.topicSeparator.length);
				const cmd = topic.split(this.topicSeparator)[0];
				this.receive(cmd, buf);
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
			return new this.broker.Promise(resolve => {
				this.client.end(false, resolve);
				this.client = null;
			});
		}
	}

	/**
	 * Get topic name from command & target nodeID
	 *
	 * @param {any} cmd
	 * @param {any} nodeID
	 *
	 * @memberof MqttTransporter
	 */
	getTopicName(cmd, nodeID) {
		return (
			this.prefix + this.topicSeparator + cmd + (nodeID ? this.topicSeparator + nodeID : "")
		);
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
		return new this.broker.Promise((resolve, reject) => {
			const topic = this.getTopicName(cmd, nodeID);
			this.client.subscribe(topic, { qos: this.qos }, (err, granted) => {
				if (err) return reject(err);

				this.logger.debug("MQTT server granted", granted);

				resolve();
			});
		});
	}

	/**
	 * Send data buffer.
	 *
	 * @param {String} topic
	 * @param {Buffer} data
	 * @param {Object} meta
	 *
	 * @returns {Promise}
	 */
	send(topic, data) {
		/* istanbul ignore next*/
		if (!this.client) return;

		return new this.broker.Promise((resolve, reject) => {
			this.client.publish(topic, data, { qos: this.qos }, err => {
				/* istanbul ignore next*/
				if (err) return reject(err);

				resolve();
			});
		});
	}
}

module.exports = MqttTransporter;
