/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

const P = require("./packets");
const {Packet} = require("./packets");
const E = require("./errors");

const {Transform} = require("stream");

/**
 * Transit class
 *
 * @class Transit
 */
class Transit {

	/**
	 * Create an instance of Transit.
	 *
	 * @param {ServiceBroker} Broker instance
	 * @param {Transporter} Transporter instance
	 * @param {Object?} opts
	 *
	 * @memberof Transit
	 */
	constructor (broker, transporter, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("transit");
		this.nodeID = broker.nodeID;
		this.tx = transporter;
		this.opts = opts;

		this.pendingRequests = new Map();
		this.pendingReqStreams = new Map();
		this.pendingResStreams = new Map();

		this.stat = {
			packets: {
				sent: {
					count: 0,
					bytes: 0
				},
				received: {
					count: 0,
					bytes: 0
				}
			}
		};

		this.connected = false;
		this.disconnecting = false;
		this.isReady = false;

		if (this.tx) {
			this.tx.init(this, this.messageHandler.bind(this), this.afterConnect.bind(this));
		}

		this.__connectResolve = null;
	}

	/**
	 * It will be called after transporter connected or reconnected.
	 *
	 * @param {any} wasReconnect
	 * @returns {Promise}
	 *
	 * @memberof Transit
	 */
	afterConnect (wasReconnect) {
		return Promise.resolve()

			.then(() => {
				if (!wasReconnect)
					return this.makeSubscriptions();
			})

			.then(() => this.discoverNodes())
			.delay(500) // Waiting for incoming INFO packets

			.then(() => {
				this.connected = true;

				this.broker.broadcastLocal("$transporter.connected");

				if (this.__connectResolve) {
					this.__connectResolve();
					this.__connectResolve = null;
				}
			});
	}

	/**
	 * Connect with transporter. If failed, try again after 5 sec.
	 *
	 * @memberof Transit
	 */
	connect () {
		this.logger.info("Connecting to the transporter...");
		return new Promise(resolve => {
			this.__connectResolve = resolve;

			const doConnect = () => {
				let reconnectStarted = false;
				const errorHandler = (err) => {
					if (this.disconnecting) return;
					if (reconnectStarted) return;

					this.logger.warn("Connection is failed.", err && err.message || "Unknown error");
					this.logger.debug(err);

					if (this.opts.disableReconnect) {
						return;
					}

					reconnectStarted = true;

					setTimeout(() => {
						this.logger.info("Reconnecting...");
						doConnect();
					}, 5 * 1000);
				};
				/* istanbul ignore next */
				this.tx.connect(errorHandler).catch(errorHandler);
			};

			doConnect();

		});
	}

	/**
	 * Disconnect with transporter
	 *
	 * @memberof Transit
	 */
	disconnect () {
		this.connected = false;
		this.isReady = false;
		this.disconnecting = true;

		this.broker.broadcastLocal("$transporter.disconnected", {graceFul: true});

		if (this.tx.connected) {
			return this.sendDisconnectPacket()
				.then(() => this.tx.disconnect())
				.then(() => this.disconnecting = false);
		}

		this.disconnecting = false;
		/* istanbul ignore next */
		return Promise.resolve();
	}

	/**
	 * Local broker is ready (all services loaded).
	 * Send INFO packet to all other nodes
	 */
	ready () {
		if (this.connected) {
			this.isReady = true;
			return this.sendNodeInfo();
		}
	}

	/**
	 * Send DISCONNECT to remote nodes
	 *
	 * @returns {Promise}
	 *
	 * @memberof Transit
	 */
	sendDisconnectPacket () {
		return this.publish(new Packet(P.PACKET_DISCONNECT)).catch(err => this.logger.debug("Unable to send DISCONNECT packet.", err));
	}

