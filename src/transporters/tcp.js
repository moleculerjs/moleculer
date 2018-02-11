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
const { resolvePacketID }	= require("./tcp/constants");
const { MoleculerServerError } 	= require("../errors");

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
 * TODO:
 * 	- urls
 *  	- urls: ["192.168.0.1:3000/node-1", "tcp://192.168.0.2:3000/node-2", ...]
 *  	- urls: { "node-1": "192.168.0.1:3000", "node-2: "tcp://192.168.0.2:3000", ...}
 *  	- urls: "http://central-server/node-list.json" // Download endpoint list from URL
 * 		- transporter: "tcp://192.168.0.1:3000/node-1, 192.168.0.2:3000/node-2"
 *  - integration tests
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

			maxUdpDiscovery: 0, // 0 - No limit

			broadcastAddress: "255.255.255.255",
			broadcastPort: 4445,
			broadcastPeriod: 5,

			// Multicast settings
			multicastAddress: null, //"230.0.0.0",
			multicastTTL: 1,

			// TCP options
			port: null, // random port,
			urls: null, // TODO: URLs of remote endpoints
			useHostname: true,

			gossipPeriod: 2, // seconds
			maxConnections: 32, // Max live outgoing TCP connections
			maxPacketSize: 1 * 1024 * 1024
		}, this.opts);

		this.reader = null;
		this.writer = null;
		this.udpServer = null;

		this.gossipTimer = null;

		this.GOSSIP_DEBUG = false;
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

				// Set the opened TCP port (because it is a random port by default)
				this.nodes.localNode.port = this.opts.port;

				return this.onConnected();
			});
	}

	/**
	 * Start a TCP server for incoming packets
	 */
	startTcpServer() {
		this.writer = new TcpWriter(this, this.opts);
		this.reader = new TcpReader(this, this.opts);

		this.writer.on("error", (err, nodeID) => {
			this.logger.debug(`TCP client error on '${nodeID}'`, err);
			this.nodes.disconnected(nodeID, false);
		});

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
					node = this.addOfflineNode(nodeID, address, port);

				} else if (!node.available) {
					// Update connection data
					node.port = port;
					node.hostname = address;

					if (node.ipList.indexOf(address) == -1)
						node.ipList.unshift(address);
				}
				node.udpAddress = address;
			}
		});

		return this.udpServer.bind();
	}

	/**
	 * Process incoming packets
	 *
	 * @param {String} type
	 * @param {Object} message
	 */
	onIncomingMessage(type, message) {
		//console.log("<<", type, message.toString());
		switch(type) {
			case P.PACKET_GOSSIP_HELLO: return this.processGossipHello(message);
			case P.PACKET_GOSSIP_REQ: return this.processGossipRequest(message);
			case P.PACKET_GOSSIP_RES: return this.processGossipResponse(message);
			default: return this.incomingMessage(type, message);
		}
	}

	/**
	 * Start Gossip timers
	 */
	startTimers() {
		this.gossipTimer = setInterval(() => this.sendGossipRequest(), Math.max(this.opts.gossipPeriod, 1) * 1000);
		this.gossipTimer.unref();
	}

	/**
	 * Stop Gossip timers
	 */
	stopTimers() {
		if (this.gossipTimer) {
			clearInterval(this.gossipTimer);
			this.gossipTimer = null;
		}
	}

	/**
	 * Register a node as offline because we don't know all information about it
	 *
	 * @param {String} id - NodeID
	 * @param {String} address
	 * @param {Number} port
	 */
	addOfflineNode(id, address, port) {
		const node = new Node(id);
		node.local = false;
		node.hostname = address;
		node.ipList = [address];
		node.port = port;
		node.available = false;
		node.seq = 0;
		node.offlineSince = Date.now();

		this.nodes.add(node.id, node);

		return node;
	}

	/**
	 * Wrapper for TCP writer
	 *
	 * @param {String} nodeID
	 * @returns
	 * @memberof TcpTransporter
	 */
	getNode(nodeID) {
		return this.nodes.get(nodeID);
	}

	/**
	 * Get address for node. It returns the hostname or IP address
	 *
	 * @param {Node} node
	 * @returns
	 * @memberof TcpTransporter
	 */
	getNodeAddress(node) {
		if (node.udpAddress)
			return node.udpAddress;

		if (this.opts.useHostname && node.hostname)
			return node.hostname;

		if (node.ipList && node.ipList.length > 0)
			return node.ipList[0];

		this.logger.warn(`Node ${node.id} has no valid address`, node);

		return null;
	}

	/**
	 * Send a Gossip Hello to the remote node
	 *
	 * @param {String} nodeID
	 */
	sendHello(nodeID) {
		const node = this.getNode(nodeID);
		if (!node)
			return Promise.reject(new MoleculerServerError(`Missing node info for '${nodeID}'`));

		const localNode = this.nodes.localNode;
		const packet = new P.Packet(P.PACKET_GOSSIP_HELLO, nodeID, {
			host: this.getNodeAddress(localNode),
			port: localNode.port,
		});

		if (this.GOSSIP_DEBUG) this.logger.info(chalk.bgCyan.black(`----- HELLO ${this.nodeID} -> ${nodeID} -----`), packet.payload);

		return this.publish(packet);
	}


	/**
	 * Process incoming Gossip Hello packet
	 *
	 * @param {Buffer} msg
	 */
	processGossipHello(msg) {
		const packet = this.deserialize(P.PACKET_GOSSIP_HELLO, msg);
		const payload = packet.payload;
		const nodeID = payload.sender;

		if (this.GOSSIP_DEBUG) this.logger.info(`----- HELLO ${this.nodeID} <- ${payload.sender} -----`, payload);

		let node = this.nodes.get(nodeID);
		if (!node) {
			// Unknown node. Register as offline node
			node = this.addOfflineNode(nodeID, payload.host, payload.port);
		}

	}

	/**
	 * Create and send a Gossip request packet
	 */
	sendGossipRequest() {
		const list = this.nodes.toArray();
		if (list.length <= 1)
			return;

		let packet = {
			online: {},
			offline: {}
		};

		let onlineList = [];
		let offlineList = [];

		list.forEach(node => {
			if (!node.available) {
				if (node.seq > 0) {
					packet.offline[node.id] = node.seq;
				}
				offlineList.push(node);
			} else {
				packet.online[node.id] = [node.seq, node.cpuSeq || 0, node.cpu || 0];

				if (!node.local)
					onlineList.push(node);
			}
		});

		/* istanbul ignore next */
		if (Object.keys(packet.offline).length == 0)
			delete packet.offline;

		/* istanbul ignore next */
		if (Object.keys(packet.online).length == 0)
			delete packet.online;

		if (onlineList.length > 0) {
			// Send gossip message to a live endpoint
			this.sendGossipToRandomEndpoint(packet, onlineList);
		}

		if (offlineList.length > 0) {
			const ratio = offlineList.length / (onlineList.length + 1);

			// Random number between 0.0 and 1.0
			if (ratio >= 1 || Math.random() < ratio) {
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

		const ep = endpoints.length == 1 ? endpoints[0] : endpoints[Math.floor(Math.random() * endpoints.length)];
		if (ep) {
			const packet = new P.Packet(P.PACKET_GOSSIP_REQ, ep.id, data);
			this.publish(packet).catch(() => {});

			if (this.GOSSIP_DEBUG) this.logger.info(chalk.bgYellow.black(`----- REQUEST ${this.nodeID} -> ${ep.id} -----`), packet.payload);
		}
	}

	/**
	 * Process incoming Gossip Request packet
	 *
	 * @param {Buffer} msg
	 * @memberof TcpTransporter
	 */
	processGossipRequest(msg) {
		const packet = this.deserialize(P.PACKET_GOSSIP_REQ, msg);
		const payload = packet.payload;

		if (this.GOSSIP_DEBUG) this.logger.info(`----- REQUEST ${this.nodeID} <- ${payload.sender} -----`, payload);

		const response = {
			online: {},
			offline: {}
		};

		const list = this.nodes.toArray();
		list.forEach(node => {
			const online = payload.online ? payload.online[node.id] : null;
			const offline = payload.offline ? payload.offline[node.id] : null;
			let seq, cpuSeq, cpu;

			if (offline)
				seq = offline;
			else if (online)
				[seq, cpuSeq, cpu] = online;

			if (!seq || seq < node.seq) {
				// We have newer info or requester doesn't know it
				if (node.available) {
					const info = this.registry.getNodeInfo(node.id);
					response.online[node.id] = [info, node.cpuSeq || 0, node.cpu || 0];
				} else {
					response.offline[node.id] = node.seq;
				}

				return;
			}

			if (offline) {
				// Requester said it is OFFLINE

				if (!node.available) {
					// We also know it as offline

					// Update 'seq' if it is newer than us
					if (seq > node.seq)
						node.seq = seq;

					return;

				} else if (!node.local) {
					// We know it is online, so we change it to offline
					this.nodes.disconnected(node.id, false);

					// Update the 'seq' to the received value
					node.seq = seq;

				} else if (node.local) {
					// Requested said I'm offline. We should send back that we are online!
					// We need to increment the received `seq` so that the requester will update us
					node.seq = seq + 1;

					const info = this.registry.getNodeInfo(node.id);
					response.online[node.id] = [info, node.cpuSeq || 0, node.cpu || 0];
				}

			} else if (online) {
				// Requester said it is ONLINE

				if (node.available) {
					if (cpuSeq > node.cpuSeq) {
						// We update CPU info
						node.heartbeat({
							cpu,
							cpuSeq
						});
					} else if (cpuSeq < node.cpuSeq) {
						// We have newer CPU value, send back
						response.online[node.id] = [node.cpuSeq || 0, node.cpu || 0];
					}
				}
				else {
					// We know it as offline. We do nothing, because we'll request it and we'll receive its INFO.
					return;
				}
			}
		});

		// Remove empty keys
		if (Object.keys(response.offline).length == 0)
			delete response.offline;

		if (Object.keys(response.online).length == 0)
			delete response.online;

		if (response.online || response.offline) {
			let sender = this.nodes.get(payload.sender);

			// Send back the Gossip response to the sender
			const rspPacket = new P.Packet(P.PACKET_GOSSIP_RES, sender.id, response);
			this.publish(rspPacket).catch(() => {});

			if (this.GOSSIP_DEBUG) this.logger.info(chalk.bgMagenta.black(`----- RESPONSE ${this.nodeID} -> ${sender.id} -----`), rspPacket.payload);
		} else {
			if (this.GOSSIP_DEBUG) this.logger.info(chalk.bgBlue.white(`----- EMPTY RESPONSE ${this.nodeID} -> ${payload.sender} -----`));
		}
	}

	/**
	 * Process the incoming Gossip Response packet
	 *
	 * @param {Buffer} msg
	 * @memberof TcpTransporter
	 */
	processGossipResponse(msg) {
		const packet = this.deserialize(P.PACKET_GOSSIP_RES, msg);
		const payload = packet.payload;

		if (this.GOSSIP_DEBUG) this.logger.info(`----- RESPONSE ${this.nodeID} <- ${payload.sender} -----`, payload);

		// Process online nodes
		if (payload.online) {
			Object.keys(payload.online).forEach(nodeID => {
				// We don't process the self info. We know it better.
				if (nodeID == this.nodeID) return;

				const row = payload.online[nodeID];
				if (!Array.isArray(row)) return;

				let info, cpu, cpuSeq;

				if (row.length == 1)
					info = row[0];
				else if (row.length == 2)
					[cpuSeq, cpu] = row;
				else if (row.length == 3)
					[info, cpuSeq, cpu] = row;

				let node = this.nodes.get(nodeID);
				if (info && (!node || node.seq < info.seq)) {
					// If we don't know it, or know, but has smaller seq, update 'info'
					info.sender = nodeID;
					node = this.nodes.processNodeInfo(info);
				}

				if (node && cpuSeq && cpuSeq > node.cpuSeq) {
					// Update CPU
					node.heartbeat({
						cpu,
						cpuSeq
					});
				}
			});
		}

		// Process offline nodes
		if (payload.offline) {
			Object.keys(payload.offline).forEach(nodeID => {
				// We don't process the self info. We know it better.
				if (nodeID == this.nodeID) return;

				const seq = payload.offline[nodeID];

				const node = this.nodes.get(nodeID);
				if (!node) return;

				if (node.seq < seq) {
					if (node.available) {
						// We know it is online, so we change it to offline
						this.nodes.disconnected(node.id, false);
					}

					// Update the 'seq' to the received value
					node.seq = seq;
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
		/* istanbul ignore next */
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
			P.PACKET_GOSSIP_REQ,
			P.PACKET_GOSSIP_RES,
			P.PACKET_GOSSIP_HELLO
		].indexOf(packet.type) == -1)
			return Promise.resolve();

		const packetID = resolvePacketID(packet.type);
		let data = this.serialize(packet);
		if (!Buffer.isBuffer(data))
			data = Buffer.from(data);

		//console.log(">>", packet.type, data.toString());
		return this.writer.send(packet.target, packetID, data)
			.catch(err => {
				this.nodes.disconnected(packet.target, true);
				throw err;
			});
	}

}

module.exports = TcpTransporter;
