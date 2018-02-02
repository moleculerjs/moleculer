/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");
const chalk 		= require("chalk");

const Node 			= require("../registry/node");
const P 			= require("../packets");
const {
	PacketGossipRequest,
	PacketGossipResponse,
	PACKET_GOSSIP_REQ,
	PACKET_GOSSIP_RES  } = require("./tcp/packets");
const { resolvePacketID }	= require("./tcp/constants");

const UdpServer		= require("./tcp/udp-broadcaster");
const TcpReader		= require("./tcp/tcp-reader");
const TcpWriter		= require("./tcp/tcp-writer");

/**
 * TCP Transporter with optional UDP discovery ("zero configuration") module.
 *
 * TCP Transporter uses fault tolerant and peer-to-peer <b>Gossip Protocol</b>
 * to discover location and service information about the other nodes
 * participating in a Moleculer Cluster. In Moleculer's P2P architecture all
 * nodes are equal, there is no "leader" or "controller" node, so the cluster is
 * truly horizontally scalable. This transporter aims to run on top of an
 * infrastructure of hundreds of nodes.
 *
 * @class TcpTransporter
 * @extends {Transporter}
 */
class TcpTransporter extends Transporter {

	/**
	 * Creates an instance of TcpTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberOf TcpTransporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = Object.assign({
			// UDP options
			udpDiscovery: true,
			udpReuseAddr: true,

			multicastHost: "230.0.0.0",
			multicastPort: 4445,
			multicastTTL: 1,
			multicastPeriod: 5,

			// TCP options
			port: null, // random port,
			urls: null, // TODO: URLs of remote endpoints
			useHostname: true, // TODO:

			gossipPeriod: 5, // 1 second
			maxKeepAliveConnections: 0, // TODO
			keepAliveTimeout: 60, // TODO
			maxPacketSize: 1 * 1024 * 1024
		}, this.opts);

		this.reader = null;
		this.writer = null;
		this.udpServer = null;

		this.gossipTimer = null;
	}

	/**
	 * Init transporter
	 *
	 * @param {Transit} transit
	 * @param {Function} messageHandler
	 * @param {Function} afterConnect
	 *
	 * @memberOf BaseTransporter
	 */
	init(transit, messageHandler, afterConnect) {
		super.init(transit, messageHandler, afterConnect);

		if (this.broker) {
			this.registry = this.broker.registry;
			this.nodes = this.registry.nodes;
			this.nodes.disableHeartbeatChecks = true;
			// TODO: Disable heartbeat timers and increment offlineTimout in registry if UDP discovery enabled
		}
	}

	/**
	 * Connect to the server
	 *
	 * @memberOf TcpTransporter
	 */
	connect() {
		return Promise.resolve()
			.then(() => this.startTcpServer())
			.then(() => this.startUdpServer())
			.then(() => this.startTimers())
			.then(() => {
				this.logger.info("TCP Transporter started.");
				this.connected = true;

				// Set the opened TCP port (because it can be a random port)
				const localNode = this.getLocalNodeInfo();
				localNode.port = this.opts.port;

				return this.onConnected();
			});
	}

	/**
	 * Start a TCP server for incoming packets
	 */
	startTcpServer() {
		this.writer = new TcpWriter(this, this.opts);
		this.reader = new TcpReader(this, this.opts);
		return this.reader.listen();
	}

	/**
	 * Start a UDP server for automatic discovery
	 */
	startUdpServer() {
		this.udpServer = new UdpServer(this, this.opts);

		this.udpServer.on("message", (nodeID, address, port) => {
			if (nodeID && nodeID != this.nodeID) {
				let node = this.nodes.get(nodeID);
				if (!node) {
					// Unknown node. Register as offline node
					this.addOfflineNode(nodeID, address, port);
				} else {
					// TODO if address is changed, update it
					/*
						// Check hostname and port
						boolean hostChanged = !host.equals(current.get("hostname", ""));
						if (hostChanged) {
							Tree ipList = current.get("ipList");
							if (ipList != null) {
								for (Tree ip : ipList) {
									if (host.equals(ip.asString())) {
										hostChanged = false;
										break;
									}
								}
							}
						}
						if (hostChanged || current.get("port", 0) != port) {

							// Add to "nodeInfos" without services block,
							// node's hostname or IP address changed
							registerAsOffline(nodeID, host, port);
						}
					*/
				}
			}
		});

		return this.udpServer.bind();
	}

	/**
	 * Start Gossip timers
	 */
	startTimers() {
		this.gossipTimer = setInterval(() => this.sendGossipRequest(), Math.max(this.opts.gossipPeriod, 1) * 1000);
	}