	/**
	 * Subscribe to topics for transportation
	 *
	 * @memberof Transit
	 */
	makeSubscriptions () {
		this.subscribing = this.tx.makeSubscriptions([

			// Subscribe to broadcast events
			{cmd: P.PACKET_EVENT, nodeID: this.nodeID},

			// Subscribe to requests
			{cmd: P.PACKET_REQUEST, nodeID: this.nodeID},

			// Subscribe to node responses of requests
			{cmd: P.PACKET_RESPONSE, nodeID: this.nodeID},

			// Discover handler
			{cmd: P.PACKET_DISCOVER},
			{cmd: P.PACKET_DISCOVER, nodeID: this.nodeID},

			// NodeInfo handler
			{cmd: P.PACKET_INFO}, // Broadcasted INFO. If a new node connected
			{cmd: P.PACKET_INFO, nodeID: this.nodeID}, // Response INFO to DISCOVER packet

			// Disconnect handler
			{cmd: P.PACKET_DISCONNECT},

			// Heartbeat handler
			{cmd: P.PACKET_HEARTBEAT},

			// Ping handler
			{cmd: P.PACKET_PING}, // Broadcasted
			{cmd: P.PACKET_PING, nodeID: this.nodeID}, // Targeted

			// Pong handler
			{cmd: P.PACKET_PONG, nodeID: this.nodeID}

		]).then(() => {
			this.subscribing = null;
		});

		return this.subscribing;
	}

	/**
	 * Message handler for incoming packets
	 *
	 * @param {Array} topic
	 * @param {String} msg
	 * @returns {Boolean} If packet is processed return with `true`
	 *
	 * @memberof Transit
	 */
	messageHandler (cmd, packet) {
		try {
			const payload = packet.payload;

			// Check payload
			if (!payload) {
				/* istanbul ignore next */
				throw new E.MoleculerServerError("Missing response payload.", 500, "MISSING_PAYLOAD");
			}

			// Check protocol version
			if (payload.ver !== this.broker.PROTOCOL_VERSION) {
				throw new E.ProtocolVersionMismatchError({
					nodeID: payload.sender,
					actual: this.broker.PROTOCOL_VERSION,
					received: payload.ver
				});
			}

			// Skip own packets (if only built-in balancer disabled)
			if (payload.sender === this.nodeID && (cmd !== P.PACKET_EVENT && cmd !== P.PACKET_REQUEST && cmd !== P.PACKET_RESPONSE))
				return;

			// log only if packet type was not disabled by options
			if (!this.opts.packetLogFilter.includes(cmd)) {
				this.logger.debug(`Incoming ${cmd} packet from '${payload.sender}'`);
			}

			// Request
			if (cmd === P.PACKET_REQUEST) {
				return this._requestHandler(payload);
			}

			// Response
			else if (cmd === P.PACKET_RESPONSE) {
				this._responseHandler(payload);
			}

			// Event
			else if (cmd === P.PACKET_EVENT) {
				this._eventHandler(payload);
			}

			// Discover
			else if (cmd === P.PACKET_DISCOVER) {
				this.sendNodeInfo(payload.sender);
			}

			// Node info
			else if (cmd === P.PACKET_INFO) {
				this.broker.registry.processNodeInfo(payload);
			}

			// Disconnect
			else if (cmd === P.PACKET_DISCONNECT) {
				this.broker.registry.nodeDisconnected(payload);
			}

			// Heartbeat
			else if (cmd === P.PACKET_HEARTBEAT) {
				this.broker.registry.nodeHeartbeat(payload);
			}

			// Ping
			else if (cmd === P.PACKET_PING) {
				this.sendPong(payload);
			}

			// Pong
			else if (cmd === P.PACKET_PONG) {
				this.processPong(payload);
			}

			return true;
		} catch (err) {
			this.logger.error(err, cmd, packet);
		}
		return false;
	}

	/**
	 * Handle incoming event
	 *
	 * @param {any} payload
	 * @memberof Transit
	 */
	_eventHandler (payload) {
		this.logger.debug(`Event '${payload.event}' received from '${payload.sender}' node` + (payload.groups ? ` in '${payload.groups.join(", ")}' group(s)` : "") + ".");

		if (!this.broker.started) {
			this.logger.warn(`Incoming '${payload.event}' event from '${payload.sender}' node is dropped, because broker is stopped.`);
		}

		this.broker.emitLocalServices(payload.event, payload.data, payload.groups, payload.sender, payload.broadcast);
	}

