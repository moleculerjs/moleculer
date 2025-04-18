/*
 * moleculer
 * Copyright (c) 2024 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { MoleculerError } = require("../errors");
const Transporter = require("./base");
const { BrokerOptionsError } = require("../errors");
const C = require("../constants");
const { isObject } = require("../utils");

/**
 * Import types
 *
 * @typedef {import("./redis")} RedisTransporterClass
 * @typedef {import("./redis").RedisTransporterOptions} RedisTransporterOptions
 */

/**
 * Transporter for Redis
 *
 * @class RedisTransporter
 * @extends {Transporter}
 * @implements {RedisTransporterClass}
 */
class RedisTransporter extends Transporter {
	/**
	 * Creates an instance of RedisTransporter.
	 *
	 * @param {RedisTransporterOptions} opts
	 *
	 * @memberof RedisTransporter
	 */
	constructor(opts) {
		super(opts);

		this.clientPub = null;
		this.clientSub = null;
	}

	/**
	 * Connect to the server
	 *
	 * @memberof RedisTransporter
	 */
	connect() {
		return new this.broker.Promise((resolve, reject) => {
			let clientSub = this.getRedisClient(this.opts);
			this._clientSub = clientSub; // For tests

			clientSub.on("ready", () => {
				this.logger.info("Redis-sub client is connected.");

				let clientPub = this.getRedisClient(this.opts);
				this._clientPub = clientPub; // For tests

				clientPub.on("ready", () => {
					this.clientSub = clientSub;
					this.clientPub = clientPub;

					this.logger.info("Redis-pub client is connected.");

					this.onConnected().then(resolve);
				});

				/* istanbul ignore next */
				clientPub.on("error", e => {
					this.logger.error("Redis-pub error", e.message);
					this.logger.debug(e);

					this.broker.broadcastLocal("$transporter.error", {
						error: e,
						module: "transporter",
						type: C.FAILED_PUBLISHER_ERROR
					});

					if (!this.connected) reject(e);
				});

				/* istanbul ignore next */
				clientPub.on("close", () => {
					this.connected = false;
					this.logger.warn("Redis-pub client is disconnected.");
				});
			});

			clientSub.on("messageBuffer", (rawTopic, buf) => {
				const topic = rawTopic.toString().substring(this.prefix.length + 1);
				const cmd = topic.split(".")[0];
				this.receive(cmd, buf);
			});

			/* istanbul ignore next */
			clientSub.on("error", e => {
				this.logger.error("Redis-sub error", e.message);
				this.logger.debug(e);

				this.broker.broadcastLocal("$transporter.error", {
					error: e,
					module: "transporter",
					type: C.FAILED_CONSUMER_ERROR
				});
			});

			/* istanbul ignore next */
			clientSub.on("close", () => {
				this.connected = false;
				this.logger.warn("Redis-sub client is disconnected.");
			});
		});
	}

	/**
	 * Disconnect from the server
	 *
	 * @memberof RedisTransporter
	 */
	disconnect() {
		if (this.clientSub) {
			this.clientSub.disconnect();
			this.clientSub = null;
		}

		if (this.clientPub) {
			this.clientPub.disconnect();
			this.clientPub = null;
		}

		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof RedisTransporter
	 */
	subscribe(cmd, nodeID) {
		this.clientSub.subscribe(this.getTopicName(cmd, nodeID));
		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced action commands
	 * Not implemented.
	 *
	 * @returns {Promise}
	 */
	subscribeBalancedRequest() {
		/* istanbul ignore next */
		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced event command
	 * Not implemented.
	 *
	 * @returns {Promise}
	 */
	subscribeBalancedEvent() {
		/* istanbul ignore next */
		return this.broker.Promise.resolve();
	}

	/**
	 * Send data buffer.
	 *
	 * @param {String} topic
	 * @param {Buffer} data
	 *
	 * @returns {Promise}
	 */
	send(topic, data) {
		/* istanbul ignore next*/
		if (!this.clientPub)
			return this.broker.Promise.reject(new MoleculerError("Redis Client is not available"));

		this.clientPub.publish(topic, data);
		return this.broker.Promise.resolve();
	}

	/**
	 * Return redis or redis.cluster client
	 *
	 * @param {string|RedisTransporterOptions} opts
	 *
	 * @memberof RedisTransporter
	 */
	getRedisClient(opts) {
		let client;
		let R;
		try {
			R = require("ioredis");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'ioredis' package is missing. Please install it with 'npm install ioredis --save' command.",
				err,
				true
			);
		}
		if (isObject(opts) && opts.cluster) {
			if (!opts.cluster.nodes || opts.cluster.nodes.length === 0) {
				throw new BrokerOptionsError("No nodes defined for cluster");
			}
			this.logger.info("Setting Redis.Cluster transporter");
			client = new R.Cluster(opts.cluster.nodes, opts.cluster.clusterOptions);
		} else {
			this.logger.info("Setting Redis transporter");
			client = new R.Redis(/** @type {any} */ (opts));
		}
		return client;
	}
}

module.exports = RedisTransporter;