	/**
	 * Stop Gossip timers
	 */
	stopTimers() {
		if (this.gossipTimer)
			clearInterval(this.gossipTimer);
	}

	/**
	 *
	 * @param {*} id
	 * @param {*} address
	 * @param {*} port
	 */
	addOfflineNode(id, address, port) {
		const node = new Node(id);
		node.local = false;
		node.ipList = [address];
		node.port = port;
		node.hostname = address;
		node.available = false;
		node.when = 0;
		node.offlineSince = Date.now();

		this.nodes.add(node.id, node);

		return node;
	}

	/**
	 * Create and send a Gossip request packet
	 */
	sendGossipRequest() {
		const localNode = this.nodes.localNode;

		let packet = {
			host: localNode.hostname, // TODO
			port: localNode.port,
			online: {},
			offline: {}
		};

		// Add local node as online
		packet.online[localNode.id] = [localNode.when || 0, localNode.cpuWhen || 0, localNode.cpu];

		let onlineList = [];
		let offlineList = [];
		const list = this.nodes.list();
		list.forEach(node => {
			if (node.offlineSince) {
				if (node.when > 0) {
					packet.offline[node.id] = [node.when || 0, node.offlineSince || 0];
				}
				offlineList.push(node);
			} else {
				packet.online[node.id] = [node.when || 0, node.cpuWhen || 0, node.cpu || 0];

				if (!node.local)
					onlineList.push(node);
			}
		});

		if (onlineList.length > 0) {
			// Send gossip message to a live endpoint
			this.sendGossipToRandomEndpoint(packet, onlineList);
		}

		if (offlineList.length > 0) {
			const ratio = offlineList.length / (onlineList.length + 1);

			// Random number between 0.0 and 1.0
			const random = Math.random();
			if (random < ratio) {
				// Send gossip message to an offline endpoint
				this.sendGossipToRandomEndpoint(packet, offlineList);
			}
		}
	}

	/**
	 * Send a Gossip request packet to a random endpoint
	 *
	 * @param {Object} data
	 * @param {Array} endpoints
	 */
	sendGossipToRandomEndpoint(data, endpoints) {
		if (endpoints.length == 0)
			return;

		const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
		if (ep) {
			const packet = new PacketGossipRequest(this.transit, ep.id, data);
			this.publish(packet);

			this.logger.info(chalk.bgYellow.black(`----- REQUEST ${this.nodeID} -> ${ep.id} -----`), packet.payload);
		}
	}

	/**
	 * Process incoming packets
	 *
	 * @param {String} type
	 * @param {Object} message
	 */
	onIncomingMessage(type, message) {
		switch(type) {
			case PACKET_GOSSIP_REQ: return this.processGossipRequest(message);
			case PACKET_GOSSIP_RES: return this.processGossipResponse(message);
			default: return this.messageHandler(type, message);
		}
	}

	processGossipRequest(msg) {
		const packet = P.Packet.deserialize(this.transit, PACKET_GOSSIP_REQ, msg);
		const payload = packet.payload;

		this.logger.info(`----- REQUEST ${this.nodeID} <- ${payload.sender} -----`, payload);

		const response = {
			online: {},
			offline: {}
		};

		const list = this.nodes.list(true);
		list.forEach(node => {
			const online = payload.online[node.id];
			const offline = payload.offline[node.id];
			let when, since, cpuWhen, cpu;

			if (offline)
				[when, since] = offline;
			else if (online)
				[when, cpuWhen, cpu] = online;

			if (!when || when < node.when) {
				// We have newer info or requester doesn't know it
				if (node.available) {
					const info = this.registry.getNodeInfo(node.id);
					response.online[node.id] = [info, node.cpuWhen || 0, node.cpu || 0];
				} else {
					response.offline[node.id] = [node.when, node.offlineSince];
				}

				return;
			}

			if (offline) {
				// Requester said it is OFFLINE

				if (!node.available) {
					// We also knew it as offline

					// Update 'offlineSince' if it is older than us
					if (since < node.offlineSince)
						node.offlineSince = since;

					return;

				} else if (!node.local) {
					// We know it is online, so we change it to offline
					this.nodes.disconnected(node.id, true);

					// Update the 'offlineSince' to the received value
					node.offlineSince = since;
				} else if (node.local) {
					// We send back that we are online
					// TODO update to a newer 'when' if my is older
					const info = this.registry.getNodeInfo(node.id);
					response.online[node.id] = [info, node.cpuWhen || 0, node.cpu || 0];
				}

			} else if (online) {
				// Requester said it is ONLINE

				if (node.available) {
					if (cpuWhen > node.cpuWhen) {
						// We update our CPU info
						node.heartbeat({
							cpu,
							cpuWhen
						});
					} else if (cpuWhen < node.cpuWhen) {
						// We have newer CPU value, send back
						response.online[node.id] = [node.cpuWhen || 0, node.cpu || 0];
					}
				}
				else {
					// We knew it as offline. We do nothing, because we'll request it and we'll receive its INFO.
					return;
				}
			}
		});

		// Find newer online nodes (need it?)
		/*Object.keys(payload.online).forEach(nodeID => {
			const node = this.nodes.get(nodeID);
			if (!node) {
				// We don't know this nodeID
				// No address & port this.addOfflineNode(nodeID, address, port);
			}
		});*/

		// TODO: don't send if online and offline are empty.

		// Whether we know the sender
		let sender = this.nodes.get(payload.sender);
		if (!sender) {
			// We add it, because we want to send the response back to sender.
			sender = this.addOfflineNode(payload.sender, payload.host, payload.port);
		}

		// Send back the Gossip response to the sender
		const rspPacket = new PacketGossipResponse(this.transit, sender.id, response);
		this.publish(rspPacket);

		this.logger.info(chalk.bgMagenta.black(`----- RESPONSE ${this.nodeID} -> ${sender.id} -----`), rspPacket.payload);
	}

