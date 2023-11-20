// @ts-check
/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const P = require("./packets");
const { Packet } = require("./packets");
const E = require("./errors");

const { Transform } = require("stream");
const { METRIC } = require("./metrics");
const C = require("./constants");

/**
 * @typedef {import("./service-broker")} ServiceBroker
 * @typedef {import("./transporters/base")} Transporter
 * @typedef {import("stream").Stream} Stream
 * @typedef {import("./context")} Context
 */

/**
 * Transit class
 *
 * @class Transit
 */
class Transit {
	/**
	 * Create an instance of Transit.
	 *
	 * @param {ServiceBroker} broker
	 * @param {Transporter} transporter
	 * @param {Object?} opts
	 *
	 * @memberof Transit
	 */
	constructor(broker, transporter, opts) {
		this.broker = broker;
		this.Promise = broker.Promise;
		this.logger = broker.getLogger("transit");
		this.nodeID = broker.nodeID;
		this.metrics = broker.metrics;
		this.instanceID = broker.instanceID;
		this.tx = transporter;
		this.opts = opts;
		this.discoverer = broker.registry.discoverer;
		this.errorRegenerator = broker.errorRegenerator;

		this.pendingRequests = new Map();
		this.pendingReqStreams = new Map();
		this.pendingResStreams = new Map();

		this.connected = false;
		this.disconnecting = false;
		this.isReady = false;

		const wrappedMessageHandler = (cmd, packet) => this.messageHandler(cmd, packet);

		this.publish = this.broker.wrapMethod("transitPublish", this.publish, this);
		this.messageHandler = this.broker.wrapMethod(
			"transitMessageHandler",
			this.messageHandler,
			this
		);

		if (this.tx) {
			this.tx.init(this, wrappedMessageHandler, this.afterConnect.bind(this));

			this.tx.send = this.broker.wrapMethod("transporterSend", this.tx.send, this.tx);
			this.tx.receive = this.broker.wrapMethod(
				"transporterReceive",
				this.tx.receive,
				this.tx,
				{ reverse: true }
			);
		}

		this.__connectResolve = null;

		this.registerMoleculerMetrics();
	}

	/**
	 * Register Moleculer Transit Core metrics.
	 */
	registerMoleculerMetrics() {
		if (!this.broker.isMetricsEnabled()) return;

		this.metrics
			.register({
				name: METRIC.MOLECULER_TRANSIT_READY,
				type: METRIC.TYPE_GAUGE,
				description: "Transit is ready"
			})
			?.set(0);
		this.metrics
			.register({
				name: METRIC.MOLECULER_TRANSIT_CONNECTED,
				type: METRIC.TYPE_GAUGE,
				description: "Transit is connected"
			})
			?.set(0);

		this.metrics.register({
			name: METRIC.MOLECULER_TRANSIT_PONG_TIME,
			type: METRIC.TYPE_GAUGE,
			labelNames: ["targetNodeID"],
			description: "Ping time"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_TRANSIT_PONG_SYSTIME_DIFF,
			type: METRIC.TYPE_GAUGE,
			labelNames: ["targetNodeID"],
			description: "System time difference between nodes"
		});

		this.metrics.register({
			name: METRIC.MOLECULER_TRANSIT_ORPHAN_RESPONSE_TOTAL,
			type: METRIC.TYPE_COUNTER,
			description: "Number of orphan responses"
		});
	}

	/**
	 * It will be called after transporter connected or reconnected.
	 *
	 * @param {any} wasReconnect
	 * @returns {Promise}
	 *
	 * @memberof Transit
	 */
	afterConnect(wasReconnect) {
		return this.Promise.resolve()

			.then(() => {
				if (wasReconnect) {
					// After reconnecting, we should send a broadcast INFO packet because there may new nodes.
					// In case of disabled balancer, it triggers the `makeBalancedSubscriptions` method.
					return this.discoverer.sendLocalNodeInfo();
				} else {
					// After connecting we should subscribe to topics
					return this.makeSubscriptions();
				}
			})

			.then(() => this.discoverer.discoverAllNodes())
			.delay(500) // Waiting for incoming INFO packets

			.then(() => {
				this.connected = true;
				this.metrics.set(METRIC.MOLECULER_TRANSIT_CONNECTED, 1);

				this.broker.broadcastLocal("$transporter.connected", {
					wasReconnect: !!wasReconnect
				});

				if (this.__connectResolve) {
					this.isReady = true;
					this.__connectResolve(null);
					this.__connectResolve = null;
				}

				return null;
			});
	}

