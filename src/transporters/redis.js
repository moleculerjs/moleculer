/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise				= require("bluebird");
const { MoleculerError } 	= require("../errors");
const Transporter 			= require("./base");

/**
 * Transporter for Redis
 *
 * @class RedisTransporter
 * @extends {Transporter}
 */
class RedisTransporter extends Transporter {

	/**
	 * Creates an instance of RedisTransporter.
	 *
	 * @param {any} opts
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
		return new Promise((resolve, reject) => {
			let Redis;
			try {
				Redis = require("ioredis");
				Redis.Promise = Promise;
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'ioredis' package is missing. Please install it with 'npm install ioredis --save' command.", err, true);
			}

			const clientSub = new Redis(this.opts);
			this._clientSub = clientSub; // For tests

			clientSub.on("connect", () => {
				this.logger.info("Redis-sub client is connected.");

				const clientPub = new Redis(this.opts);
				this._clientPub = clientPub; // For tests

				clientPub.on("connect", () => {
					this.clientSub = clientSub;
					this.clientPub = clientPub;

					this.logger.info("Redis-pub client is connected.");

					this.onConnected().then(resolve);
				});

				/* istanbul ignore next */
				clientPub.on("error", (e) => {
					this.logger.error("Redis-pub error", e.message);
					this.logger.debug(e);

					if (!this.connected)
						reject(e);
				});

				/* istanbul ignore next */
				clientPub.on("close", () => {
					this.connected = false;
					this.logger.warn("Redis-pub client is disconnected.");
				});
			});

			clientSub.on("messageBuffer", (topicBuf, buf) => {
				const topic = topicBuf.toString();
				const cmd = topic.split(".")[1];
				this.incomingMessage(cmd, buf);
			});

			/* istanbul ignore next */
			clientSub.on("error", (e) => {
				this.logger.error("Redis-sub error", e.message);
				this.logger.debug(e);
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
		return Promise.resolve();
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof RedisTransporter
	 */
	publish(packet) {
		/* istanbul ignore next*/
		if (!this.clientPub) return Promise.reject(new MoleculerError("Redis Client is not available"));

		const data = this.serialize(packet);
		this.incStatSent(data.length);
		this.clientPub.publish(this.getTopicName(packet.type, packet.target), data);
		return Promise.resolve();
	}

}

module.exports = RedisTransporter;
