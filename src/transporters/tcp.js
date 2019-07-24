/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");
const _ 			= require("lodash");
const fs 			= require("fs");
const kleur 		= require("kleur");

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
 * @class TcpTransporter
 * @extends {Transporter}
 */
class TcpTransporter extends Transporter {

	/**
	 * Creates an instance of TcpTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberof TcpTransporter
	 */
	constructor(opts) {
		if (_.isString(opts))
			opts = { urls: opts };

		super(opts);

		this.opts = Object.assign({
			// UDP discovery options
			udpDiscovery: true,
			udpPort: 4445,
			udpBindAddress: null,
			udpPeriod: 30,
			udpReuseAddr: true,
			udpMaxDiscovery: 0, // 0 - No limit

			// Multicast settings
			udpMulticast: "239.0.0.0",
			udpMulticastTTL: 1,

			// Broadcast settings
			udpBroadcast: false,

			// TCP options
			port: null, // random port,
			urls: null, // Remote node addresses (when UDP discovery is not available)
			useHostname: true,

			gossipPeriod: 2, // seconds
			maxConnections: 32, // Max live outgoing TCP connections
			maxPacketSize: 1 * 1024 * 1024
		}, this.opts);

		this.reader = null;
		this.writer = null;
		this.udpServer = null;

		this.gossipTimer = null;

		this.GOSSIP_DEBUG = !!this.opts.debug;
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
		super.init(transit, messageHandler, afterConnect);

		if (this.broker) {
			this.registry = this.broker.registry;
			this.nodes = this.registry.nodes;
			this.nodes.disableHeartbeatChecks = true;
		}
	}