	/**
	 * Handle incoming request
	 *
	 * @param {Object} payload
	 *
	 * @memberof Transit
	 */
	_requestHandler (payload) {
		this.logger.debug(`Request '${payload.action}' received from '${payload.sender}' node.`);

		try {
			if (!this.broker.started) {
				this.logger.warn(`Incoming '${payload.action}' request from '${payload.sender}' node is dropped, because broker is stopped.`);
				throw new E.ServiceNotAvailableError({action: payload.action, nodeID: this.nodeID});
			}

			let pass;
			if (payload.stream !== undefined) {
				pass = this.pendingReqStreams.get(payload.id);
				if (pass) {
					if (!payload.stream) {

						// Check stream error
						if (payload.meta["$streamError"]) {
							pass.emit("error", this._createErrFromPayload(payload.meta["$streamError"], payload.sender));
						}

						this.logger.debug(`Stream closing is received from '${payload.sender}'.`);

						// End of stream
						pass.end();

						// Remove pending request
						this.removePendingRequest(payload.id);

						return;

					} else {
						this.logger.debug(`Stream chunk is received from '${payload.sender}'.`);
						// stream chunk received
						pass.write(payload.params.type === "Buffer" ? new Buffer.from(payload.params.data) : payload.params);

						return;
					}

				} else if (payload.stream) {
					this.logger.debug(`New stream is received from '${payload.sender}'.`);

					// Create a new pass stream
					pass = new Transform({
						transform: function(chunk, encoding, done) {
							this.push(chunk);
							return done();
						}
					});
					this.pendingReqStreams.set(payload.id, pass);
				}
			}

			const endpoint = this.broker._getLocalActionEndpoint(payload.action);

			// Recreate caller context
			const ctx = new this.broker.ContextFactory(this.broker, endpoint);
			ctx.id = payload.id;
			ctx.setParams(pass ? pass : payload.params);
			ctx.parentID = payload.parentID;
			ctx.requestID = payload.requestID;
			ctx.meta = payload.meta || {};
			ctx.level = payload.level;
			ctx.metrics = !!payload.metrics;
			ctx.nodeID = payload.sender;

			ctx.options.timeout = payload.timeout || this.broker.options.requestTimeout || 0;

			const p = endpoint.action.handler(ctx);
			// Pointer to Context
			p.ctx = ctx;

			return p
				.then(res => this.sendResponse(payload.sender, payload.id, ctx.meta, res, null))
				.catch(err => this.sendResponse(payload.sender, payload.id, ctx.meta, null, err));

		} catch (err) {
			return this.sendResponse(payload.sender, payload.id, payload.meta, null, err);
		}
	}

	_createErrFromPayload (error, sender) {
		let err = E.recreateError(error);
		if (!err) {
			err = new Error(error.message);
			err.name = error.name;
			err.code = error.code;
			err.type = error.type;
			err.data = error.data;
		}
		err.message += ` (NodeID: ${sender})`;
		err.retryable = error.retryable;
		err.nodeID = error.nodeID || sender;
		if (error.stack)
			err.stack = error.stack;

		return err;
	}

	/**
	 * Process incoming response of request
	 *
	 * @param {Object} packet
	 *
	 * @memberof Transit
	 */
	_responseHandler (packet) {
		const id = packet.id;
		const req = this.pendingRequests.get(id);

		// If not exists (timed out), we skip response processing
		if (req == null) {
			this.logger.debug("Orphan response is received. Maybe the request is timed out earlier. ID:", packet.id, ", Sender:", packet.sender);
			return;
		}

		this.logger.debug(`Response '${req.action.name}' is received from '${packet.sender}'.`);

		// Update nodeID in context (if it uses external balancer)
		req.ctx.nodeID = packet.sender;

		// Merge response meta with original meta
		_.assign(req.ctx.meta, packet.meta);

		// Handle stream repose
		if (packet.stream != null) {
			//get the underlined stream for id
			let pass = this.pendingResStreams.get(id);
			if (pass) {
				if (!packet.stream) {
					// Received error?
					if (!packet.success)
						pass.emit("error", this._createErrFromPayload(packet.error, packet.sender));

					this.logger.debug(`Stream closing is received from '${packet.sender}'`);

					// End of stream
					pass.end();

					// Remove pending request
					this.removePendingRequest(id);

				} else {
					// stream chunk
					this.logger.debug(`Stream chunk is received from '${packet.sender}'`);
					pass.write(packet.data.type === "Buffer" ? new Buffer.from(packet.data.data) : packet.data);
				}
				return req.resolve(packet.data);

			} else if (packet.stream) {
				// Create a new pass stream
				this.logger.debug(`New stream is received from '${packet.sender}'`);

				pass = new Transform({
					transform: function(chunk, encoding, done) {
						this.push(chunk);
						return done();
					}
				});
				this.pendingResStreams.set(id, pass);
				return req.resolve(pass);
			}
		}

		// Remove pending request
		this.removePendingRequest(id);

		if (!packet.success) {
			req.reject(this._createErrFromPayload(packet.error, packet.sender));
		} else {
			req.resolve(packet.data);
		}
	}

