/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const url = require("url");
const Promise = require("bluebird");
const Transporter = require("./base");
const { isPromise } = require("../utils");

const {
	PACKET_REQUEST,
	PACKET_RESPONSE,
	PACKET_UNKNOWN,
	PACKET_EVENT,
	PACKET_DISCOVER,
	PACKET_INFO,
	PACKET_DISCONNECT,
	PACKET_HEARTBEAT,
	PACKET_PING,
	PACKET_PONG
} = require("../packets");

/**
 * Transporter for AMQP 1.0
 *
 * More info: https://www.amqp.org/resources/specifications
 *
 * @class Amqp10Transporter
 * @extends {Transporter}
 */
class Amqp10Transporter extends Transporter {
	/**
	 * Creates an instance of Amqp10Transporter.
	 *
	 * @param {any} opts
	 *
	 * @memberof Amqp10Transporter
	 */
	constructor(opts) {
		if (typeof opts == "string") opts = { url: opts };

		super(opts);

		if (!this.opts) this.opts = {};

		// Number of requests a broker will handle concurrently
		if (typeof opts.prefetch !== "number") opts.prefetch = 1;

		this.receivers = [];
		this.hasBuiltInBalancer = true;
		this.connection = null;
	}

	_getQueueOptions(packetType, balancedQueue) {
		let packetOptions = {};
		switch (packetType) {
			// Requests and responses don't expire.
			case PACKET_REQUEST:
				packetOptions = this.opts.autoDeleteQueues && !balancedQueue ? { source: { dynamic: this.opts.autoDeleteQueues } } : {};
				break;
			case PACKET_RESPONSE:
				packetOptions = this.opts.autoDeleteQueues ? { source: { dynamic: this.opts.autoDeleteQueues } } : {};
				break;

			// Consumers can decide how long events live
			// Load-balanced/grouped events
			case PACKET_EVENT + "LB":
			case PACKET_EVENT:
				packetOptions = this.opts.autoDeleteQueues ? { source: { dynamic: this.opts.autoDeleteQueues } } : {};
				break;

			// Packet types meant for internal use
			case PACKET_HEARTBEAT:
				packetOptions = { source: { dynamic: true } };
				break;
			case PACKET_DISCOVER:
			case PACKET_DISCONNECT:
			case PACKET_UNKNOWN:
			case PACKET_INFO:
			case PACKET_PING:
			case PACKET_PONG:
				packetOptions = { source: { dynamic: true } };
				break;
		}

		return Object.assign(packetOptions, this.opts.queueOptions);
	}

	_getMessageOptions(packetType, balancedQueue) {
		let messageOptions = {};
		switch (packetType) {
			case PACKET_REQUEST:
			case PACKET_RESPONSE:
				break;
			case PACKET_EVENT + "LB":
			case PACKET_EVENT:
				if (this.opts.eventTimeToLive) messageOptions.ttl = this.opts.eventTimeToLive;
				break;
			case PACKET_HEARTBEAT:
				if (this.opts.heartbeatTimeToLive) messageOptions.ttl = this.opts.heartbeatTimeToLive;
				break;
			case PACKET_DISCOVER:
			case PACKET_DISCONNECT:
			case PACKET_UNKNOWN:
			case PACKET_INFO:
			case PACKET_PING:
			case PACKET_PONG:
				break;
		}

		return Object.assign(messageOptions, this.opts.messageOptions);
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
		return async ({ message, delivery }) => {
			const result = this.incomingMessage(cmd, message.body);

			if (needAck) {
				if (isPromise(result)) {
					return result
						.then(() => {
							if (this.connection) {
								delivery.accept();
							}
						})
						.catch(err => {
							this.logger.error("Message handling error.", err);
							if (this.connection) {
								delivery.reject();
							}
						});
				} else {
					if (this.connection) {
						delivery.accept();
					}
				}
			}

			return result;
		};
	}

	/**
	 * Connect to a AMQP 1.0 server
	 *
	 * @memberof Amqp10Transporter
	 */
	async connect(errorCallback) {
		let rhea;

		try {
			rhea = require("rhea-promise");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'rhea-promise' package is missing. Please install it with 'npm install rhea-promise --save' command.",
				err,
				true
			);
		}

		if (!rhea) {
			this.broker.fatal("Missing rhea package", new Error("Missing rhea package"), true);
		}

