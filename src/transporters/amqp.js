/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");
const {
	PACKET_REQUEST,
	PACKET_RESPONSE,
	PACKET_UNKNOW,
	PACKET_EVENT,
	PACKET_DISCOVER,
	PACKET_INFO,
	PACKET_DISCONNECT,
	PACKET_HEARTBEAT,
} = require("../packets");

/**
 * Transporter for AMQP
 *
 * More info: https://www.amqp.org/
 *
 * @class AmqpTransporter
 * @extends {Transporter}
 */
class AmqpTransporter extends Transporter {

	/**
	 * Creates an instance of AmqpTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberOf AmqpTransporter
	 */
	constructor(opts) {
		if (typeof opts === "string")
			opts = { amqp: { url: opts } };

		// Number of requests a broker will handle concurrently
		if (typeof opts.amqp.prefetch !== "number")
			opts.amqp.prefetch = 1;

		// Number of milliseconds before an event expires
		if (typeof opts.amqp.eventTimeToLive !== "number")
			opts.amqp.eventTimeToLive = 5000;

		super(opts);

		this.connection = null;
		this.channel = null;
		this.bindings = [];
	}

	/**
	 * Connect to a AMQP server
	 *
	 * @memberOf AmqpTransporter
	 */
	connect() {
		return new Promise((resolve, reject) => {
			let amqp;
			try {
				amqp = require("amqplib");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'amqplib' package is missing! Please install it with 'npm install amqplib --save' command!", err, true);
			}

			amqp.connect(this.opts.amqp.url)
				.then(connection => {
					this.connection = connection;
					this.logger.info("AMQP connected!");

					/* istanbul ignore next*/
					connection
						.on("error", (err) => {
							this.connected = false;
							reject(err);
							this.logger.error("AMQP connection error!");
						})
						.on("close", (err) => {
							this.connected = false;
							reject(err);
							this.logger.error("AMQP connection closed!");
						})
						.on("blocked", (reason) => {
							this.logger.warn("AMQP connection blocked!", reason);
						})
						.on("unblocked", () => {
							this.logger.info("AMQP connection unblocked!");
						});

					connection
						.createChannel()
						.then((channel) => {
							this.channel = channel;
							this.onConnected().then(resolve);
							this.logger.info("AMQP channel created!");

							channel.prefetch(this.opts.amqp.prefetch);

							/* istanbul ignore next*/
							channel
								.on("close", () => {
									this.connected = false;
									reject();
									this.logger.warn("AMQP channel closed!");
								})
								.on("error", (err) => {
									this.connected = false;
									reject(err);
									this.logger.error("AMQP channel error!");
								})
								.on("drain", () => {
									this.logger.info("AMQP channel drained!");
								})
								.on("return", (msg) => {
									this.logger.info("AMQP channel returned a message!", msg);
								});
						})
						.catch((err) => {
							/* istanbul ignore next*/
							this.logger.error("AMQP failed to create channel!");
							this.connected = false;
							reject(err);
						});
				})
				.catch((err) => {
					/* istanbul ignore next*/
					this.logger.warn("AMQP failed to connect!");
					this.connected = false;
					reject(err);
				});
		});
	}

	/**
	 * Disconnect from a AMQP server
	 *
	 * @memberOf AmqpTransporter
	 * @description Close the connection and unbind this node's queues.
	 * This prevents messages from being broadcasted to a dead node.
	 * Note: Some methods of ending a node process don't allow disconnect to fire, meaning that
	 * some dead nodes could still receive published packets.
	 * Queues and Exchanges are not be deleted since they could contain important messages.
	 */
	disconnect() {
		if (this.connection && this.channel && this.bindings) {
			return Promise.all(this.bindings.map(binding => this.channel.unbindQueue(...binding)))
				.then(() => this.channel.close())
				.then(() => this.connection.close())
				.then(() => {
					this.bindings = null;
					this.channel = null;
					this.connection = null;
				})
				.catch(err => this.logger.warn(err));
		}
	}

	/**
	 * Get assertQueue options by packet type.
	 *
	 * @param {String} packetType
	 *
	 * @memberOf AmqpTransporter
	 */
	_getQueueOptions(packetType) {
		switch(packetType) {
			// Requests and responses don't expire.
			case PACKET_REQUEST:
			case PACKET_RESPONSE:
				return {};
			// Packet types meant for internal use will expire after 5 seconds.
			case PACKET_DISCOVER:
			case PACKET_DISCONNECT:
			case PACKET_UNKNOW:
			case PACKET_INFO:
			case PACKET_HEARTBEAT:
				return { messageTtl: 5000, autoDelete: true };
			// Consumers can decide how long events live. Defaults to 5 seconds.
			case PACKET_EVENT:
				return { messageTtl: this.opts.amqp.eventTimeToLive, autoDelete: true };
		}
	}