	/**
	 * Connect with transporter. If failed, try again after 5 sec.
	 *
	 * @memberof Transit
	 */
	connect() {
		this.logger.info("Connecting to the transporter...");
		return new this.Promise(resolve => {
			this.__connectResolve = resolve;

			const doConnect = () => {
				let reconnectStarted = false;

				/* istanbul ignore next */
				const errorHandler = err => {
					if (this.disconnecting) return;
					if (reconnectStarted) return;

					this.logger.warn(
						"Connection is failed.",
						(err && err.message) || "Unknown error"
					);
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
	disconnect() {
		this.connected = false;
		this.isReady = false;
		this.disconnecting = true;
		this.metrics.set(METRIC.MOLECULER_TRANSIT_CONNECTED, 0);

		this.broker.broadcastLocal("$transporter.disconnected", { graceFul: true });

		return this.Promise.resolve()
			.then(() => {
				if (this.tx.connected) {
					return this.discoverer.localNodeDisconnected().then(() => this.tx.disconnect());
				}
			})
			.then(() => (this.disconnecting = false));
	}

	/**
	 * Local broker is ready (all services loaded).
	 * Send INFO packet to all other nodes
	 */
	ready() {
		if (this.connected) {
			this.metrics.set(METRIC.MOLECULER_TRANSIT_READY, 1);
			// We do nothing here because INFO packets are sent during the starting process.
			return;
		}
	}

	/**
	 * Send DISCONNECT to remote nodes
	 *
	 * @returns {Promise}
	 *
	 * @memberof Transit
	 */
	sendDisconnectPacket() {
		return this.publish(new Packet(P.PACKET_DISCONNECT)).catch(
			/* istanbul ignore next */ err =>
				this.logger.debug("Unable to send DISCONNECT packet.", err)
		);
	}

	/**
	 * Subscribe to topics for transportation
	 *
	 * @memberof Transit
	 */
	makeSubscriptions() {
		this.subscribing = this.tx
			.makeSubscriptions([
				// Subscribe to broadcast events
				{ cmd: P.PACKET_EVENT, nodeID: this.nodeID },

				// Subscribe to requests
				{ cmd: P.PACKET_REQUEST, nodeID: this.nodeID },

				// Subscribe to node responses of requests
				{ cmd: P.PACKET_RESPONSE, nodeID: this.nodeID },

				// Discover handler
				{ cmd: P.PACKET_DISCOVER },
				{ cmd: P.PACKET_DISCOVER, nodeID: this.nodeID },

				// NodeInfo handler
				{ cmd: P.PACKET_INFO }, // Broadcasted INFO. If a new node connected
				{ cmd: P.PACKET_INFO, nodeID: this.nodeID }, // Response INFO to DISCOVER packet

				// Disconnect handler
				{ cmd: P.PACKET_DISCONNECT },

				// Heartbeat handler
				{ cmd: P.PACKET_HEARTBEAT },

				// Ping handler
				{ cmd: P.PACKET_PING }, // Broadcasted
				{ cmd: P.PACKET_PING, nodeID: this.nodeID }, // Targeted

				// Pong handler
				{ cmd: P.PACKET_PONG, nodeID: this.nodeID }
			])
			.then(() => {
				this.subscribing = null;
			});

		return this.subscribing;
	}

	/**
	 * Message handler for incoming packets
	 *
	 * @param {string} cmd
	 * @param {Packet} packet
	 * @returns {Promise<boolean>} If packet is processed resolve with `true` else `false`
	 *
	 * @memberof Transit
	 */
	messageHandler(cmd, packet) {
		try {
			const payload = packet.payload;

			// Check payload
			if (!payload) {
				/* istanbul ignore next */
				throw new E.MoleculerServerError(
					"Missing response payload.",
					500,
					"MISSING_PAYLOAD"
				);
			}

			// Check protocol version
			if (payload.ver !== this.broker.PROTOCOL_VERSION && !this.opts.disableVersionCheck) {
				throw new E.ProtocolVersionMismatchError({
					nodeID: payload.sender,
					actual: this.broker.PROTOCOL_VERSION,
					received: payload.ver
				});
			}

			if (payload.sender === this.nodeID) {
				// Detect nodeID conflict
				if (cmd === P.PACKET_INFO && payload.instanceID !== this.instanceID) {
					this.broker.fatal(
						"ServiceBroker has detected a nodeID conflict, use unique nodeIDs. ServiceBroker stopped."
					);
					return this.Promise.resolve(false);
				}

				// Skip own packets (if only built-in balancer disabled)
				if (cmd !== P.PACKET_EVENT && cmd !== P.PACKET_REQUEST && cmd !== P.PACKET_RESPONSE)
					return this.Promise.resolve(false);
			}

			// Request
			if (cmd === P.PACKET_REQUEST) {
				return this.requestHandler(payload).then(() => true);
			}

			// Response
			else if (cmd === P.PACKET_RESPONSE) {
				this.responseHandler(payload);
			}

			// Event
			else if (cmd === P.PACKET_EVENT) {
				return this.eventHandler(payload);
			}

			// Discover
			else if (cmd === P.PACKET_DISCOVER) {
				this.discoverer.sendLocalNodeInfo(payload.sender);
			}

			// Node info
			else if (cmd === P.PACKET_INFO) {
				this.discoverer.processRemoteNodeInfo(payload.sender, payload);
			}

			// Disconnect
			else if (cmd === P.PACKET_DISCONNECT) {
				this.discoverer.remoteNodeDisconnected(payload.sender, false);
			}

			// Heartbeat
			else if (cmd === P.PACKET_HEARTBEAT) {
				this.discoverer.heartbeatReceived(payload.sender, payload);
			}

			// Ping
			else if (cmd === P.PACKET_PING) {
				this.sendPong(payload);
			}

			// Pong
			else if (cmd === P.PACKET_PONG) {
				this.processPong(payload);
			}

			return this.Promise.resolve(true);
		} catch (err) {
			this.logger.error(err, cmd, packet);

			this.broker.broadcastLocal("$transit.error", {
				error: err,
				module: "transit",
				type: C.FAILED_PROCESSING_PACKET
			});
		}
		return this.Promise.resolve(false);
	}

	/**
	 * Handle incoming event
	 *
	 * @param {any} payload
	 * @returns {Promise<boolean>}
	 * @memberof Transit
	 */
	eventHandler(payload) {
		this.logger.debug(
			`Event '${payload.event}' received from '${payload.sender}' node` +
				(payload.groups ? ` in '${payload.groups.join(", ")}' group(s)` : "") +
				"."
		);

		if (this.broker.stopping) {
			this.logger.warn(
				`Incoming '${payload.event}' event from '${payload.sender}' node is dropped, because broker is stopped.`
			);
			// return false so the transporter knows this event wasn't handled.
			return this.Promise.resolve(false);
		}

		// Create caller context
		const ctx = new this.broker.ContextFactory(this.broker);
		ctx.id = payload.id;
		ctx.eventName = payload.event;
		ctx.setParams(payload.data, this.broker.options.contextParamsCloning);
		ctx.eventGroups = payload.groups;
		ctx.eventType = payload.broadcast ? "broadcast" : "emit";
		ctx.meta = payload.meta || {};
		ctx.headers = payload.headers || {};
		ctx.level = payload.level;
		ctx.tracing = !!payload.tracing;
		ctx.parentID = payload.parentID;
		ctx.requestID = payload.requestID;
		ctx.caller = payload.caller;
		ctx.nodeID = payload.sender;

		// ensure the eventHandler resolves true when the event was handled successfully
		return this.broker
			.emitLocalServices(ctx)
			.then(() => true)
			.catch(err => {
				this.logger.error(err);

				return false;
			});
	}

	/**
	 * Handle incoming request
	 *
	 * @param {Object} payload
	 * @returns {Promise<any>}
	 * @memberof Transit
	 */
	requestHandler(payload) {
		const requestID = payload.requestID ? "with requestID '" + payload.requestID + "' " : "";
		this.logger.debug(
			`<= Request '${payload.action}' ${requestID}received from '${payload.sender}' node.`
		);

		try {
			if (this.broker.stopping) {
				this.logger.warn(
					`Incoming '${payload.action}' ${requestID}request from '${payload.sender}' node is dropped because broker is stopped.`
				);
				throw new E.ServiceNotAvailableError({
					action: payload.action,
					nodeID: this.nodeID
				});
			}

			let stream;
			if (payload.stream !== undefined) {
				stream = this._handleIncomingRequestStream(payload);
				// eslint-disable-next-line security/detect-possible-timing-attacks
				if (stream === null) return this.Promise.resolve();
			}

			const endpoint = this.broker._getLocalActionEndpoint(payload.action);

			// Recreate caller context
			const ctx = new this.broker.ContextFactory(this.broker);
			ctx.setEndpoint(endpoint);
			ctx.id = payload.id;
			ctx.setParams(payload.params, this.broker.options.contextParamsCloning);
			if (stream) {
				ctx.stream = stream;
			}
			ctx.parentID = payload.parentID;
			ctx.requestID = payload.requestID;
			ctx.caller = payload.caller;
			ctx.meta = payload.meta || {};
			ctx.headers = payload.headers || {};
			ctx.level = payload.level;
			ctx.tracing = payload.tracing;
			ctx.nodeID = payload.sender;

			if (payload.timeout != null) ctx.options.timeout = payload.timeout;

			const p = endpoint.action.handler(ctx);
			// Pointer to Context
			p.ctx = ctx;

			return p
				.then(res =>
					this.sendResponse(
						payload.sender,
						payload.id,
						ctx.meta,
						ctx.responseHeaders,
						res,
						null
					)
				)
				.catch(err =>
					this.sendResponse(
						payload.sender,
						payload.id,
						ctx.meta,
						ctx.responseHeaders,
						null,
						err
					)
				);
		} catch (err) {
			return this.sendResponse(payload.sender, payload.id, payload.meta, null, null, err);
		}
	}

	/**
	 * Handle incoming request stream.
	 *
	 * @param {Object} payload
	 * @returns {Stream|false|null}
	 */
	_handleIncomingRequestStream(payload) {
		let stream = this.pendingReqStreams.get(payload.id);

		if (!payload.stream && !stream && !payload.seq) {
			// It is not a stream data
			return false;
		}

		if (!stream) {
			this.logger.debug(
				`<= New stream is received from '${payload.sender}'. Seq: ${payload.seq}`
			);

			// Create a new pass stream
			stream = new Transform({
				// TODO: It's incorrect because the chunks may receive in random order, so it processes an empty meta.
				// Meta is filled correctly only in the 0. chunk.
				objectMode: payload.headers?.$streamObjectMode,
				transform: function (chunk, encoding, done) {
					this.push(chunk);
					return done();
				}
			});

			delete payload.headers?.$streamObjectMode;

			stream.$prevSeq = -1;
			stream.$pool = new Map();

			this.pendingReqStreams.set(payload.id, stream);
		}

		if (payload.seq > stream.$prevSeq + 1) {
			// Some chunks are late. Store these chunks.
			this.logger.debug(
				`Put the chunk into pool (size: ${stream.$pool.size}). Seq: ${payload.seq}`
			);

			stream.$pool.set(payload.seq, payload);

			// TODO: start timer.
			// TODO: check length of pool.
			// TODO: reset seq

			return null;
		}

		// the next stream chunk received
		stream.$prevSeq = payload.seq;

		if (stream.$prevSeq > 0) {
			if (!payload.stream) {
				// Check stream error
				if (payload.headers?.$streamError) {
					stream.emit(
						"error",
						this._createErrFromPayload(payload.headers.$streamError, payload)
					);
					delete payload.headers.$streamError;
				}

				this.logger.debug(
					`<= Stream closing is received from '${payload.sender}'. Seq: ${payload.seq}`
				);

				// End of stream
				stream.end();

				// Remove pending request stream
				this.pendingReqStreams.delete(payload.id);

				return null;
			} else {
				this.logger.debug(
					`<= Stream chunk is received from '${payload.sender}'. Seq: ${payload.seq}`
				);
				stream.write(
					payload.params?.type === "Buffer"
						? Buffer.from(payload.params.data)
						: payload.params
				);
			}
		}

		// Check newer chunks in the pool
		if (stream.$pool.size > 0) {
			this.logger.debug(`Has stored packets. Size: ${stream.$pool.size}`);
			const nextSeq = stream.$prevSeq + 1;
			const nextPacket = stream.$pool.get(nextSeq);
			if (nextPacket) {
				stream.$pool.delete(nextSeq);
				setImmediate(() => this.requestHandler(nextPacket));
			}
		}

		return stream && payload.seq == 0 ? stream : null;
	}

	/**
	 * Create an Error instance from payload ata
	 * @param {Object} error
	 * @param {Object} payload
	 */
	_createErrFromPayload(error, payload) {
		return this.errorRegenerator?.restore(error, payload);
	}

	/**
	 * Process incoming response of request
	 *
	 * @param {Object} packet
	 *
	 * @memberof Transit
	 */
	responseHandler(packet) {
		const id = packet.id;
		const req = this.pendingRequests.get(id);

		// If not exists (timed out), we skip response processing
		if (req == null) {
			this.logger.debug(
				"Orphan response is received. Maybe the request is timed out earlier. ID:",
				packet.id,
				", Sender:",
				packet.sender
			);
			this.metrics.increment(METRIC.MOLECULER_TRANSIT_ORPHAN_RESPONSE_TOTAL);
			return;
		}

		this.logger.debug(`<= Response '${req.action.name}' is received from '${packet.sender}'.`);

		// Update nodeID in context (if it uses external balancer)
		req.ctx.nodeID = packet.sender;

		// Merge response meta with original meta
		Object.assign(req.ctx.meta || {}, packet.meta || {});

		// Handle stream response
		if (packet.stream != null) {
			if (this._handleIncomingResponseStream(packet, req)) return;
		}

		// Remove pending request
		this.removePendingRequest(id);

		if (!packet.success) {
			req.reject(this._createErrFromPayload(packet.error, packet));
		} else {
			req.resolve(packet.data);
		}
	}

	/**
	 * Handle incoming response stream.
	 *
	 * @param {Object} packet
	 * @param {Object} req
	 */
	_handleIncomingResponseStream(packet, req) {
		let stream = this.pendingResStreams.get(packet.id);
		if (!stream && !packet.stream && !packet.seq) return false;

		if (!stream) {
			this.logger.debug(
				`<= New stream is received from '${packet.sender}'. Seq: ${packet.seq}`
			);

			stream = new Transform({
				// TODO: It's incorrect because the chunks may receive in random order, so it processes an empty meta.
				// Meta is filled correctly only in the 0. chunk.
				objectMode: packet.headers?.$streamObjectMode,
				transform: function (chunk, encoding, done) {
					this.push(chunk);
					return done();
				}
			});

			delete packet.headers?.$streamObjectMode;

			stream.$prevSeq = -1;
			stream.$pool = new Map();

			this.pendingResStreams.set(packet.id, stream);
		}

		if (packet.seq > stream.$prevSeq + 1) {
			// Some chunks are late. Store these chunks.
			this.logger.debug(
				`Put the chunk into pool (size: ${stream.$pool.size}). Seq: ${packet.seq}`
			);

			stream.$pool.set(packet.seq, packet);

			// TODO: start timer.
			// TODO: check length of pool.
			// TODO: resetting seq.

			return true;
		}

		// the next stream chunk received
		stream.$prevSeq = packet.seq;

		if (stream && packet.seq == 0) {
			req.resolve(stream);
		}

		if (stream.$prevSeq > 0) {
			if (!packet.stream) {
				// Received error?
				if (!packet.success)
					stream.emit("error", this._createErrFromPayload(packet.error, packet));

				this.logger.debug(
					`<= Stream closing is received from '${packet.sender}'. Seq: ${packet.seq}`
				);

				// End of stream
				stream.end();

				// Remove pending request
				this.removePendingRequest(packet.id);

				return true;
			} else {
				// stream chunk
				this.logger.debug(
					`<= Stream chunk is received from '${packet.sender}'. Seq: ${packet.seq}`
				);
				stream.write(
					packet.data?.type === "Buffer" ? Buffer.from(packet.data.data) : packet.data
				);
			}
		}

		// Check newer chunks in the pool
		if (stream.$pool.size > 0) {
			this.logger.debug(`Has stored packets. Size: ${stream.$pool.size}`);
			const nextSeq = stream.$prevSeq + 1;
			const nextPacket = stream.$pool.get(nextSeq);
			if (nextPacket) {
				stream.$pool.delete(nextSeq);
				setImmediate(() => this.responseHandler(nextPacket));
			}
		}

		return true;
	}

	/**
	 * Send a request to a remote service. It returns a Promise
	 * what will be resolved when the response received.
	 *
	 * @param {Context} ctx Context of request
	 * @returns {Promise}
	 *
	 * @memberof Transit
	 */
	request(ctx) {
		if (this.opts.maxQueueSize && this.pendingRequests.size >= this.opts.maxQueueSize)
			/* istanbul ignore next */
			return this.Promise.reject(
				new E.QueueIsFullError({
					action: ctx.action.name,
					nodeID: this.nodeID,
					size: this.pendingRequests.size,
					limit: this.opts.maxQueueSize
				})
			);

		// Expanded the code that v8 can optimize it.  (TryCatchStatement disable optimizing)
		return new this.Promise((resolve, reject) => this._sendRequest(ctx, resolve, reject));
	}

	/**
	 * Send a remote request
	 *
	 * @param {Context} ctx      Context of request
	 * @param {Function} resolve   Resolve of Promise
	 * @param {Function} reject    Reject of Promise
	 *
	 * @memberof Transit
	 */
	_sendRequest(ctx, resolve, reject) {
		const isStream =
			ctx.options?.stream?.readable === true &&
			typeof ctx.options.stream.on === "function" &&
			typeof ctx.options.stream.pipe === "function";

		const request = {
			action: ctx.action,
			nodeID: ctx.nodeID,
			ctx,
			resolve,
			reject,
			stream: isStream
		};

		const payload = {
			id: ctx.id,
			action: ctx.action?.name,
			params: ctx.params,
			meta: ctx.meta,
			headers: ctx.headers,
			timeout: ctx.options.timeout,
			level: ctx.level,
			tracing: ctx.tracing,
			parentID: ctx.parentID,
			requestID: ctx.requestID,
			caller: ctx.caller,
			stream: isStream
		};

		if (isStream) {
			const s = ctx.options.stream;
			if (s.readableObjectMode === true || s._readableState?.objectMode === true) {
				payload.headers = payload.headers ?? {};
				payload.headers.$streamObjectMode = true;
			}
			payload.seq = 0;
		}

		const packet = new Packet(P.PACKET_REQUEST, ctx.nodeID, payload);

		const nodeName = ctx.nodeID ? `'${ctx.nodeID}'` : "someone";
		const requestID = ctx.requestID ? "with requestID '" + ctx.requestID + "' " : "";
		this.logger.debug(`=> Send '${ctx.action?.name}' request ${requestID}to ${nodeName} node.`);

		const publishCatch = /* istanbul ignore next */ err => {
			this.logger.error(
				`Unable to send '${ctx.action?.name}' request ${requestID}to ${nodeName} node.`,
				err
			);

			this.broker.broadcastLocal("$transit.error", {
				error: err,
				module: "transit",
				type: C.FAILED_SEND_REQUEST_PACKET
			});
		};

		// Add to pendings
		this.pendingRequests.set(ctx.id, request);

		// Publish request
		return this.publish(packet)
			.then(() => {
				if (isStream) {
					const { stream } = ctx.options;

					// Skip to send ctx.meta after the first packet because it doesn't appear on the remote side.
					payload.meta = {};
					// Still send information about objectMode in case of packets are received in wrong order
					if (
						stream.readableObjectMode === true ||
						stream._readableState?.objectMode === true
					) {
						payload.headers = payload.headers ?? {};
						payload.headers.$streamObjectMode = true;
					}

					stream.on("data", chunk => {
						stream.pause();
						const chunks = [];
						if (
							chunk instanceof Buffer &&
							this.opts.maxChunkSize > 0 &&
							chunk.length > this.opts.maxChunkSize
						) {
							let len = chunk.length;
							let i = 0;
							while (i < len) {
								chunks.push(chunk.subarray(i, (i += this.opts.maxChunkSize)));
							}
						} else {
							chunks.push(chunk);
						}

						return this.Promise.all(
							chunks.map(ch => {
								const copy = Object.assign({}, payload);
								copy.seq = ++payload.seq;
								copy.stream = true;
								copy.params = ch;

								this.logger.debug(
									`=> Send stream chunk ${requestID}to ${nodeName} node. Seq: ${copy.seq}`
								);

								return this.publish(new Packet(P.PACKET_REQUEST, ctx.nodeID, copy));
							})
						)
							.then(() => stream.resume())
							.catch(publishCatch);
					});

					stream.on("end", () => {
						const copy = Object.assign({}, payload);
						copy.seq = ++payload.seq;
						copy.params = null;
						copy.stream = false;

						this.logger.debug(
							`=> Send stream closing ${requestID}to ${nodeName} node. Seq: ${copy.seq}`
						);

						return this.publish(new Packet(P.PACKET_REQUEST, ctx.nodeID, copy)).catch(
							publishCatch
						);
					});

					stream.on("error", err => {
						const copy = Object.assign({}, payload);
						copy.seq = ++payload.seq;
						copy.stream = false;
						copy.headers.$streamError = this._createPayloadErrorField(err, payload);
						copy.params = null;

						this.logger.debug(
							`=> Send stream error ${requestID}to ${nodeName} node.`,
							copy.headers.$streamError
						);

						return this.publish(new Packet(P.PACKET_REQUEST, ctx.nodeID, copy)).catch(
							publishCatch
						);
					});
				}
			})
			.catch(err => {
				publishCatch(err);
				reject(err);
			});
	}

	/**
	 * Send an event to a remote node.
	 * The event is balanced by transporter
	 *
	 * @param {Context} ctx
	 *
	 * @memberof Transit
	 */
	sendEvent(ctx) {
		const groups = ctx.eventGroups;
		const requestID = ctx.requestID ? "with requestID '" + ctx.requestID + "' " : "";
		if (ctx.endpoint)
			this.logger.debug(
				`=> Send '${ctx.eventName}' event ${requestID}to '${ctx.nodeID}' node` +
					(groups ? ` in '${groups.join(", ")}' group(s)` : "") +
					"."
			);
		else
			this.logger.debug(
				`=> Send '${ctx.eventName}' event ${requestID}to '${groups?.join(", ")}' group(s).`
			);

		return this.publish(
			new Packet(P.PACKET_EVENT, ctx.endpoint ? ctx.nodeID : null, {
				id: ctx.id,
				event: ctx.eventName,
				data: ctx.params,
				groups,
				broadcast: ctx.eventType == "broadcast",
				meta: ctx.meta,
				headers: ctx.headers,
				level: ctx.level,
				tracing: ctx.tracing,
				parentID: ctx.parentID,
				requestID: ctx.requestID,
				caller: ctx.caller,
				needAck: ctx.needAck
			})
		).catch(
			/* istanbul ignore next */ err => {
				this.logger.error(
					`Unable to send '${ctx.eventName}' event ${requestID}to groups.`,
					err
				);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_SEND_EVENT_PACKET
				});

				return Promise.reject(err);
			}
		);
	}

	/**
	 * Remove a pending request
	 *
	 * @param {any} id
	 *
	 * @memberof Transit
	 */
	removePendingRequest(id) {
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
	removePendingRequestByNodeID(nodeID) {
		this.logger.debug(`Remove pending requests of '${nodeID}' node.`);
		this.pendingRequests.forEach((req, id) => {
			if (req.nodeID === nodeID) {
				this.pendingRequests.delete(id);

				// Reject the request
				req.reject(
					new E.RequestRejectedError({
						action: req.action.name,
						nodeID: req.nodeID
					})
				);

				this.pendingReqStreams.delete(id);
				this.pendingResStreams.delete(id);
			}
		});
	}

	/**
	 * Create error field in outgoing payload
	 *
	 * @param {Error} err
	 * @param {Object} payload
	 * @returns {Object}
	 * @memberof Transit
	 */
	_createPayloadErrorField(err, payload) {
		return this.errorRegenerator?.extractPlainError(err, payload);
	}

	/**
	 * Send back the response of request
	 *
	 * @param {String} nodeID
	 * @param {String} id
	 * @param {Object} meta
	 * @param {Object} headers
	 * @param {any} data
	 * @param {Error?} err
	 *
	 * @memberof Transit
	 */
	sendResponse(nodeID, id, meta, headers, data, err) {
		// Publish the response
		const payload = {
			id: id,
			meta: meta,
			headers,
			success: err == null,
			data: data
		};

		if (err) payload.error = this._createPayloadErrorField(err, payload);

		const publishCatch = /* istanbul ignore next */ err => {
			this.logger.error(`Unable to send '${id}' response to '${nodeID}' node.`, err);

			this.broker.broadcastLocal("$transit.error", {
				error: err,
				module: "transit",
				type: C.FAILED_SEND_RESPONSE_PACKET
			});
		};

		if (
			data &&
			data.readable === true &&
			typeof data.on === "function" &&
			typeof data.pipe === "function"
		) {
			// Streaming response
			payload.stream = true;
			if (data.readableObjectMode === true || data._readableState?.objectMode === true) {
				payload.headers = payload.headers || {};
				payload.headers.$streamObjectMode = true;
			}
			payload.seq = 0;

			const stream = data;
			stream.pause();

			stream.on("data", chunk => {
				stream.pause();
				const chunks = [];
				if (
					chunk instanceof Buffer &&
					this.opts.maxChunkSize > 0 &&
					chunk.length > this.opts.maxChunkSize
				) {
					let len = chunk.length;
					let i = 0;
					while (i < len) {
						chunks.push(chunk.subarray(i, (i += this.opts.maxChunkSize)));
					}
				} else {
					chunks.push(chunk);
				}

				return this.Promise.all(
					chunks.map(ch => {
						const copy = Object.assign({}, payload);
						copy.seq = ++payload.seq;
						copy.stream = true;
						copy.data = ch;

						this.logger.debug(
							`=> Send stream chunk to ${nodeID} node. Seq: ${copy.seq}`
						);

						return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, copy));
					})
				)
					.then(() => stream.resume())
					.catch(publishCatch);
			});

			stream.on("end", () => {
				const copy = Object.assign({}, payload);
				copy.stream = false;
				copy.seq = ++payload.seq;
				copy.data = null;

				this.logger.debug(`=> Send stream closing to ${nodeID} node. Seq: ${copy.seq}`);

				return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, copy)).catch(
					publishCatch
				);
			});

			stream.on("error", err => {
				const copy = Object.assign({}, payload);
				copy.stream = false;
				copy.seq = ++payload.seq;
				if (err) {
					copy.success = false;
					copy.error = this._createPayloadErrorField(err, payload);
				}

				this.logger.debug(`=> Send stream error to ${nodeID} node.`, copy.error);

				return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, copy)).catch(
					publishCatch
				);
			});