	processGossipResponse(msg) {
		const packet = P.Packet.deserialize(this.transit, PACKET_GOSSIP_RES, msg);
		const payload = packet.payload;

		this.logger.info(`----- RESPONSE ${this.nodeID} <- ${payload.sender} -----`, payload);

		// Process online nodes
		if (payload.online) {
			Object.keys(payload.online).forEach(nodeID => {
				// We don't process the self info. We know it better.
				if (nodeID == this.nodeID) return;

				const row = payload.online[nodeID];
				if (!Array.isArray(row)) return;

				let info, cpu, cpuWhen;

				if (row.length == 1)
					info = row[0];
				else if (row.length == 2)
					[cpuWhen, cpu] = row;
				else if (row.length == 3)
					[info, cpuWhen, cpu] = row;

				const node = this.nodes.get(nodeID);
				if (info && node && node.when < info.when) {
					// Update 'info' block
					info.sender = nodeID;
					this.nodes.processNodeInfo(info);
				}

				if (cpuWhen && cpuWhen > node.cpuWhen) {
					// We update our CPU info
					node.heartbeat({
						cpu,
						cpuWhen
					});
				}
			});
		}

		// Process offline nodes
		if (payload.offline) {
			Object.keys(payload.offline).forEach(nodeID => {
				// We don't process the self info. We know it better.
				if (nodeID == this.nodeID) return;

				const row = payload.offline[nodeID];
				if (!Array.isArray(row) || row.length < 2) return;

				const [when, since] = row;

				const node = this.nodes.get(nodeID);
				if (!node) return;

				if (node.when < when) {
					if (node.available) {
						// We know it is online, so we change it to offline
						this.nodes.disconnected(node.id, true);
					}

					// Update the 'offlineSince' to the received value
					node.offlineSince = since;
				}

			});
		}
	}

	/**
	 * Close TCP & UDP servers and destroy sockets.
	 *
	 * @memberOf TcpTransporter
	 */
	disconnect() {
		this.connected = false;

		this.stopTimers();

		if (this.reader)
			this.reader.close();

		if (this.writer)
			this.writer.close();

		if (this.udpServer)
			this.udpServer.close();
	}

	/**
	 * Get local node info instance
	 */
	getLocalNodeInfo() {
		return this.nodes.localNode;
	}

	/**
	 * Get a node info instance by nodeID
	 *
	 * @param {String} nodeID
	 */
	getNodeInfo(nodeID) {
		return this.nodes.get(nodeID);
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf TcpTransporter
	 */
	subscribe(/*cmd, nodeID*/) {
		return Promise.resolve();
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf TcpTransporter
	 */
	publish(packet) {
		if (!packet.target || [
			P.PACKET_EVENT,
			P.PACKET_PING,
			P.PACKET_PONG,
			P.PACKET_REQUEST,
			P.PACKET_RESPONSE,
			PACKET_GOSSIP_REQ,
			PACKET_GOSSIP_RES
		].indexOf(packet.type) == -1)
			return Promise.resolve();

		const packetID = resolvePacketID(packet.type);
		const data = Buffer.from(packet.serialize()); // TODO, check isBuffer
		return this.writer.send(packet.target, packetID, data)
			.catch(err => {
				this.nodes.disconnected(packet.target, true);
				throw err;
			});
	}

}

module.exports = TcpTransporter;
