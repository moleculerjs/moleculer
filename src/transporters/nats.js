/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Transporter = require("./base");
const { PACKET_REQUEST, PACKET_EVENT } = require("../packets");
const C = require("../constants");

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
	 * @memberof NatsTransporter
	 */
	constructor(opts) {
		if (typeof opts == "string") opts = { url: opts };

		super(opts);

		if (!this.opts) this.opts = {};

		// Use the 'preserveBuffers' option as true as default
		if (this.opts.preserveBuffers !== false) this.opts.preserveBuffers = true;

		if (this.opts.maxReconnectAttempts == null) this.opts.maxReconnectAttempts = -1;

		this.hasBuiltInBalancer = true;
		this.client = null;

		this.subscriptions = [];
	}

	/**
	 * Connect to a NATS server
	 *
	 * @memberof NatsTransporter
	 */
	connect() {
		let Nats;
		try {
			Nats = require("nats");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'nats' package is missing! Please install it with 'npm install nats --save' command.",
				err,
				true
			);
		}

		if (this.opts.url) {
			Object.assign(
				this.opts,
				this.opts.url.split(",").reduce((acc, cur) => {
					const url = new URL(cur);

					acc.servers = Array.isArray(acc.servers)
						? acc.servers.concat(url.host)
						: [url.host];
					acc.user = acc.user || url.username || undefined;
					acc.pass = acc.pass || url.password || undefined;

					return acc;
				}, Object.create(null))
			);
		}

		return Nats.connect(this.opts)
			.then(client => {
				this.client = client;

				this.logger.info("NATS client is connected.");

				(async () => {
					for await (const s of this.client.status()) {
						this.logger.debug(`NATS client ${s.type}: ${s.data}`);
					}
				})().then();

				client.closed().then(() => {
					this.connected = false;
					this.logger.info("NATS connection closed.");
				});

				return this.onConnected();
			})
			.catch(
				/* istanbul ignore next */ err => {
					this.logger.error("NATS error.", err.message);
					this.logger.debug(err);

					this.broker.broadcastLocal("$transporter.error", {
						error: err,
						module: "transporter",
						type: C.CLIENT_ERROR
					});

					throw err;
				}
			);
	}

	/**
	 * Disconnect from a NATS server
	 *
	 * @memberof NatsTransporter
	 */
	disconnect() {
		if (this.client) {
			return this.client
				.flush()
				.then(() => this.client.close())
				.then(() => (this.client = null));
		}
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof NatsTransporter
	 */
	subscribe(cmd, nodeID) {
		const t = this.getTopicName(cmd, nodeID);

		this.client.subscribe(t, {
			callback: (err, msg) => {
				this.receive(cmd, Buffer.from(msg.data));
			}
		});

		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof NatsTransporter
	 */
	subscribeBalancedRequest(action) {
		const topic = `${this.prefix}.${PACKET_REQUEST}B.${action}`;
		const queue = action;

		this.subscriptions.push(
			this.client.subscribe(topic, {
				queue,
				callback: (err, msg) => this.receive(PACKET_REQUEST, Buffer.from(msg.data))
			})
		);
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof NatsTransporter
	 */
	subscribeBalancedEvent(event, group) {
		const topic = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`.replace(/\*\*.*$/g, ">");

		this.subscriptions.push(
			this.client.subscribe(topic, {
				queue: group,
				callback: (err, msg) => this.receive(PACKET_EVENT, Buffer.from(msg.data))
			})
		);
	}

	/**
	 * Unsubscribe all balanced request and event commands
	 *
	 * @memberof BaseTransporter
	 */
	unsubscribeFromBalancedCommands() {
		this.subscriptions.forEach(sub => sub.unsubscribe());
		this.subscriptions = [];

		return this.client.flush();
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
		if (!this.client) return this.broker.Promise.resolve();

		this.client.publish(topic, data);
		return this.broker.Promise.resolve();
	}
}

module.exports = NatsTransporter;