	/**
	 * Send a request to a remote service. It returns a Promise
	 * what will be resolved when the response received.
	 *
	 * @param {<Context>} ctx            Context of request
	 * @returns    {Promise}
	 *
	 * @memberof Transit
	 */
	request (ctx) {
		if (this.opts.maxQueueSize && this.pendingRequests.size > this.opts.maxQueueSize)
			return Promise.reject(new E.QueueIsFullError({
				action: ctx.action.name,
				nodeID: this.nodeID,
				size: this.pendingRequests.length,
				limit: this.opts.maxQueueSize
			}));

		// Expanded the code that v8 can optimize it.  (TryCatchStatement disable optimizing)
		return new Promise((resolve, reject) => this._sendRequest(ctx, resolve, reject));
	}

	/**
	 * Send a remote request
	 *
	 * @param {<Context>} ctx        Context of request
	 * @param {Function} resolve    Resolve of Promise
	 * @param {Function} reject    Reject of Promise
	 *
	 * @memberof Transit
	 */
	_sendRequest (ctx, resolve, reject) {
		const isStream = ctx.params && ctx.params.readable === true && typeof ctx.params.on === "function" && typeof ctx.params.pipe === "function";

		const request = {
			action: ctx.action,
			nodeID: ctx.nodeID,
			ctx,
			resolve,
			reject,
			stream: isStream // ???
		};

		const payload = {
			id: ctx.id,
			action: ctx.action.name,
			params: isStream ? null : ctx.params,
			meta: ctx.meta,
			timeout: ctx.options.timeout,
			level: ctx.level,
			metrics: ctx.metrics,
			parentID: ctx.parentID,
			requestID: ctx.requestID,
			stream: isStream
		};

		const packet = new Packet(P.PACKET_REQUEST, ctx.nodeID, payload);

		const nodeName = ctx.nodeID ? `'${ctx.nodeID}'` : "someone";
		this.logger.debug(`Send '${ctx.action.name}' request to ${nodeName} node.`);

		const publishCatch = err => this.logger.error(`Unable to send '${ctx.action.name}' request to ${nodeName} node.`, err);

		// Add to pendings
		this.pendingRequests.set(ctx.id, request);

		// Publish request
		this.publish(packet)
			.then(() => {
				if (isStream) {
					// Skip to send ctx.meta with chunks because it doesn't appear on the remote side.
					payload.meta = {};

					const stream = ctx.params;
					stream.on("data", chunk => {
						const copy = Object.assign({}, payload);
						copy.stream = true;
						copy.params = chunk;
						stream.pause();

						this.logger.debug(`Send stream chunk to ${nodeName} node.`);

						return this.publish(new Packet(P.PACKET_REQUEST, ctx.nodeID, copy))
							.then(() => stream.resume())
							.catch(publishCatch);
					});

					stream.on("end", () => {
						const copy = Object.assign({}, payload);
						copy.params = null;
						copy.stream = false;

						this.logger.debug(`Send stream ending to ${nodeName} node.`);

						return this.publish(new Packet(P.PACKET_REQUEST, ctx.nodeID, copy))
							.catch(publishCatch);
					});

					stream.on("error", err => {
						const copy = Object.assign({}, payload);
						copy.stream = false;
						copy.meta["$streamError"] = this._createPayloadErrorField(err);
						copy.params = null;

						this.logger.debug(`Send stream error to ${nodeName} node.`, copy.meta["$streamError"]);

						return this.publish(new Packet(P.PACKET_REQUEST, ctx.nodeID, copy))
							.catch(publishCatch);
					});
				}
			})
			.catch(err => {
				publishCatch(err);
				reject(err);
			});
	}

	/**
	 * Send a broadcast event to a remote node
	 *
	 * @param {String} nodeID
	 * @param {String} event
	 * @param {any} data
	 *
	 * @memberof Transit
	 */
	sendBroadcastEvent (nodeID, event, data, groups) {
		this.logger.debug(`Send '${event}' event to '${nodeID}' node` + (groups ? ` in '${groups.join(", ")}' group(s)` : "") + ".");

		this.publish(new Packet(P.PACKET_EVENT, nodeID, {
			event,
			data,
			groups,
			broadcast: true
		})).catch(err => this.logger.error(`Unable to send '${event}' broadcast event to '${nodeID}' node.`, err));
	}