	/**
	 * Start UDP & TCP servers
	 *
	 * @memberof TcpTransporter
	 */
	connect() {
		this.logger.warn(kleur.yellow().bold("TCP Transporter is an EXPERIMENTAL transporter. Do NOT use it in production yet!"));

		return Promise.resolve()
			.then(() => {
				// Load offline nodes
				if (this.opts.urls)
					return this.loadUrls();
			})
			.then(() => this.startTcpServer())
			.then(() => this.startUdpServer())
			.then(() => this.startTimers())
			.then(() => {
				this.logger.info("TCP Transporter started.");
				this.connected = true;

				// Set the opened TCP port (because it is a random port by default)
				this.nodes.localNode.port = this.opts.port;

				// Regenerate local node INFO because port changed
				this.registry.regenerateLocalRawInfo();
			})
			.then(() => this.onConnected());
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

		this.writer.on("end", nodeID => {
			this.logger.debug(`TCP connection ended with '${nodeID}'`);
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
				//this.logger.info(`UDP discovery received from ${address} on ${nodeID}.`);
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

	loadUrls() {
		if (!this.opts.urls)
			return Promise.resolve();
		if (Array.isArray(this.opts.urls) && this.opts.urls.length == 0)
			return Promise.resolve();

		return Promise.resolve(this.opts.urls)
			.then(str => {
				if (_.isString(str) && str.startsWith("file://")) {
					const fName = str.replace("file://", "");
					this.logger.debug(`Load nodes list from file '${fName}'...`);
					let content = fs.readFileSync(fName);
					if (content && content.length > 0) {
						content = content.toString().trim();
						if (content.startsWith("{") || content.startsWith("["))
							return JSON.parse(content);
						else
							return content.split("\n").map(s => s.trim());
					}
				}

				return str;
			})
			.then(urls => {
				if (_.isString(urls)) {
					urls = urls.split(",").map(s => s.trim());
				} else if (_.isObject(urls) && !Array.isArray(urls)) {
					const list = [];
					_.forIn(urls, (s, nodeID) => list.push(`${s}/${nodeID}`));
					urls = list;
				}

				if (urls && urls.length > 0) {
					urls.map(s => {
						if (!s) return;

						if (s.startsWith("tcp://"))
							s = s.replace("tcp://", "");

						const p = s.split("/");
						if (p.length != 2)
							return this.logger.warn("Invalid endpoint URL. Missing nodeID. URL:", s);

						const u = p[0].split(":");
						if (u.length < 2)
							return this.logger.warn("Invalid endpoint URL. Missing port. URL:", s);

						const nodeID = p[1];
						const port = Number(u.pop());
						const host = u.join(":"); // support IPv6 addresses

						return { nodeID, host, port };
					}).forEach(ep => {
						if (!ep)
							return;

						if (ep.nodeID == this.nodeID) {
							// Read port from urls
							if (!this.opts.port)
								this.opts.port = ep.port;
						} else {
							// Create node as offline
							this.addOfflineNode(ep.nodeID, ep.host, ep.port);
						}
					});
				}

				this.nodes.disableOfflineNodeRemoving = true;
			});
	}

	/**
	 * Process incoming packets
	 *
	 * @param {String} type
	 * @param {Object} message
	 * @param {Socket} socket
	 */
	onIncomingMessage(type, message, socket) {
		return this.receive(type, message, socket);
	}

	/**
	 * Received data. It's a wrapper for middlewares.
	 * @param {String} cmd
	 * @param {Buffer} data
	 */
	receive(type, message, socket) {
		//console.log("<<", type, message.toString());

		switch(type) {
			case P.PACKET_GOSSIP_HELLO: return this.processGossipHello(message, socket);
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

		if (this.GOSSIP_DEBUG) this.logger.info(kleur.bgCyan().black(`----- HELLO ${this.nodeID} -> ${nodeID} -----`), packet.payload);

		return this.publish(packet).catch(() => {
			this.logger.debug(`Unable to send Gossip HELLO packet to ${nodeID}.`);
		});
	}


	/**
	 * Process incoming Gossip Hello packet
	 *
	 * @param {Buffer} msg
	 * @param {Socket} socket
	 */
	processGossipHello(msg, socket) {
		try {
			const packet = this.deserialize(P.PACKET_GOSSIP_HELLO, msg);
			const payload = packet.payload;
			const nodeID = payload.sender;

			if (this.GOSSIP_DEBUG) this.logger.info(`----- HELLO ${this.nodeID} <- ${payload.sender} -----`, payload);

			let node = this.nodes.get(nodeID);
			if (!node) {
				// Unknown node. Register as offline node
				node = this.addOfflineNode(nodeID, payload.host, payload.port);
			}
			if (!node.udpAddress)
				node.udpAddress = socket.remoteAddress;

		} catch(err) {
			this.logger.warn("Invalid incoming GOSSIP_HELLO packet");
			this.logger.debug("Content:", msg.toString());
		}
	}

	/**
	 * Create and send a Gossip request packet
	 */
	sendGossipRequest() {
		const list = this.nodes.toArray();
		if (!list || list.length <= 1)
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
			this.publish(packet).catch(() => {
				this.logger.debug(`Unable to send Gossip packet to ${ep.id}.`);
			});

			if (this.GOSSIP_DEBUG) this.logger.info(kleur.bgYellow().black(`----- REQUEST ${this.nodeID} -> ${ep.id} -----`), packet.payload);
		}
	}

	/**
	 * Process incoming Gossip Request packet
	 *
	 * @param {Buffer} msg
	 * @memberof TcpTransporter
	 */
	processGossipRequest(msg) {
		try {
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

						const info = this.registry.getLocalNodeInfo(true);
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

				if (this.GOSSIP_DEBUG) this.logger.info(kleur.bgMagenta().black(`----- RESPONSE ${this.nodeID} -> ${sender.id} -----`), rspPacket.payload);
			} else {
				if (this.GOSSIP_DEBUG) this.logger.info(kleur.bgBlue().white(`----- EMPTY RESPONSE ${this.nodeID} -> ${payload.sender} -----`));
			}

		} catch(err) {
			this.logger.warn("Invalid incoming GOSSIP_REQ packet");
			this.logger.debug("Content:", msg.toString());
		}
	}

	/**
	 * Process the incoming Gossip Response packet
	 *
	 * @param {Buffer} msg
	 * @memberof TcpTransporter
	 */
	processGossipResponse(msg) {
		try {
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
		} catch(err) {
			this.logger.warn("Invalid incoming GOSSIP_RES packet");
			this.logger.debug("Content:", msg.toString());
		}
	}


	/**
	 * Close TCP & UDP servers and destroy sockets.
	 *
	 * @memberof TcpTransporter
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
	 * @memberof TcpTransporter
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
	 * @memberof TcpTransporter
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

		const data = this.serialize(packet);
		return this.send(packet.type, data, { packet });
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
	send(topic, data, { packet }) {
		const packetID = resolvePacketID(packet.type);
		return this.writer.send(packet.target, packetID, data)
			.catch(err => {
				this.nodes.disconnected(packet.target, true);
				throw err;
			});
	}
}

module.exports = TcpTransporter;
