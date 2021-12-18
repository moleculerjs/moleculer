/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Transporter = require("./base");
const { PACKET_REQUEST, PACKET_EVENT } = require("../packets");

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
		this.useLegacy = false;

		this.subscriptions = [];
	}

	/**
	 * Check the installed NATS library version. v1.x.x - legacy
	 * @returns {Boolean}
	 */
	isLibLegacy() {
		try {
			const pkg = require("nats/package.json");
			const installedVersion = pkg.version;
			this.logger.info("NATS lib version:", installedVersion);
			return installedVersion.split(".")[0] == 1;
		} catch (err) {
			this.logger.warn("Unable to detect NATS library version.", err.message);
		}
	}

	/**
	 * Init transporter
	 *
	 * @param {Transit} transit
	 * @param {Function} messageHandler
	 * @param {Function} afterConnect
	 *
	 * @memberof BaseTransporter
	 */
	init(...args) {
		super.init(...args);

		this.useLegacy = this.isLibLegacy();
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

		if (this.useLegacy) {
			return new this.broker.Promise((resolve, reject) => {
				const client = Nats.connect(this.opts);
				this._client = client; // For tests

				client.on("connect", () => {
					this.client = client;
					this.logger.info("NATS client v1 is connected.");
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

					this.broker.broadcastLocal("$transporter.error", {
						error: e,
						module: "transporter",
						type: "clientError"
					});

					if (!client.connected) reject(e);
				});

				/* istanbul ignore next */
				client.on("close", () => {
					this.connected = false;
					// Hint: It won't try reconnecting again, so we kill the process.
					this.broker.fatal("NATS connection closed.");
				});
			});
		} else {
			// NATS v2
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

					this.logger.info("NATS client v2 is connected.");

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
							type: "connection"
						});

						throw err;
					}
				);
		}
	}

	/**
	 * Disconnect from a NATS server
	 *
	 * @memberof NatsTransporter
	 */
	disconnect() {
		if (this.client) {
			if (this.useLegacy) {
				this.client.flush(() => {
					this.client.close();
					this.client = null;
				});
			} else {
				// NATS v2
				return this.client
					.flush()
					.then(() => this.client.close())
					.then(() => (this.client = null));
			}
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

		if (this.useLegacy) {
			this.client.subscribe(t, msg => this.receive(cmd, msg));
		} else {
			this.client.subscribe(t, {
				callback: (err, msg) => {
					this.receive(cmd, Buffer.from(msg.data));
				}
			});
		}

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

		if (this.useLegacy)
			this.subscriptions.push(
				this.client.subscribe(topic, { queue }, msg => this.receive(PACKET_REQUEST, msg))
			);
		else
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

		if (this.useLegacy)
			this.subscriptions.push(
				this.client.subscribe(topic, { queue: group }, msg =>
					this.receive(PACKET_EVENT, msg)
				)
			);
		else
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
		if (this.useLegacy) {
			return new this.broker.Promise(resolve => {
				this.subscriptions.forEach(uid => this.client.unsubscribe(uid));
				this.subscriptions = [];

				this.client.flush(resolve);
			});
		} else {
			// NATS v2
			this.subscriptions.forEach(sub => sub.unsubscribe());
			this.subscriptions = [];

			return this.client.flush();
		}
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

		if (this.useLegacy) {
			return new this.broker.Promise(resolve => {
				this.client.publish(topic, data, resolve);
			});
		} else {
			// NATS v2
			this.client.publish(topic, data);
			return this.broker.Promise.resolve();
		}
	}
}

module.exports = NatsTransporter;