	/**
	 * Send a grouped event to remote nodes.
	 * The event is balanced internally.
	 *
	 * @param {String} event
	 * @param {any} data
	 * @param {Object} nodeGroups
	 *
	 * @memberof Transit
	 */
	sendBalancedEvent (event, data, nodeGroups) {
		_.forIn(nodeGroups, (groups, nodeID) => {
			this.logger.debug(`Send '${event}' event to '${nodeID}' node` + (groups ? ` in '${groups.join(", ")}' group(s)` : "") + ".");

			this.publish(new Packet(P.PACKET_EVENT, nodeID, {
				event,
				data,
				groups,
				broadcast: false
			})).catch(err => this.logger.error(`Unable to send '${event}' event to '${nodeID}' node.`, err));
		});
	}

	/**
	 * Send an event to groups.
	 * The event is balanced by transporter
	 *
	 * @param {String} event
	 * @param {any} data
	 * @param {Object} groups
	 *
	 * @memberof Transit
	 */
	sendEventToGroups (event, data, groups) {
		this.logger.debug(`Send '${event}' event to '${groups.join(", ")}' group(s).`);
		this.publish(new Packet(P.PACKET_EVENT, null, {
			event,
			data,
			groups,
			broadcast: false
		})).catch(err => this.logger.error(`Unable to send '${event}' event to groups.`, err));
	}

	/**
	 * Remove a pending request
	 *
	 * @param {any} id
	 *
	 * @memberof Transit
	 */
	removePendingRequest (id) {
		this.pendingRequests.delete(id);

		this.pendingReqStreams.delete(id);
		this.pendingResStreams.delete(id);
	}

	/**
	 * Remove a pending request & streams
	 *
	 * @param {String} nodeID
	 *
	 * @memberof Transit
	 */
	removePendingRequestByNodeID (nodeID) {
		this.logger.debug(`Remove pending requests of '${nodeID}' node.`);
		this.pendingRequests.forEach((req, id) => {
			if (req.nodeID === nodeID) {
				this.pendingRequests.delete(id);

				// Reject the request
				req.reject(new E.RequestRejectedError({
					action: req.action.name,
					nodeID: req.nodeID
				}));

				this.pendingReqStreams.delete(id);
				this.pendingResStreams.delete(id);
			}
		});
	}

	/**
	 * Create error field in outgoing payload
	 *
	 * @param {Error} err
	 * @returns {Object}
	 * @memberof Transit
	 */
	_createPayloadErrorField (err) {
		return {
			name: err.name,
			message: err.message,
			nodeID: err.nodeID || this.nodeID,
			code: err.code,
			type: err.type,
			retryable: err.retryable,
			stack: err.stack,
			data: err.data
		};
	}

	/**
	 * Send back the response of request
	 *
	 * @param {String} nodeID
	 * @param {String} id
	 * @param {any} meta
	 * @param {any} data
	 * @param {Error} err
	 *
	 * @memberof Transit
	 */
	sendResponse (nodeID, id, meta, data, err) {
		// Publish the response
		const payload = {
			id: id,
			meta: meta,
			success: err == null,
			data: data
		};

		if (err)
			payload.error = this._createPayloadErrorField(err);

		const publishCatch = err => this.logger.error(`Unable to send '${id}' response to '${nodeID}' node.`, err);

		if (data && data.readable === true && typeof data.on === "function" && typeof data.pipe === "function") {
			// Streaming response
			payload.stream = true;
			const stream = data;
			stream.pause();

			stream.on("data", chunk => {
				const copy = Object.assign({}, payload);
				copy.stream = true;
				copy.data = chunk;
				stream.pause();

				this.logger.debug(`Send stream chunk to ${nodeID} node.`);

				return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, copy))
					.then(() => stream.resume())
					.catch(publishCatch);
			});

