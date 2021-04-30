/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const BaseDiscoverer = require("./base");
const { METRIC } = require("../../metrics");
const Serializers = require("../../serializers");
const { removeFromArray } = require("../../utils");

let ETCD3;

/**
 * etcd3-based Discoverer class
 *
 * @class Etcd3Discoverer
 */
class Etcd3Discoverer extends BaseDiscoverer {

	/**
	 * Creates an instance of Discoverer.
	 *
	 * TODO:
	 * 	- the etcd3 lib has no reconnection logic
	 *
	 * @memberof Etcd3Discoverer
	 */
	constructor(opts) {
		if (typeof opts === "string")
			opts = { etcd: { hosts: opts.replace(/etcd3:\/\//g, "") } };

		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			etcd: undefined,
			serializer: "JSON",
			fullCheck: 10, // Disable with `0` or `null`
		});

		// Loop counter for full checks. Starts from a random value for better distribution
		this.idx = this.opts.fullCheck > 1 ? _.random(this.opts.fullCheck - 1) : 0;

		// Etcd client instance
		this.client = null;

		// Last sequence numbers
		this.lastInfoSeq = 0;
		this.lastBeatSeq = 0;

		// Leases
		this.leaseBeat = null;
		this.leaseInfo = null;
	}

	/**
	 * Initialize Discoverer
	 *
	 * @param {any} registry
	 *
	 * @memberof Etcd3Discoverer
	 */
	init(registry) {
		super.init(registry);

		try {
			ETCD3 = require("etcd3");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'etcd3' package is missing. Please install it with 'npm install etcd3 --save' command.", err, true);
		}

		this.logger.warn(kleur.yellow().bold("Etcd3 Discoverer is an EXPERIMENTAL module. Do NOT use it in production!"));

		this.instanceHash = this.broker.instanceID.substring(0, 8);

		this.PREFIX = `moleculer${this.broker.namespace ? "-" + this.broker.namespace : ""}/discovery`;
		this.BEAT_KEY = `${this.PREFIX}/beats/${this.broker.nodeID}/${this.instanceHash}`;
		this.INFO_KEY = `${this.PREFIX}/info/${this.broker.nodeID}`;

		this.client = new ETCD3.Etcd3(this.opts.etcd);

		// create an instance of serializer (default to JSON)
		this.serializer = Serializers.resolve(this.opts.serializer);
		this.serializer.init(this.broker);

		this.logger.debug("Etcd3 Discoverer created. Prefix:", this.PREFIX);
	}

	/**
	 * Stop discoverer clients.
	 */
	stop() {
		return super.stop()
			.then(() => {
				if (this.client)
					return this.client.close();
			});
	}

	/**
	 * Register Moleculer Transit Core metrics.
	 */
	registerMoleculerMetrics() {
		this.broker.metrics.register({ name: METRIC.MOLECULER_DISCOVERER_ETCD_COLLECT_TOTAL, type: METRIC.TYPE_COUNTER, rate: true, description: "Number of Service Registry fetching from etcd" });
		this.broker.metrics.register({ name: METRIC.MOLECULER_DISCOVERER_ETCD_COLLECT_TIME, type: METRIC.TYPE_HISTOGRAM, quantiles: true, unit: METRIC.UNIT_MILLISECONDS, description: "Time of Service Registry fetching from etcd" });
	}

	/**
	 * Sending a local heartbeat to etcd.
	 */
	sendHeartbeat() {
		const timeEnd = this.broker.metrics.timer(METRIC.MOLECULER_DISCOVERER_ETCD_COLLECT_TIME);
		const data = {
			sender: this.broker.nodeID,
			ver: this.broker.PROTOCOL_VERSION,

			//timestamp: Date.now(),
			cpu: this.localNode.cpu,
			seq: this.localNode.seq,
			instanceID: this.broker.instanceID
		};

		const seq = this.localNode.seq;
		const key = this.BEAT_KEY + "/" + seq;
		let leaseBeat = this.leaseBeat;

		return this.Promise.resolve()
			.then(() => {
				if (leaseBeat) {
					if (seq != this.lastBeatSeq) {
						// If seq changed, revoke the current lease
						const p = leaseBeat.revoke();
						leaseBeat = null;
						return p;
					}
				}
			})
			.then(() => {
				if (!leaseBeat) {
					// Create a new for lease
					leaseBeat = this.client.lease(this.opts.heartbeatTimeout);

					//Handle lease-lost event. Release lease when lost. Next heartbeat will request a new lease
					leaseBeat.on('lost', err => {
						this.logger.warn("Lost heartbeat lease. Renewing lease on next heartbeat", err)
						leaseBeat.release();
						this.leaseBeat = null;
					});

					return leaseBeat.grant() // Waiting for the lease creation on the server
						.then(() => this.leaseBeat = leaseBeat);
				}
			})
			.then(() => this.leaseBeat.put(key).value(this.serializer.serialize(data)))
			.then(() => this.lastBeatSeq = seq)
			.then(() => this.collectOnlineNodes())
			.catch(err =>
				this.logger.error("Error occured while collect etcd keys.", err)
			)
			.then(() => {
				timeEnd();
				this.broker.metrics.increment(METRIC.MOLECULER_DISCOVERER_ETCD_COLLECT_TOTAL);
			});
	}

	/**
	 * Collect online nodes from etcd server.
	 */
	collectOnlineNodes() {
		// Get the current node list so that we can check the disconnected nodes.
		const prevNodes = this.registry.nodes.list({ onlyAvailable: true, withServices: false })
			.map(node => node.id)
			.filter(nodeID => nodeID !== this.broker.nodeID);

		// Collect the online node keys.
		return this.Promise.resolve()
			.then(() => {
				if (this.opts.fullCheck && ++this.idx % this.opts.fullCheck == 0) {
					// Full check
					//this.logger.debug("Full check", this.idx);
					this.idx = 0;

					return this.client.getAll().prefix(`${this.PREFIX}/beats/`).buffers()
						.then(result => Object.values(result).map(raw => {
							try {
								return this.serializer.deserialize(raw);
							} catch (err) {
								this.logger.warn("Unable to parse HEARTBEAT packet", err, raw);
							}
						}));
				} else {
					//this.logger.debug("Lazy check", this.idx);
					// Lazy check
					return this.client.getAll().prefix(`${this.PREFIX}/beats/`).keys()
						.then(keys => keys.map(key => {
							const p = key.substring(`${this.PREFIX}/beats/`.length).split("/");
							return {
								key,
								sender: p[0],
								instanceID: p[1],
								seq: Number(p[2])
							};
						}));
				}
			})

			.then(packets => {
				_.compact(packets).map(packet => {
					if (packet.sender == this.broker.nodeID) return;

					removeFromArray(prevNodes, packet.sender);
					this.heartbeatReceived(packet.sender, packet);
				});
			})

			.then(() => {
				if (prevNodes.length > 0) {
					// Disconnected nodes
					prevNodes.map(nodeID => {
						this.logger.info(`The node '${nodeID}' is not available. Removing from registry...`);
						this.remoteNodeDisconnected(nodeID, true);
					});
				}
			});
	}

	/**
	 * Discover a new or old node.
	 *
	 * @param {String} nodeID
	 */
	discoverNode(nodeID) {
		return this.client.get(`${this.PREFIX}/info/${nodeID}`).buffer()
			.then(res => {
				if (!res) {
					this.logger.warn(`No INFO for '${nodeID}' node in registry.`);
					return;
				}
				try {
					const info = this.serializer.deserialize(res);
					return this.processRemoteNodeInfo(nodeID, info);
				} catch (err) {
					this.logger.warn("Unable to parse INFO packet", err, res);
				}
			});
	}

	/**
	 * Discover all nodes (after connected)
	 */
	discoverAllNodes() {
		return this.collectOnlineNodes();
	}

	/**
	 * Local service registry has been changed. We should notify remote nodes.
	 * @param {String} nodeID
	 */
	sendLocalNodeInfo(nodeID) {
		const info = this.broker.getLocalNodeInfo();

		const payload = Object.assign({
			ver: this.broker.PROTOCOL_VERSION,
			sender: this.broker.nodeID
		}, info);

		const key = this.INFO_KEY;
		const seq = this.localNode.seq;
		let leaseInfo = this.leaseInfo;

		return this.Promise.resolve()
			.then(() => {
				if (leaseInfo) {
					if (seq != this.lastInfoSeq) {
						const p = leaseInfo.revoke();
						leaseInfo = null;
						return p;
					}
				}
			})
			.then(() => {
				if (!leaseInfo) {
					leaseInfo = this.client.lease(60);

					//Handle lease-lost event. Release lease when lost. Next heartbeat will request a new lease
					leaseInfo.on('lost', err => {
						this.logger.warn("Lost info lease. Renewing lease on next heartbeat", err)
						leaseInfo.release();
						this.leaseInfo = null;
					});

					return leaseInfo.grant() // Waiting for the lease creation on the server
						.then(() => this.leaseInfo = leaseInfo);
				}
			})
			.then(() => leaseInfo.put(key).value(this.serializer.serialize(payload)))
			.then(() => {
				this.lastInfoSeq = seq;

				// Sending a new heartbeat because it contains the `seq`
				if (!nodeID)
					return this.beat();
			})
			.catch(err => {
				this.logger.error("Unable to send INFO to etcd server", err);
			});
	}

	/**
	 * Unregister local node after disconnecting.
	 */
	localNodeDisconnected() {
		return this.Promise.resolve()
			.then(() => super.localNodeDisconnected())
			.then(() => this.logger.debug("Remove local node from registry..."))
			.then(() => this.client.delete().key(this.INFO_KEY))
			.then(() => this.client.delete().key(this.BEAT_KEY))
			.then(() => {
				if (this.leaseBeat)
					return this.leaseBeat.revoke();
			})
			.then(() => {
				if (this.leaseInfo)
					return this.leaseInfo.revoke();
			});
	}
}

module.exports = Etcd3Discoverer;
