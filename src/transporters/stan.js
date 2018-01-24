/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const chalk				= require("chalk");
const Promise			= require("bluebird");
const Transporter 		= require("./base");
const {
	PACKET_REQUEST,
	PACKET_EVENT,
} = require("../packets");

/**
 * Transporter for NATS Streaming server
 *
 * More info: http://nats.io/
 *
 * @class StanTransporter
 * @extends {Transporter}
 */
class StanTransporter extends Transporter {

	/**
	 * Creates an instance of StanTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberOf StanTransporter
	 */
	constructor(opts) {
		if (typeof opts == "string")
			opts = { stan: { url: opts.replace("stan://", "nats://") } };

		super(opts);

		// Use the 'preserveBuffers' option as true as default
		if (!this.opts.stan || this.opts.stan.preserveBuffers !== false) {
			if (!this.opts.stan)
				this.opts.stan = {};

			this.opts.stan.preserveBuffers = true;
		}
		if (!this.opts.clusterID)
			this.opts.clusterID = "test-cluster"; // Default cluster ID in NATS Streaming server

		this.hasBuiltInBalancer = true;
		this.client = null;

		this.subscriptions = [];
	}

	/**
	 * Connect to a NATS Streaming server
	 *
	 * @memberOf StanTransporter
	 */
	connect() {
		this.logger.warn(chalk.yellow.bold("NATS Streaming Transporter is an EXPERIMENTAL transporter. Do NOT use it in production!"));

		return new Promise((resolve, reject) => {
			let Stan;
			try {
				Stan = require("node-nats-streaming");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'node-nats-streaming' package is missing! Please install it with 'npm install node-nats-streaming --save' command.", err, true);
			}
			const client = Stan.connect(this.opts.clusterID, this.nodeID, this.opts.stan);
			this._client = client; // For tests

			client.on("connect", () => {
				this.client = client;
				this.logger.info("NATS Streaming client is connected.");

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			client.on("reconnect", () => {
				this.logger.info("NATS Streaming client is reconnected.");
				this.onConnected(true);
			});

			/* istanbul ignore next */
			client.on("reconnecting", () => {
				this.logger.warn("NATS Streaming client is reconnecting...");
			});

			/* istanbul ignore next */
			client.on("disconnect", () => {
				if (this.connected) {
					this.logger.warn("NATS Streaming client is disconnected.");
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
				this.broker.fatal("NATS Streaming connection closed.");
			});
		});
	}

	/**
	 * Disconnect from a NATS Streaming server
	 *
	 * @memberOf StanTransporter
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
	 * @memberOf StanTransporter
	 */
	subscribe(cmd, nodeID) {
		const t = this.getTopicName(cmd, nodeID);

		const opts = this.client.subscriptionOptions().setStartWithLastReceived(); //.setDurableName(cmd); //No need durable
		const subscription = this.client.subscribe(t, opts);

		subscription.on("message", msg => this.messageHandler(cmd, msg.getData()));
		return Promise.resolve();
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof StanTransporter
	 */
	subscribeBalancedRequest(action) {
		const topic = `${this.prefix}.${PACKET_REQUEST}B.${action}`;
		const queue = action;

		const opts = this.client.subscriptionOptions().setDeliverAllAvailable().setDurableName(PACKET_REQUEST + "B");
		const subscription = this.client.subscribe(topic, queue, opts);

		subscription.on("message", msg => this.messageHandler(PACKET_REQUEST, msg.getData()));
		this.subscriptions.push(subscription);
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof StanTransporter
	 */
	subscribeBalancedEvent(event, group) {
		const topic = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`;

		const opts = this.client.subscriptionOptions().setDeliverAllAvailable().setDurableName(PACKET_EVENT + "B");
		const subscription = this.client.subscribe(topic, group, opts);

		subscription.on("message", msg => this.messageHandler(PACKET_EVENT, msg.getData()));
		this.subscriptions.push(subscription);
	}

	/**
	 * Unsubscribe all balanced request and event commands
	 *
	 * @memberof BaseTransporter
	 */
	unsubscribeFromBalancedCommands() {
		return new Promise(resolve => {
			this.subscriptions.forEach(sub => sub.unsubscribe());
			this.subscriptions = [];

			//this.client.flush(resolve);
			resolve();
		});
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf StanTransporter
	 */
	publish(packet) {
		if (!this.client) return Promise.resolve();

		return new Promise(resolve => {
			let topic = this.getTopicName(packet.type, packet.target);
			const payload = Buffer.from(packet.serialize());

			this.client.publish(topic, payload, resolve);
		});
	}

	/**
	 * Publish a balanced EVENT packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 * @memberof AmqpTransporter
	 */
	publishBalancedEvent(packet, group) {
		if (!this.client) return Promise.resolve();

		return new Promise(resolve => {
			let topic = `${this.prefix}.${PACKET_EVENT}B.${group}.${packet.payload.event}`;
			const payload = Buffer.from(packet.serialize());

			this.client.publish(topic, payload, resolve);
		});
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 * @memberof AmqpTransporter
	 */
	publishBalancedRequest(packet) {
		if (!this.client) return Promise.resolve();

		return new Promise(resolve => {
			const topic = `${this.prefix}.${PACKET_REQUEST}B.${packet.payload.action}`;
			const payload = Buffer.from(packet.serialize());

			this.client.publish(topic, payload, resolve);
		});
	}

}

module.exports = StanTransporter;
