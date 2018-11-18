/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const url = require("url");
const Promise		= require("bluebird");
const Transporter 	= require("./base");
const { isPromise }	= require("../utils");

const {
	PACKET_REQUEST,
	PACKET_RESPONSE,
	PACKET_UNKNOW,
	PACKET_EVENT,
	PACKET_DISCOVER,
	PACKET_INFO,
	PACKET_DISCONNECT,
	PACKET_HEARTBEAT,
	PACKET_PING,
	PACKET_PONG,
} = require("../packets");

/**
 * Transporter for AMQP
 *
 * More info: https://www.amqp.org/
 *
 * For test:
 *
 * 	 docker run -d -p 5672:5672 -p 15672:15672 --name rabbit rabbitmq:3-management
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
	 * @memberof AmqpTransporter
	 */
	constructor(opts) {
		if (typeof opts === "string")
			opts = { url: opts };
		else if (opts == null)
			opts = {};

		// Number of requests a broker will handle concurrently
		if (typeof opts.prefetch !== "number")
			opts.prefetch = 1;

		// Number of milliseconds before an event expires
		if (typeof opts.eventTimeToLive !== "number")
			opts.eventTimeToLive = null;

		if (typeof opts.heartbeatTimeToLive !== "number")
			opts.heartbeatTimeToLive = null;

		if (typeof opts.queueOptions !== "object")
			opts.queueOptions = {};

		if (typeof opts.exchangeOptions !== "object")
			opts.exchangeOptions = {};

		if (typeof opts.messageOptions !== "object")
			opts.messageOptions = {};

		if (typeof opts.consumeOptions !== "object")
			opts.consumeOptions = {};

		opts.autoDeleteQueues =
			opts.autoDeleteQueues === true ? 2*60*1000 :
				typeof opts.autoDeleteQueues === "number" ? opts.autoDeleteQueues :
					opts.autoDeleteQueues === false ? -1 :
						-1; // Eventually we could change default

		// Support for multiple URLs (clusters)
		opts.url = Array.isArray(opts.url)
			? opts.url
			: !opts.url
				? [""]
				: opts.url.split(";").filter(s => !!s);

		super(opts);

		this.hasBuiltInBalancer = true;
		this.connection = null;
		this.channel = null;
		this.bindings = [];

		this.channelDisconnecting = false;
		this.connectionDisconnecting = false;
	}

	/**
	 * Connect to a AMQP server
	 *
	 * @memberof AmqpTransporter
	 */
	connect(errorCallback) {
		return new Promise((_resolve, _reject) => {
			let _isResolved = false;
			const resolve = () => {
				_isResolved = true;
				_resolve();
			};
			const reject = (err) => {
				_reject(err);
				if (_isResolved) errorCallback(err);
			};

			let amqp;
			try {
				amqp = require("amqplib");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'amqplib' package is missing. Please install it with 'npm install amqplib --save' command.", err, true);
			}

			// Pick url
			this.connectAttempt = (this.connectAttempt||0)+1;
			const urlIndex = (this.connectAttempt-1) % this.opts.url.length;
			const uri = this.opts.url[urlIndex];
			const urlParsed = url.parse(uri);

			amqp.connect(uri, Object.assign({},
				(this.opts.socketOptions || {}),
				{ servername: urlParsed.hostname }
			))
				.then(connection => {
					this.connection = connection;
					this.logger.info("AMQP is connected.");

					/* istanbul ignore next*/
					connection
						.on("error", (err) => {
							// No need to reject here since close event will be fired after
							// if not connected at all connection promise will be rejected
							// this.connected = false;
							// reject(err);
							this.logger.error("AMQP connection error.", err);
						})
						.on("close", (err) => {
							this.connected = false;
							if (!this.connectionDisconnecting) {
								this.logger.error("AMQP connection is closed.");
								reject(err);
							} else {
								this.logger.info("AMQP connection is closed gracefully.");
							}
						})
						.on("blocked", (reason) => {
							this.logger.warn("AMQP connection is blocked.", reason);
						})
						.on("unblocked", () => {
							this.logger.info("AMQP connection is unblocked.");
						});

					connection
						.createChannel()
						.then((channel) => {
							this.channel = channel;
							this.logger.info("AMQP channel is created.");

							channel.prefetch(this.opts.prefetch);

							/* istanbul ignore next*/
							channel
								.on("close", () => {
									this.channel = null;
									// No need to reject here since close event on connection will handle
									// this.connected = false;
									// reject();
									if (!this.channelDisconnecting)
										this.logger.warn("AMQP channel is closed.");
									else
										this.logger.info("AMQP channel is closed gracefully.");
								})
								.on("error", (err) => {
									// No need to reject here since close event will be fired after
									// this.connected = false;
									// reject(err);
									this.logger.error("AMQP channel error.", err);
								})
								.on("drain", () => {
									this.logger.info("AMQP channel is drained.");
								})
								.on("return", (msg) => {
									this.logger.warn("AMQP channel returned a message.", msg);
								});

							return this.onConnected();
						})
						.then(resolve)
						.catch((err) => {
							/* istanbul ignore next*/
							this.logger.error("AMQP failed to create channel.");
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
	 * Disconnect from an AMQP server
	 *
	 * @memberof AmqpTransporter
	 * @description Close the connection and unbind this node's queues.
	 * This prevents messages from being broadcasted to a dead node.
	 * Note: Some methods of ending a node process don't allow disconnect to fire, meaning that
	 * some dead nodes could still receive published packets.
	 * Queues and Exchanges are not be deleted since they could contain important messages.
	 */
	disconnect() {
		if (this.connection && this.channel && this.bindings) {
			return Promise.all(this.bindings.map(binding => this.channel.unbindQueue(...binding)))
				.then(() => {
					this.channelDisconnecting = this.transit.disconnecting;
					this.connectionDisconnecting = this.transit.disconnecting;
				})
				.then(() => this.channel.close())
				.then(() => this.connection.close())
				.then(() => {
					this.bindings = [];
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
	 * @memberof AmqpTransporter
	 */
	_getQueueOptions(packetType, balancedQueue) {
		let packetOptions;
		switch(packetType) {
			// Requests and responses don't expire.
			case PACKET_REQUEST:
				packetOptions = this.opts.autoDeleteQueues >= 0 && !balancedQueue
					? { expires: this.opts.autoDeleteQueues }
					: {};
				break;
			case PACKET_RESPONSE:
				packetOptions = this.opts.autoDeleteQueues >= 0
					? { expires: this.opts.autoDeleteQueues }
					: {};
				break;

			// Consumers can decide how long events live
			// Load-balanced/grouped events
			case PACKET_EVENT + "LB":
			case PACKET_EVENT:
				packetOptions = this.opts.autoDeleteQueues >= 0
					? { expires: this.opts.autoDeleteQueues }
					: {};
				// If eventTimeToLive is specified, add to options.
				if (this.opts.eventTimeToLive)
					packetOptions.messageTtl = this.opts.eventTimeToLive;
				break;

			// Packet types meant for internal use
			case PACKET_HEARTBEAT:
				packetOptions = { autoDelete: true };
				// If heartbeatTimeToLive is specified, add to options.
				if (this.opts.heartbeatTimeToLive)
					packetOptions.messageTtl = this.opts.heartbeatTimeToLive;
				break;
			case PACKET_DISCOVER:
			case PACKET_DISCONNECT:
			case PACKET_UNKNOW:
			case PACKET_INFO:
			case PACKET_PING:
			case PACKET_PONG:
				packetOptions = { autoDelete: true };
				break;
		}

		return Object.assign(packetOptions, this.opts.queueOptions);
	}

	/**
	 * Build a function to handle requests.
	 *
	 * @param {String} cmd
	 * @param {Boolean} needAck
	 *
	 * @memberof AmqpTransporter
	 */
	_consumeCB(cmd, needAck = false) {
		return (msg) => {
			const result = this.incomingMessage(cmd, msg.content);

			// If a promise is returned, acknowledge the message after it has resolved.
			// This means that if a worker dies after receiving a message but before responding, the
			// message won't be lost and it can be retried.
			if(needAck) {
				if (isPromise(result)) {
					return result
						.then(() => {
							if (this.channel)
								this.channel.ack(msg);
						})
						.catch(err => {
							this.logger.error("Message handling error.", err);
							if (this.channel)
								this.channel.nack(msg);
						});
				} else if (this.channel) {
					this.channel.ack(msg);
				}
			}

			return result;
		};
	}


	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof AmqpTransporter
	 * @description Initialize queues and exchanges for all packet types except Request.
	 *
	 * All packets that should reach multiple nodes have a dedicated qeuue per node, and a single
	 * exchange that routes each message to all queues. These packet types will not use
	 * acknowledgements and have a set time-to-live. The time-to-live for EVENT packets can be
	 * configured in options.
	 * Examples: INFO (sometimes), DISCOVER, DISCONNECT, HEARTBEAT, PING, PONG, EVENT
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

		// Some topics are specific to this node already, in these cases we don't need an exchange.
		if (nodeID != null) {
			const needAck = [PACKET_REQUEST].indexOf(cmd) !== -1;

			return this.channel.assertQueue(topic, this._getQueueOptions(cmd))
				.then(() => this.channel.consume(
					topic,
					this._consumeCB(cmd, needAck),
					Object.assign({ noAck: !needAck }, this.opts.consumeOptions)
				));

		} else {
			// Create a queue specific to this nodeID so that this node can receive broadcasted messages.
			const queueName = `${this.prefix}.${cmd}.${this.nodeID}`;

			// Save binding arguments for easy unbinding later.
			const bindingArgs = [queueName, topic, ""];
			this.bindings.push(bindingArgs);

			return Promise.all([
				this.channel.assertExchange(topic, "fanout", this.opts.exchangeOptions),
				this.channel.assertQueue(queueName, this._getQueueOptions(cmd)),
			])
				.then(() => Promise.all([
					this.channel.bindQueue(...bindingArgs),
					this.channel.consume(
						queueName,
						this._consumeCB(cmd),
						Object.assign({ noAck: true }, this.opts.consumeOptions)
					)
				]));
		}
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedRequest(action) {
		const queue = `${this.prefix}.${PACKET_REQUEST}B.${action}`;
		return this.channel.assertQueue(queue, this._getQueueOptions(PACKET_REQUEST, true))
			.then(() => this.channel.consume(
				queue,
				this._consumeCB(PACKET_REQUEST, true),
				this.opts.consumeOptions
			));
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedEvent(event, group) {
		const queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`;
		return this.channel.assertQueue(queue, this._getQueueOptions(PACKET_EVENT + "LB", true))
			.then(() => this.channel.consume(
				queue,
				this._consumeCB(PACKET_EVENT, true),
				this.opts.consumeOptions
			));
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof AmqpTransporter
	 * @description Send packets to their intended queues / exchanges.
	 *
	 * Reasonings documented in the subscribe method.
	 */
	publish(packet) {
		/* istanbul ignore next*/
		if (!this.channel) return Promise.resolve();

		let topic = this.getTopicName(packet.type, packet.target);
		const data = this.serialize(packet);

		this.incStatSent(data.length);
		if (packet.target != null) {
			this.channel.sendToQueue(topic, data, this.opts.messageOptions);
		} else {
			this.channel.publish(topic, "", data, this.opts.messageOptions);
		}

		return Promise.resolve();
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
		/* istanbul ignore next*/
		if (!this.channel) return Promise.resolve();

		let queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${packet.payload.event}`;
		const data = this.serialize(packet);
		this.incStatSent(data.length);
		this.channel.sendToQueue(queue, data, this.opts.messageOptions);
		return Promise.resolve();
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 * @memberof AmqpTransporter
	 */
	publishBalancedRequest(packet) {
		/* istanbul ignore next*/
		if (!this.channel) return Promise.resolve();

		const topic = `${this.prefix}.${PACKET_REQUEST}B.${packet.payload.action}`;

		const data = this.serialize(packet);
		this.incStatSent(data.length);
		this.channel.sendToQueue(topic, data, this.opts.messageOptions);
		return Promise.resolve();
	}
}

module.exports = AmqpTransporter;
