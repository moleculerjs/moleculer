/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const P = require("../packets");
const { flatten } = require("../utils");
const { BrokerDisconnectedError } = require("../errors");

/**
 * Base Transporter class
 *
 * @class BaseTransporter
 */
class BaseTransporter {
	/**
	 * Creates an instance of BaseTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberof BaseTransporter
	 */
	constructor(opts) {
		this.opts = opts;
		this.connected = false;
		this.hasBuiltInBalancer = false;
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
	init(transit, messageHandler, afterConnect) {
		if (transit) {
			this.transit = transit;
			this.broker = transit.broker;
			this.nodeID = transit.nodeID;
			this.logger = this.broker.getLogger("transporter");

			this.prefix = "MOL";
			if (this.broker.namespace) this.prefix += "-" + this.broker.namespace;
		}
		this.messageHandler = messageHandler;
		this.afterConnect = afterConnect;
	}

	/**
	 * Connect to the transporter server
	 *
	 * @memberof BaseTransporter
	 */
	connect() {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Event handler for connected.
	 *
	 * @param {any} wasReconnect
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	onConnected(wasReconnect) {
		this.connected = true;
		if (this.afterConnect) {
			return this.afterConnect(wasReconnect);
		}

		return this.broker.Promise.resolve();
	}

	/**
	 * Disconnect from the transporter server
	 *
	 * @memberof BaseTransporter
	 */
	disconnect() {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Subscribe to all topics
	 *
	 * @param {Array<Object>} topics
	 *
	 * @memberof BaseTransporter
	 */
	makeSubscriptions(topics) {
		return this.broker.Promise.all(
			topics.map(({ cmd, nodeID }) => this.subscribe(cmd, nodeID))
		);
	}

	/**
	 * Process incoming messages
	 *
	 * @param {String} cmd
	 * @param {Buffer} msg
	 * @returns
	 * @memberof BaseTransporter
	 */
	incomingMessage(cmd, msg) {
		if (!msg) return;
		try {
			const packet = this.deserialize(cmd, msg);
			return this.messageHandler(cmd, packet);
		} catch (err) {
			this.logger.warn("Invalid incoming packet. Type:", cmd, err);
			this.logger.debug("Content:", msg.toString ? msg.toString() : msg);
		}
	}

	/**
	 * Received data. It's a wrapper for middlewares.
	 * @param {String} cmd
	 * @param {Buffer} data
	 */
	receive(cmd, data) {
		return this.incomingMessage(cmd, data);
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberof BaseTransporter
	 */
	subscribe(/*cmd, nodeID*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Subscribe to balanced action commands
	 *
	 * @param {String} action
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedRequest(/*action*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Subscribe to balanced event command
	 *
	 * @param {String} event
	 * @param {String} group
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedEvent(/*event, group*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Unsubscribe all balanced request and event commands
	 *
	 * @memberof BaseTransporter
	 */
	unsubscribeFromBalancedCommands() {
		/* istanbul ignore next */
		return this.broker.Promise.resolve();
	}

	/**
	 * Publish a normal not balanced packet
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	publish(packet) {
		const topic = this.getTopicName(packet.type, packet.target);
		const data = this.serialize(packet);

		return this.send(topic, data, { packet });
	}

	/**
	 * Publish a balanced EVENT packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @param {String} group
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	publishBalancedEvent(packet, group) {
		const topic = `${this.prefix}.${P.PACKET_EVENT}B.${group}.${packet.payload.event}`;
		const data = this.serialize(packet);

		return this.send(topic, data, { packet, balanced: true });
	}

	/**
	 * Publish a balanced REQ packet to a balanced queue
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	publishBalancedRequest(packet) {
		const topic = `${this.prefix}.${P.PACKET_REQUEST}B.${packet.payload.action}`;
		const data = this.serialize(packet);

		return this.send(topic, data, { packet, balanced: true });
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
	send(/*topic, data, meta*/) {
		throw new Error("Not implemented!");
	}

	/**
	 * Get topic name from command & target nodeID
	 *
	 * @param {any} cmd
	 * @param {any} nodeID
	 *
	 * @memberof BaseTransporter
	 */
	getTopicName(cmd, nodeID) {
		return this.prefix + "." + cmd + (nodeID ? "." + nodeID : "");
	}

	/**
	 * Initialize queues for REQUEST & EVENT packets.
	 *
	 * @memberof AmqpTransporter
	 */
	makeBalancedSubscriptions() {
		if (!this.hasBuiltInBalancer) return this.broker.Promise.resolve();

		return this.unsubscribeFromBalancedCommands().then(() => {
			const services = this.broker.getLocalNodeInfo().services;
			return this.broker.Promise.all(
				services.map(service => {
					const p = [];

					// Service actions queues
					if (service.actions && typeof service.actions == "object") {
						p.push(
							Object.keys(service.actions).map(action =>
								this.subscribeBalancedRequest(action)
							)
						);
					}

					// Load-balanced/grouped events queues
					if (service.events && typeof service.events == "object") {
						p.push(
							Object.keys(service.events).map(event => {
								const group = service.events[event].group || service.name;
								this.subscribeBalancedEvent(event, group);
							})
						);
					}

					return this.broker.Promise.all(flatten(p, true).filter(Boolean));
				})
			);
		});
	}

	/**
	 * Prepublish a packet. Handle balancing.
	 *
	 * @param {Packet} packet
	 * @returns {Promise}
	 * @memberof BaseTransporter
	 */
	prepublish(packet) {
		// Safely handle disconnected state
		if (!this.connected) {
			// For packets that are triggered intentionally by users, throw a retryable error.
			if ([P.PACKET_REQUEST, P.PACKET_EVENT, P.PACKET_PING].includes(packet.type)) {
				return this.broker.Promise.reject(new BrokerDisconnectedError());
			}

			// For internal packets like INFO and HEARTBEATS, skip sending and don't throw
			else {
				return this.broker.Promise.resolve();
			}
		}

		if (packet.type === P.PACKET_EVENT && packet.target == null && packet.payload.groups) {
			const groups = packet.payload.groups;
			// If the packet contains groups, we don't send the packet to
			// the targetted node, but we push them to the event group queues
			// and AMQP will load-balanced it.
			if (groups.length > 0) {
				groups.forEach(group => {
					// Create a copy of the packet because the `publishBalancedEvent` will modify the payload.
					const copy = _.cloneDeep(packet);
					// Change the groups to this group to avoid multi handling in consumers.
					copy.payload.groups = [group];
					this.publishBalancedEvent(copy, group);
				});
				return this.broker.Promise.resolve();
			}
			// If it's not contain, then it is a broadcasted event,
			// we sent it in the normal way (exchange)
		} else if (packet.type === P.PACKET_REQUEST && packet.target == null) {
			return this.publishBalancedRequest(packet);
		}

		// Normal packet publishing...
		return this.publish(packet);
	}

	/**
	 * Serialize the Packet to Buffer
	 *
	 * @param {Packet} packet
	 * @returns {Buffer}
	 *
	 * @memberof Transit
	 */
	serialize(packet) {
		packet.payload.ver = this.broker.PROTOCOL_VERSION;
		packet.payload.sender = this.nodeID;
		return this.broker.serializer.serialize(packet.payload, packet.type);
	}

	/**
	 * Deserialize the incoming Buffer to Packet
	 *
	 * @param {String} type
	 * @param {Buffer} buf
	 * @returns {Packet}
	 *
	 * @memberof Transit
	 */
	deserialize(type, buf) {
		if (buf == null) return null;

		const msg = this.broker.serializer.deserialize(buf, type);
		return new P.Packet(type, null, msg);
	}
}

module.exports = BaseTransporter;