	/**
	 * Build a function to handle requests.
	 *
	 * @param {String} cmd
	 *
	 * @memberOf AmqpTransporter
	 */
	_consumeCB(cmd) {
		return (msg) => {
			const result = this.messageHandler(cmd, msg.content);

			// If a promise is returned, acknowledge the message after it has resolved.
			// This means that if a worker dies after receiving a message but before responding, the
			// message won't be lost and it can be retried.
			if(cmd === PACKET_REQUEST) {
				if (result instanceof Promise) {
					return result.then(() => this.channel.ack(msg));
				} else {
					this.channel.ack(msg);
				}
			}
		};
	}


	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf AmqpTransporter
	 * @description Initialize queues and exchanges for all packet types except Request.
	 *
	 * All packets that should reach multiple nodes have a dedicated qeuue per node, and a single
	 * exchange that routes each message to all queues. These packet types will not use
	 * acknowledgements and have a set time-to-live. The time-to-live for EVENT packets can be
	 * configured in options.
	 * Examples: INFO (sometimes), DISCOVER, DISCONNECT, HEARTBEAT, EVENT
	 *
	 * Other Packets are headed towards a specific node or queue. These don't need exchanges and
	 * packets of this type will not expire.
	 * Examples: REQUEST, RESPONSE
	 *
	 * RESPONSE: Each node has its own dedicated queue and acknowledgements will not be used.
	 *
	 * REQUEST: Each action has its own dedicated queue. This way if an action has multiple workers,
	 * they can all pull from the same qeuue. This allows a message to be retried by a different node
	 * if one dies before responding.
	 *
	 * Note: Queue's for REQUEST packet types are not initialized in the subscribe method because the
	 * actions themselves are not available from within the method. Instead they are intercepted from
	 * "prefix.INFO" packets because they are broadcast whenever a service is registered.
	 *
	 */
	subscribe(cmd, nodeID) {
		if (!this.channel) return;

		const topic = this.getTopicName(cmd, nodeID);

		// Safer version of `if (topic.includes(nodeID))`.
		// Some topics are specific to this node already, in these cases we don't need an exchange.
		if ((cmd === PACKET_INFO && topic !== `${this.prefix}.${PACKET_INFO}`) || cmd === PACKET_RESPONSE) {
			return this.channel.assertQueue(topic, this._getQueueOptions(cmd))
				.then(() => this.channel.consume(topic, this._consumeCB(cmd), { noAck: true }));

		} else if (cmd !== PACKET_REQUEST) {
			// Create a queue specific to this nodeID so that this node can receive broadcasted messages.
			const queueName = `${this.prefix}.${cmd}.${this.nodeID}`;

			// Save binding arguments for easy unbinding later.
			const bindingArgs = [queueName, topic, ""];
			this.bindings.push(bindingArgs);

			return Promise.all([
				this.channel.assertExchange(topic, "fanout"),
				this.channel.assertQueue(queueName, this._getQueueOptions(cmd)),
			])
				.then(() => Promise.all([
					this.channel.bindQueue(...bindingArgs),
					this.channel.consume(queueName, this._consumeCB(cmd), { noAck: true })
				]));
		}
	}

	/**
	 * Initialize queues for REQUEST packets.
	 *
	 * @memberOf AmqpTransporter
	 */
	_makeServiceSpecificSubscriptions() {
		const services = this.transit.getNodeInfo().services;
		return Promise.all(services.map(schema => {
			if (typeof schema.actions !== "object") return Promise.resolve();

			const genericToService = `${this.prefix}.${PACKET_REQUEST}`;

			return Promise.all(
				Object.keys(schema.actions)
					.map((action) => {
						const queue = `${genericToService}.${action}`;
						return this.channel.assertQueue(queue, this._getQueueOptions(PACKET_REQUEST))
							.then(() => this.channel.consume(queue, this._consumeCB(PACKET_REQUEST)));
					})
			);
		}));
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf AmqpTransporter
	 * @description Send packets to their intended queues / exchanges.
	 *
	 * Reasonings documented in the subscribe method.
	 */
	publish(packet) {
		if (!this.channel) return;

		const topic = this.getTopicName(packet.type, packet.target);
		const payload = Buffer.from(packet.serialize());

		let destination = packet.type === PACKET_REQUEST
			?	`${this.prefix}.${packet.type}.${packet.payload.action}`
			: topic;

		if ((packet.type === PACKET_INFO && topic !== `${this.prefix}.${PACKET_INFO}`)
			|| packet.type === PACKET_REQUEST
			|| packet.type === PACKET_RESPONSE)
			this.channel.sendToQueue(destination, payload);
		else
			this.channel.publish(destination, "", payload);

		// HACK: This is the best way I have found to obtain the broker's services.
		if (destination === `${this.prefix}.${PACKET_INFO}`) {
			return this._makeServiceSpecificSubscriptions();
		}
		return Promise.resolve();
	}
}

module.exports = AmqpTransporter;
