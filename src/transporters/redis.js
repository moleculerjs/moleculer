/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

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
	 * @memberOf RedisTransporter
	 */
	constructor(opts) {
		super(opts);
		
		if (typeof this.opts == "string")
			this.opts = { redis: this.opts };
		
		this.clientPub = null;
		this.clientSub = null;
	}

	/**
	 * Connect to the server
	 * 
	 * @memberOf RedisTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let Redis = require("ioredis");
			this.clientSub = new Redis(this.opts.redis);
			this.clientPub = new Redis(this.opts.redis);

			this.clientSub.on("connect", () => {
				this.logger.info("Redis-sub connected!");

				this.clientPub.on("connect", () => {
					this.logger.info("Redis-pub connected!");

					this.connected = true;

					resolve();
				});
			});

			this.clientSub.on("message", (topic, msg) => {
				const t = topic.split(".").slice(1);
				this.messageHandler(t, msg);
			});

			/* istanbul ignore next */
			this.clientPub.on("error", (e) => {
				this.logger.error("Redis-pub error", e);

				if (!this.client.connected)
					reject(e);
			});

			/* istanbul ignore next */
			this.clientSub.on("error", (e) => {
				this.logger.error("Redis-sub error", e);
			});

			/* istanbul ignore next */
			this.clientSub.on("close", () => {
				this.connected = true;
				this.logger.warn("Redis-sub disconnected!");
			});		

			/* istanbul ignore next */
			this.clientPub.on("close", () => {
				this.connected = true;
				this.logger.warn("Redis-pub disconnected!");
			});			
		});
	}

	/**
	 * Disconnect from the server
	 * 
	 * @memberOf RedisTransporter
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
	 * Subscribe to a topic
	 * 
	 * @param {Array} topic 
	 * 
	 * @memberOf RedisTransporter
	 */
	subscribe(topic) {
		const t = [this.prefix].concat(topic).join(".");
		this.clientSub.subscribe(t);
	}

	/**
	 * Publish a message on the topic
	 * 
	 * @param {Array} topic 
	 * @param {String} packet 
	 * 
	 * @memberOf RedisTransporter
	 */
	publish(topic, packet) {
		const t = [this.prefix].concat(topic).join(".");
		this.clientPub.publish(t, packet);
	}

}

module.exports = RedisTransporter;