			payload.data = null;
			return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, payload))
				.then(() => {
					if (payload.stream) stream.resume();
				})
				.catch(publishCatch);
		}

		return this.publish(new Packet(P.PACKET_RESPONSE, nodeID, payload)).catch(publishCatch);
	}

	/**
	 * Discover other nodes. It will be called after success connect.
	 *
	 * @memberof Transit
	 */
	discoverNodes() {
		return this.publish(new Packet(P.PACKET_DISCOVER)).catch(
			/* istanbul ignore next */ err => {
				this.logger.error("Unable to send DISCOVER packet.", err);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_NODES_DISCOVERY
				});
			}
		);
	}

	/**
	 * Discover a node. It will be called if we got message from an unknown node.
	 *
	 * @memberof Transit
	 */
	discoverNode(nodeID) {
		return this.publish(new Packet(P.PACKET_DISCOVER, nodeID)).catch(
			/* istanbul ignore next */ err => {
				this.logger.error(`Unable to send DISCOVER packet to '${nodeID}' node.`, err);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_NODE_DISCOVERY
				});
			}
		);
	}

	/**
	 * Send node info package to other nodes.
	 *
	 * @memberof Transit
	 */
	sendNodeInfo(info, nodeID) {
		if (!this.connected || !this.isReady) return this.Promise.resolve();

		return this.publish(
			new Packet(P.PACKET_INFO, nodeID, {
				services: info.services,
				ipList: info.ipList,
				hostname: info.hostname,
				client: info.client,
				config: info.config,
				instanceID: this.broker.instanceID,
				metadata: info.metadata,
				seq: info.seq
			})
		).catch(
			/* istanbul ignore next */ err => {
				this.logger.error(`Unable to send INFO packet to '${nodeID}' node.`, err);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_SEND_INFO_PACKET
				});
			}
		);
	}

	/**
	 * Send ping to a node (or all nodes if nodeID is null)
	 *
	 * @param {String} nodeID
	 * @param {String} id
	 * @returns
	 * @memberof Transit
	 */
	sendPing(nodeID, id) {
		return this.publish(
			new Packet(P.PACKET_PING, nodeID, {
				time: Date.now(),
				id: id || this.broker.generateUid()
			})
		).catch(
			/* istanbul ignore next */ err => {
				this.logger.error(`Unable to send PING packet to '${nodeID}' node.`, err);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_SEND_PING_PACKET
				});
			}
		);
	}

	/**
	 * Send back pong response
	 *
	 * @param {Object} payload
	 * @returns
	 * @memberof Transit
	 */
	sendPong(payload) {
		return this.publish(
			new Packet(P.PACKET_PONG, payload.sender, {
				time: payload.time,
				id: payload.id,
				arrived: Date.now()
			})
		).catch(
			/* istanbul ignore next */ err => {
				this.logger.error(`Unable to send PONG packet to '${payload.sender}' node.`, err);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_SEND_PONG_PACKET
				});
			}
		);
	}

	/**
	 * Process incoming PONG packet.
	 * Measure ping time & current time difference.
	 *
	 * @param {Object} payload
	 * @memberof Transit
	 */
	processPong(payload) {
		const now = Date.now();
		const elapsedTime = now - payload.time;
		const timeDiff = Math.round(now - payload.arrived - elapsedTime / 2);

		// this.logger.debug(`PING-PONG from '${payload.sender}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms`);

		this.broker.broadcastLocal("$node.pong", {
			nodeID: payload.sender,
			elapsedTime,
			timeDiff,
			id: payload.id
		});

		this.metrics.set(METRIC.MOLECULER_TRANSIT_PONG_TIME, elapsedTime, {
			targetNodeID: payload.sender
		});
		this.metrics.set(METRIC.MOLECULER_TRANSIT_PONG_SYSTIME_DIFF, timeDiff, {
			targetNodeID: payload.sender
		});
	}

	/**
	 * Send a node heartbeat. It will be called with timer from local Discoverer.
	 *
	 * @params {Node} localNode
	 * @memberof Transit
	 */
	sendHeartbeat(localNode) {
		return this.publish(
			new Packet(P.PACKET_HEARTBEAT, null, {
				cpu: localNode.cpu
			})
		).catch(
			/* istanbul ignore next */ err => {
				this.logger.error("Unable to send HEARTBEAT packet.", err);

				this.broker.broadcastLocal("$transit.error", {
					error: err,
					module: "transit",
					type: C.FAILED_SEND_HEARTBEAT_PACKET
				});
			}
		);
	}

	/**
	 * Publish via transporter
	 *
	 * @param {Packet} packet
	 *
	 * @memberof Transit
	 */
	publish(packet) {
		if (this.subscribing) {
			return this.subscribing.then(() => {
				return this.tx.prepublish(packet);
			});
		}
		return this.tx.prepublish(packet);
	}
}

module.exports = Transit;