		// Pick url
		const uri = this.opts.url;
		const urlParsed = url.parse(uri);
		const username = urlParsed.auth ? urlParsed.auth.split(":")[0] : undefined;
		const password = urlParsed.auth ? urlParsed.auth.split(":")[1] : undefined;
		const connectionOptions = {
			host: urlParsed.hostname,
			hostname: urlParsed.hostname,
			username,
			password,
			port: urlParsed.port || 5672,
			container_id: rhea.generate_uuid()
		};
		const container = new rhea.Container();
		const connection = container.createConnection(connectionOptions);
		try {
			this.connection = await connection.open();
			this.logger.info("AMQP10 is connected.");
			this.connected = true;
			this.connection._connection.setMaxListeners(100);
			await this.onConnected();
		} catch (e) {
			this.logger.info("AMQP10 is disconnected.");
			this.connected = false;

			if (e) {
				this.logger.error(e);
				errorCallback && errorCallback(e);
			}
		}
	}

	/**
	 * Disconnect from an AMQP10 server
	 *
	 * @memberof Amqp10Transporter
	 */
	async disconnect() {
		try {
			if (this.connection) {
				this.receivers.forEach(async receiver => {
					await receiver.close();
				});
				await this.connection.close();
				this.connection = null;
				this.receivers = [];
			}
		} catch (error) {
			this.logger.error(error);
		}
	}

	async subscribe(cmd, nodeID) {
		if (!this.connection) return;

		const topic = this.getTopicName(cmd, nodeID);
		let receiverOptions = this._getQueueOptions(cmd);

		if (nodeID) {
			const needAck = [PACKET_REQUEST].indexOf(cmd) !== -1;
			Object.assign(receiverOptions, {
				credit_window: 0,
				autoaccept: !needAck,
				name: topic,
				source: {
					address: topic
				}
			});

			const receiver = await this.connection.createReceiver(receiverOptions);
			receiver.addCredit(this.opts.prefetch);

			receiver.on("message", async context => {
				await this._consumeCB(cmd, needAck)(context);
				receiver.addCredit(1);
			});

			this.receivers.push(receiver);
		} else {
			const topicName = `topic://${topic}`;
			Object.assign(receiverOptions, {
				name: topicName,
				source: {
					address: topicName
				}
			});
			const receiver = await this.connection.createReceiver(receiverOptions);

			receiver.on("message", context => {
				this._consumeCB(cmd, false)(context);
			});

			this.receivers.push(receiver);
		}
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof AmqpTransporter
	 */
	async subscribeBalancedRequest(action) {
		const queue = `${this.prefix}.${PACKET_REQUEST}B.${action}`;
		const receiverOptions = Object.assign(
			{
				credit_window: 0,
				source: { address: queue },
				autoaccept: false
			},
			this._getQueueOptions(PACKET_REQUEST, true)
		);
		const receiver = await this.connection.createReceiver(receiverOptions);
		receiver.addCredit(1);

		receiver.on("message", async context => {
			await this._consumeCB(PACKET_REQUEST, true)(context);
			receiver.addCredit(1);
		});

		this.receivers.push(receiver);
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof AmqpTransporter
	 */
	async subscribeBalancedEvent(event, group) {
		const queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`;
		const receiverOptions = Object.assign(
			{
				source: { address: queue },
				autoaccept: false
			},
			this._getQueueOptions(PACKET_EVENT + "LB", true)
		);
		const receiver = await this.connection.createReceiver(receiverOptions);
		receiver.on("message", this._consumeCB(PACKET_EVENT, true));

		this.receivers.push(receiver);
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof Amqp10Transporter
	 * @description Send packets to their intended queues / exchanges.
	 *
	 * Reasonings documented in the subscribe method.
	 */
	async publish(packet) {
		/* istanbul ignore next*/
		if (!this.connection) return;

		let topic = this.getTopicName(packet.type, packet.target);

		const data = this.serialize(packet);
		const message = Object.assign({ body: data }, this.opts.messageOptions, this._getMessageOptions(packet.type));
		const awaitableSenderOptions = {
			target: {
				address: packet.target ? topic : `topic://${topic}`
			}
		};
		try {
			const sender = await this.connection.createAwaitableSender(awaitableSenderOptions);
			await sender.send(message);
			this.incStatSent(data.length);
			await sender.close();
		} catch (error) {
			this.logger.error(error);
		}
	}

	/**
	 * Publish a balanced EVENT packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 * @memberof Amqp10Transporter
	 */
	async publishBalancedEvent(packet, group) {
		/* istanbul ignore next*/
		if (!this.connection) return;

		let queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${packet.payload.event}`;
		const data = this.serialize(packet);
		const message = Object.assign({ body: data }, this.opts.messageOptions, this._getMessageOptions(PACKET_EVENT, true));
		const awaitableSenderOptions = {
			target: {
				address: queue
			}
		};
		try {
			const sender = await this.connection.createAwaitableSender(awaitableSenderOptions);
			await sender.send(message);
			this.incStatSent(data.length);
			await sender.close();
		} catch (error) {
			this.logger.error(error);
		}
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 * @memberof AmqpTransporter
	 */
	async publishBalancedRequest(packet) {
		/* istanbul ignore next*/
		if (!this.connection) return Promise.resolve();

		const queue = `${this.prefix}.${PACKET_REQUEST}B.${packet.payload.action}`;

		const data = this.serialize(packet);
		const message = Object.assign({ body: data }, this.opts.messageOptions, this._getMessageOptions(PACKET_REQUEST, true));
		const awaitableSenderOptions = {
			target: {
				address: queue
			}
		};
		try {
			const sender = await this.connection.createAwaitableSender(awaitableSenderOptions);
			await sender.send(message);
			this.incStatSent(data.length);
			await sender.close();
		} catch (error) {
			this.logger.error(error);
		}
	}
}

module.exports = Amqp10Transporter;
