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
 * For test:
 *
 * 	 docker run -p 61616:61616 -p 8161:8161 -p 5672:5672 --rm -d --name=activemq rmohr/activemq
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

		/* istanbul ignore next*/
		if (!this.opts) this.opts = {};

		// Number of requests a broker will handle concurrently
		if (typeof opts.prefetch !== "number") opts.prefetch = 1;

		// Number of milliseconds before an event expires
		if (typeof opts.eventTimeToLive !== "number") opts.eventTimeToLive = null;

		if (typeof opts.heartbeatTimeToLive !== "number") opts.heartbeatTimeToLive = null;

		if (typeof opts.connectionOptions !== "object") opts.connectionOptions = {};

		if (typeof opts.queueOptions !== "object") opts.queueOptions = {};

		if (typeof opts.topicOptions !== "object") opts.topicOptions = {};

		if (typeof opts.messageOptions !== "object") opts.messageOptions = {};

		if (typeof opts.topicPrefix !== "string") opts.topicPrefix = "topic://";

		this.receivers = [];
		this.hasBuiltInBalancer = true;
		this.connection = null;
		this.session = null;
	}

	_getQueueOptions(packetType, balancedQueue) {
		let packetOptions = {};
		switch (packetType) {
			// Requests and responses don't expire.
			case PACKET_REQUEST:
				// TODO: auto delete
				break;
			case PACKET_RESPONSE:
				// TODO: auto delete
				break;

			// Consumers can decide how long events live
			// Load-balanced/grouped events
			case PACKET_EVENT + "LB":
			case PACKET_EVENT:
				// TODO: auto delete
				break;

			// Packet types meant for internal use
			case PACKET_HEARTBEAT:
				// TODO: auto delete
				// packetOptions = {};
				break;
			case PACKET_DISCOVER:
			case PACKET_DISCONNECT:
			case PACKET_UNKNOWN:
			case PACKET_INFO:
			case PACKET_PING:
			case PACKET_PONG:
				// TODO: auto delete
				break;
		}

		return Object.assign(packetOptions, this.opts.queueOptions);
	}

	_getMessageOptions(packetType) {
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
	 * @memberof Amqp10Transporter
	 */
	_consumeCB(cmd, needAck = false) {
		return ({ message, delivery }) => {
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
	connect(errorCallback) {
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

		// Pick url
		const uri = this.opts.url;
		const urlParsed = url.parse(uri);
		const username = urlParsed.auth ? urlParsed.auth.split(":")[0] : undefined;
		const password = urlParsed.auth ? urlParsed.auth.split(":")[1] : undefined;
		const connectionOptions = Object.assign(
			{
				host: urlParsed.hostname,
				hostname: urlParsed.hostname,
				username,
				password,
				port: urlParsed.port || 5672,
				container_id: this.broker.instanceID
			},
			this.opts.connectionOptions
		);

		const container = new rhea.Container();
		const connection = container.createConnection(connectionOptions);

		connection.on("disconnected", e => {
			this.logger.info("AMQP10 disconnected.");
			this.connected = false;
			if (e) {
				this.logger.error("AMQP10 connection error.", (this.connection && this.connection.error) || "");
				errorCallback && errorCallback(e);
			}
		});

		return connection
			.open()
			.then(connection => {
				this.connection = connection;
				this.connection.createSession().then(session => {
					this.session = session;
					this.logger.info("AMQP10 is connected");
					this.connection._connection.setMaxListeners(0);
					this.session._session.setMaxListeners(0);
					return this.onConnected();
				});
			})
			.catch(e => {
				this.logger.error("AMQP10 connection error.", (this.connection && this.connection.error) || "");
				this.logger.info("AMQP10 is disconnected.");
				this.connected = false;
				errorCallback && errorCallback(e);
			});
	}

	/**
	 * Disconnect from an AMQP 1.0 server
	 * Close every receiver on the connections and the close the connection
	 * @memberof Amqp10Transporter
	 */
	disconnect() {
		if (this.connection) {
			return Promise.all(this.receivers.map(receiver => receiver.close()))
				.then(() => this.connection.close())
				.then(() => {
					this.connection = null;
					this.connected = false;
					this.session = null;
					this.receivers = [];
				})
				.catch(error => this.logger.error(error));
		}
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof Amqp10Transporter
	 * @description Initialize queues and topics for all packet types.
	 *
	 * All packets that should reach multiple nodes have a dedicated topic for that command
	 * These packet types will not use acknowledgements.
	 * The time-to-live for EVENT packets can be configured in options.
	 * Examples: INFO, DISCOVER, DISCONNECT, HEARTBEAT, PING, PONG, EVENT
	 *
	 * Other Packets are headed towards a specific queue. These don't need topics and
	 * packets of this type will not expire.
	 * Examples: REQUEST, RESPONSE
	 *
	 * RESPONSE: Each node has its own dedicated queue and acknowledgements will not be used.
	 *
	 * REQUEST: Each action has its own dedicated queue. This way if an action has multiple workers,
	 * they can all pull from the same queue. This allows a message to be retried by a different node
	 * if one dies before responding.
	 *
	 */
	subscribe(cmd, nodeID) {
		if (!this.connection) return;

		const topic = this.getTopicName(cmd, nodeID);
		let receiverOptions = this._getQueueOptions(cmd);

		if (nodeID) {
			const needAck = [PACKET_REQUEST].indexOf(cmd) !== -1;
			Object.assign(receiverOptions, this.opts.queueOptions, {
				credit_window: this.opts.prefetch !== 0 ? 0 : undefined,
				autoaccept: !needAck,
				name: topic,
				source: {
					address: topic
				},
				session: this.session
			});

			return this.connection.createReceiver(receiverOptions).then(receiver => {
				if (this.opts.prefetch !== 0) {
					receiver.addCredit(this.opts.prefetch);
				}

				receiver.on("message", context => {
					const cb = this._consumeCB(cmd, needAck)(context);
					if (isPromise(cb) && this.opts.prefetch !== 0) {
						return cb.then(() => receiver.addCredit(1));
					}
					if (this.opts.prefetch !== 0) {
						receiver.addCredit(1);
					}
				});

				this.receivers.push(receiver);
			});
		} else {
			const topicName = `${this.opts.topicPrefix}${topic}`;
			Object.assign(receiverOptions, this.opts.topicOptions, {
				name: topicName,
				source: {
					address: topicName
				}
			});
			return this.connection.createReceiver(receiverOptions).then(receiver => {
				receiver.on("message", context => {
					this._consumeCB(cmd, false)(context);
				});

				this.receivers.push(receiver);
			});
		}
	}

	/**
	 * Subscribe to balanced action commands
	 * For REQB command types
	 * These queues will be used when the "disableBalancer" set to true
	 *
	 * @param {String} action
	 * @memberof Amqp10Transporter
	 */
	subscribeBalancedRequest(action) {
		const queue = `${this.prefix}.${PACKET_REQUEST}B.${action}`;
		const receiverOptions = Object.assign(
			{
				credit_window: this.opts.prefetch !== 0 ? 0 : undefined,
				source: { address: queue },
				autoaccept: false,
				session: this.session
			},
			this._getQueueOptions(PACKET_REQUEST, true)
		);
		return this.connection.createReceiver(receiverOptions).then(receiver => {
			if (this.opts.prefetch !== 0) {
				receiver.addCredit(this.opts.prefetch);
			}

			receiver.on("message", context => {
				const cb = this._consumeCB(PACKET_REQUEST, true)(context);
				if (isPromise(cb) && this.opts.prefetch !== 0) {
					return cb.then(() => receiver.addCredit(1));
				}
				if (this.opts.prefetch !== 0) {
					receiver.addCredit(1);
				}
			});

			this.receivers.push(receiver);
		});
	}

	/**
	 * Subscribe to balanced event command
	 * For EVENTB command types
	 * These queues will be used when the "disableBalancer" set to true
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof Amqp10Transporter
	 */
	subscribeBalancedEvent(event, group) {
		const queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${event}`;
		const receiverOptions = Object.assign(
			{
				source: { address: queue },
				autoaccept: false,
				session: this.session
			},
			this._getQueueOptions(PACKET_EVENT + "LB", true)
		);

		return this.connection.createReceiver(receiverOptions).then(receiver => {
			receiver.on("message", this._consumeCB(PACKET_EVENT, true));

			this.receivers.push(receiver);
		});
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberof Amqp10Transporter
	 * @description Send packets to their intended queues / topics.
	 *
	 * Reasonings documented in the subscribe method.
	 */
	publish(packet) {
		/* istanbul ignore next*/
		if (!this.connection) return;

		let topic = this.getTopicName(packet.type, packet.target);

		const data = this.serialize(packet);
		const message = Object.assign({ body: data }, this.opts.messageOptions, this._getMessageOptions(packet.type));
		const awaitableSenderOptions = {
			target: {
				address: packet.target ? topic : `${this.opts.topicPrefix}${topic}`
			},
			session: this.session
		};
		return this.connection
			.createAwaitableSender(awaitableSenderOptions)
			.then(sender => {
				return sender
					.send(message)
					.catch(this.logger.error)
					.then(() => sender);
			})
			.then(sender => {
				this.incStatSent(data.length);
				return sender.close({ closeSession: false });
			})
			.catch(error => this.logger.error(error));
	}

	/**
	 * Publish a balanced EVENT(B) packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 * @memberof Amqp10Transporter
	 */
	publishBalancedEvent(packet, group) {
		/* istanbul ignore next*/
		if (!this.connection) return;

		let queue = `${this.prefix}.${PACKET_EVENT}B.${group}.${packet.payload.event}`;
		const data = this.serialize(packet);
		const message = Object.assign({ body: data }, this.opts.messageOptions, this._getMessageOptions(PACKET_EVENT, true));
		const awaitableSenderOptions = {
			target: {
				address: queue
			},
			session: this.session
		};
		return this.connection
			.createAwaitableSender(awaitableSenderOptions)
			.then(sender => {
				return sender
					.send(message)
					.catch(this.logger.error)
					.then(() => sender);
			})
			.then(sender => {
				this.incStatSent(data.length);
				return sender.close({ closeSession: false });
			})
			.catch(error => this.logger.error(error));
	}

	/**
	 * Publish a balanced REQ(B) packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 * @memberof Amqp10Transporter
	 */
	publishBalancedRequest(packet) {
		/* istanbul ignore next*/
		if (!this.connection) return Promise.resolve();

		const queue = `${this.prefix}.${PACKET_REQUEST}B.${packet.payload.action}`;

		const data = this.serialize(packet);
		const message = Object.assign({ body: data }, this.opts.messageOptions, this._getMessageOptions(PACKET_REQUEST, true));
		const awaitableSenderOptions = {
			target: {
				address: queue
			},
			session: this.session
		};
		return this.connection
			.createAwaitableSender(awaitableSenderOptions)
			.then(sender => {
				return sender
					.send(message)
					.catch(this.logger.error)
					.then(() => sender);
			})
			.then(sender => {
				this.incStatSent(data.length);
				return sender.close({ closeSession: false });
			})
			.catch(error => this.logger.error(error));
	}
}

module.exports = Amqp10Transporter;