			stream.on("end", () => {
				const copy = Object.assign({}, payload);
				copy.data = null;
				copy.stream = false;

				this.logger.debug(`Send stream ending to ${nodeID} node.`);

				return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, copy))
					.catch(publishCatch);
			});

			stream.on("error", err => {
				const copy = Object.assign({}, payload);
				copy.stream = false;
				if (err) {
					copy.success = false;
					copy.error = this._createPayloadErrorField(err);
				}

				this.logger.debug(`Send stream error to ${nodeID} node.`, copy.error);

				return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, copy))
					.catch(publishCatch);
			});

			payload.data = null;
			return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, payload))
				.then(() => {
					if (payload.stream)
						stream.resume();
				})
				.catch(publishCatch);

		}

		return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, payload))
			.catch(publishCatch);
	}

	/**
	 * Discover other nodes. It will be called after success connect.
	 *
	 * @memberof Transit
	 */
	discoverNodes () {
		return this.publish(new Packet(P.PACKET_DISCOVER))
			.catch(err => this.logger.error("Unable to send DISCOVER packet.", err));
	}

	/**
	 * Discover a node. It will be called if we got message from an unknown node.
	 *
	 * @memberof Transit
	 */
	discoverNode (nodeID) {
		return this.publish(new Packet(P.PACKET_DISCOVER, nodeID))
			.catch(err => this.logger.error(`Unable to send DISCOVER packet to '${nodeID}' node.`, err));
	}

	/**
	 * Send node info package to other nodes.
	 *
	 * @memberof Transit
	 */
	sendNodeInfo (nodeID) {
		if (!this.connected || !this.isReady) return Promise.resolve();

		const info = this.broker.getLocalNodeInfo();

		let p = Promise.resolve();
		if (!nodeID)
			p = this.tx.makeBalancedSubscriptions();

		return p.then(() => this.publish(new Packet(P.PACKET_INFO, nodeID, {
			services: info.services,
			ipList: info.ipList,
			hostname: info.hostname,
			client: info.client,
			config: info.config,
			seq: info.seq
		}))).catch(err => this.logger.error(`Unable to send INFO packet to '${nodeID}' node.`, err));

	}

	/**
	 * Send ping to a node (or all nodes if nodeID is null)
	 *
	 * @param {String} nodeID
	 * @returns
	 * @memberof Transit
	 */
	sendPing (nodeID) {
		return this.publish(new Packet(P.PACKET_PING, nodeID, {time: Date.now()}))
			.catch(err => this.logger.error(`Unable to send PING packet to '${nodeID}' node.`, err));
	}

	/**
	 * Send back pong response
	 *
	 * @param {Object} payload
	 * @returns
	 * @memberof Transit
	 */
	sendPong (payload) {
		return this.publish(new Packet(P.PACKET_PONG, payload.sender, {
			time: payload.time,
			arrived: Date.now()
		})).catch(err => this.logger.error(`Unable to send PONG packet to '${payload.sender}' node.`, err));
	}

	/**
	 * Process incoming PONG packet.
	 * Measure ping time & current time difference.
	 *
	 * @param {Object} payload
	 * @memberof Transit
	 */
	processPong (payload) {
		const now = Date.now();
		const elapsedTime = now - payload.time;
		const timeDiff = Math.round(now - payload.arrived - elapsedTime / 2);

		// this.logger.debug(`PING-PONG from '${payload.sender}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms`);

		this.broker.broadcastLocal("$node.pong", {nodeID: payload.sender, elapsedTime, timeDiff});
	}

	/**
	 * Send a node heartbeat. It will be called with timer
	 *
	 * @memberof Transit
	 */
	sendHeartbeat (localNode) {
		return this.publish(new Packet(P.PACKET_HEARTBEAT, null, {
			cpu: localNode.cpu
		})).catch(err => this.logger.error("Unable to send HEARTBEAT packet.", err));

	}

	/**
	 * Subscribe via transporter
	 *
	 * @param {String} topic
	 * @param {String=} nodeID
	 *
	 * @memberof Transit
	 */
	subscribe (topic, nodeID) {
		return this.tx.subscribe(topic, nodeID);
	}

	/**
	 * Publish via transporter
	 *
	 * @param {Packet} Packet
	 *
	 * @memberof Transit
	 */
	publish (packet) {
		// log only if packet type was not disabled by options
		if (!this.opts.packetLogFilter.includes(packet.type)) {
			this.logger.debug(`Send ${packet.type} packet to '${packet.target || "<all nodes>"}'`);
		}

		if (this.subscribing) {
			return this.subscribing
				.then(() => {
					return this.tx.prepublish(packet);
				});
		}
		return this.tx.prepublish(packet);
	}

}

module.exports = Transit;
