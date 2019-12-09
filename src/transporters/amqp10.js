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
		if (typeof opts === "string") opts = { url: opts };
		else if (opts == null) opts = {};

		// Number of requests a broker will handle concurrently
		if (typeof opts.prefetch !== "number") opts.prefetch = 1;

		// Number of milliseconds before an event expires
		if (typeof opts.eventTimeToLive !== "number") opts.eventTimeToLive = 1000;

		if (typeof opts.heartbeatTimeToLive !== "number") opts.heartbeatTimeToLive = null;

		if (typeof opts.queueOptions !== "object") opts.queueOptions = {};

		if (typeof opts.exchangeOptions !== "object") opts.exchangeOptions = {};

		if (typeof opts.messageOptions !== "object") opts.messageOptions = {};

		if (typeof opts.consumeOptions !== "object") opts.consumeOptions = {};

		opts.autoDeleteQueues =
			typeof opts.autoDeleteQueues === "number" ? (opts.autoDeleteQueues >= 0 ? true : false) : opts.autoDeleteQueues;

		// Support for multiple URLs (clusters)
		opts.url = Array.isArray(opts.url) ? opts.url : !opts.url ? [""] : opts.url.split(";").filter(s => !!s);

		super(opts);

		this.hasBuiltInBalancer = true;
		this.connection = null;
		this.channel = null;
		this.bindings = [];
		this.receivers = [];

		this.channelDisconnecting = false;
		this.connectionDisconnecting = false;
	}

	/**
	 * Get assertQueue options by packet type.
	 *
	 * @param {String} packetType
	 *
	 * @memberof AmqpTransporter
	 */
	_getQueueOptions(packetType, balancedQueue) {
		let packetOptions = {};
		switch (packetType) {
			// Requests and responses don't expire.
			case PACKET_REQUEST:
				packetOptions = this.opts.autoDeleteQueues && !balancedQueue ? { dynamic: this.opts.autoDeleteQueues } : {};
				break;
			case PACKET_RESPONSE:
				packetOptions = this.opts.autoDeleteQueues ? { dynamic: this.opts.autoDeleteQueues } : {};
				break;

			// Consumers can decide how long events live
			// Load-balanced/grouped events
			case PACKET_EVENT + "LB":
			case PACKET_EVENT:
				packetOptions = this.opts.autoDeleteQueues ? { dynamic: this.opts.autoDeleteQueues } : {};
				break;

			// Packet types meant for internal use
			case PACKET_HEARTBEAT:
				packetOptions = { autoDelete: true };
				break;
			case PACKET_DISCOVER:
			case PACKET_DISCONNECT:
			case PACKET_UNKNOWN:
			case PACKET_INFO:
			case PACKET_PING:
			case PACKET_PONG:
				packetOptions = { dynamic: true };
				break;
		}

		return Object.assign(packetOptions, this.opts.queueOptions);
	}

	/**
	 * Get assertQueue options by packet type.
	 *
	 * @param {String} packetType
	 *
	 * @memberof AmqpTransporter
	 */
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
		return ({ message, delivery }) => {
			this.logger.info(`GOT MESSAGE ${cmd}`);

			const result = this.incomingMessage(cmd, message.body);

			// If a promise is returned, acknowledge the message after it has resolved.
			// This means that if a worker dies after receiving a message but before responding, the
			// message won't be lost and it can be retried.
			if (needAck) {
				if (isPromise(result)) {
					return result
						.then(() => {
							delivery.accept();
						})
						.catch(err => {
							this.logger.error("Message handling error.", err);
							delivery.reject();
						});
				} else {
					delivery.accept();
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
	connect(errorCallback) {
		return new Promise((_resolve, _reject) => {
			let _isResolved = false;
			const resolve = () => {
				_isResolved = true;
				_resolve();
			};
			const reject = err => {
				_reject(err);
				if (_isResolved) errorCallback(err);
			};

			let rhea;

			try {
				rhea = require("rhea");
			} catch (err) {
				/* istanbul ignore next */
				this.broker.fatal(
					"The 'rhea' package is missing. Please install it with 'npm install rhea --save' command.",
					err,
					true
				);
			}

			// Pick url
			this.connectAttempt = (this.connectAttempt || 0) + 1;
			const urlIndex = (this.connectAttempt - 1) % this.opts.url.length;
			const uri = this.opts.url[urlIndex];
			const urlParsed = url.parse(uri);
			this.connection = rhea.connect({
				username: "admin",
				password: "admin",
				host: urlParsed.hostname,
				port: urlParsed.port,
				container_id: rhea.generate_uuid()
			});

			rhea.on("connection_open", () => {
				this.logger.info("AMQP10 is connected.");
				return this.onConnected().then(resolve);
			});

			rhea.on("connection_close", () => {
				this.logger.info("AMQP10 is disconnected.");
				this.connected = false;

				return reject();
			});

			rhea.on("connection_error", context => {
				this.logger.error("AMQP10 connection error.", context.error);
				this.connected = false;

				return reject(context.error);
			});
		});
	}

	/**
	 * Disconnect from an AMQP10 server
	 *
	 * @memberof Amqp10Transporter
	 */
	disconnect() {
		if (this.connection) {
			this.receivers.forEach(receiver => {
				receiver.removeAllListeners();
				receiver.close();
			});
			this.connection.removeAllListeners();
			this.connection.close();
			this.connection = null;
			this.receivers = [];
			return Promise.resolve();
		}
	}

	subscribe(cmd, nodeID) {
		if (!this.connection) return;

		const topic = this.getTopicName(cmd, nodeID);

		return new Promise((resolve, reject) => {
			if (nodeID) {
				const needAck = [PACKET_REQUEST].indexOf(cmd) !== -1;

				const receiver = this.connection.open_receiver(
					Object.assign({ source: { address: topic } }, this._getQueueOptions(cmd))
				);

				receiver.on("message", this._consumeCB(cmd, needAck));

				receiver.on("receiver_open", () => {
					this.logger.info(`SUBSCRIBE to ${topic}`);
					resolve();
				});

				receiver.on("receiver_error", () => {
					this.logger.info(`SUBSCRIBE to ${topic} FAILED - ${JSON.stringify(receiver.error)}`);
					reject(receiver.error);
				});
				this.receivers.push(receiver);
			} else {
				// Create a queue specific to this nodeID so that this node can receive broadcasted messages.
				// const queueName = `${this.prefix}.${cmd}.${this.nodeID}`;

				// Save binding arguments for easy unbinding later.
				// const bindingArgs = [queueName, topic, '']
				// this.bindings.push(bindingArgs)

				// const needAck = [PACKET_REQUEST].indexOf(cmd) !== -1;

				// const receiver = this.connection.open_receiver(
				// 	Object.assign({ source: { address: queueName } }, this._getQueueOptions(cmd))
				// );

				// receiver.on("message", this._consumeCB(cmd, needAck));

				// const promises = [Promise.defer(), Promise.defer()];

				// receiver.on("receiver_open", () => {
				// 	this.logger.info(`SUBSCRIBE to ${queueName}`);
				// 	promises[0].resolve();
				// });

				// receiver.on("receiver_error", () => {
				// 	this.logger.info(`SUBSCRIBE to ${queueName} FAILED - ${JSON.stringify(receiver.error)}`);
				// 	reject(receiver.error);
				// });

				const receiver2 = this.connection.open_receiver(
					Object.assign({ source: { address: "topic://" + topic } }, this._getQueueOptions(cmd))
				);

				receiver2.on("message", this._consumeCB(cmd, false));

				receiver2.on("receiver_open", () => {
					this.logger.info(`SUBSCRIBE to ${"topic://" + topic}`);
					resolve();
				});

				receiver2.on("receiver_error", () => {
					this.logger.info(`SUBSCRIBE to ${"topic://" + topic} Failed - ${JSON.stringify(receiver.error)}`);
					reject(receiver2.error);
				});
				// this.receivers.push(receiver);
				this.receivers.push(receiver2);

				// return Promise.all(promises).then(resolve);

				// this.channel
				//   .assertQueue(queueName, this._getQueueOptions(cmd))
				//   .then(() =>
				//     Promise.all([
				//       this.channel.bindQueue(...bindingArgs),
				//       this.channel.consume(queueName, this._consumeCB(cmd), Object.assign({ noAck: true }, this.opts.consumeOptions))
				//     ])
				//   )
			}
		});
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedRequest(action) {
		return new Promise((resolve, reject) => {
			const queue = `${this.prefix}.${PACKET_REQUEST}B.${action}`;

			const receiver = this.connection.open_receiver(
				Object.assign({ source: { address: queue } }, this._getQueueOptions(PACKET_REQUEST, true))
			);

			receiver.on("message", this._consumeCB(PACKET_REQUEST, true));

			receiver.on("receiver_open", () => {
				this.logger.info(`SUBSCRIBE_BALANCED to ${queue}`);
				resolve();
			});

			receiver.on("receiver_error", () => {
				this.logger.info(`SUBSCRIBE_BALANCED to ${queue} FAILED - ${JSON.stringify(receiver.error)}`);
				reject(receiver.error);
			});

			this.receivers.push(receiver);
		});
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedEvent(event, group) {
		return new Promise((resolve, reject) => {
			const queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`;
			const receiver = this.connection.open_receiver(
				Object.assign({ source: { address: queue } }, this._getQueueOptions(PACKET_REQUEST + "LB", true))
			);

			receiver.on("message", this._consumeCB(PACKET_REQUEST, true));

			receiver.on("receiver_open", () => {
				this.logger.info(`SUBSCRIBE_BALANCED to ${queue}`);
				resolve();
			});

			receiver.on("receiver_error", () => {
				this.logger.info(`SUBSCRIBE_BALANCED to ${queue} FAILED - ${JSON.stringify(receiver.error)}`);
				reject(receiver.error);
			});

			this.receivers.push(receiver);
		});
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
		if (!this.connection) return Promise.resolve();

		let topic = this.getTopicName(packet.type, packet.target);
		this.logger.warn("KUSOMO", packet.target, packet.target ? topic : "topic://" + topic);

		const data = this.serialize(packet);
		const message = Object.assign(
			{ body: data, to: packet.target ? topic : "topic://" + topic },
			this._getMessageOptions(packet.type)
		);

		this.incStatSent(data.length);
		this.logger.info(`PUBLISH to ${message.to}, ${JSON.stringify(packet)}`);
		this.connection.send(message);

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
		this.logger.warn("KUSOMO_BALANCED");
		/* istanbul ignore next*/
		if (!this.connection) return Promise.resolve();

		let queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${packet.payload.event}`;
		const data = this.serialize(packet);
		this.incStatSent(data.length);

		const message = Object.assign({ body: data, to: queue }, this.opts.messageOptions);
		this.logger.info(`PUBLISH_BALANCED to ${message.to}`);
		this.connection.send(message);

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
		this.logger.warn("KUSOMO_BALANCED");

		/* istanbul ignore next*/
		if (!this.connection) return Promise.resolve();

		const topic = `${this.prefix}.${PACKET_REQUEST}B.${packet.payload.action}`;

		const data = this.serialize(packet);
		this.incStatSent(data.length);

		const message = Object.assign({ body: data, to: topic }, this.opts.messageOptions);

		this.logger.info(`PUBLISH_BALANCED to ${message.to}`);
		this.connection.send(message);

		return Promise.resolve();
	}
}

module.exports = Amqp10Transporter;
