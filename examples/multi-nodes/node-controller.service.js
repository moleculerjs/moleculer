/* eslint-disable no-console */

const _ = require("lodash");
const kleur = require("kleur");
const cluster = require("cluster");
const { humanize } = require("../../src/utils");

const padS = _.padStart;
const padE = _.padEnd;

const NODE_PREFIX = process.env.NODE_PREFIX || "node";

function val(value) {
	if (Number.isNaN(value)) return "-";

	if (value > 1000 * 1000) return Number(value / 1000 / 1000).toFixed(0) + "M";
	if (value > 1000) return Number(value / 1000).toFixed(0) + "K";

	return Number(value).toFixed(0);
}

module.exports = {
	name: "nodes",

	settings: {
		printIO: false,
		printRegistry: true
	},

	actions: {
		scale: {
			params: {
				count: "number",
				kill: "boolean|optional"
			},
			handler(ctx) {
				return this.scale(ctx.params.count, { kill: !!ctx.params.kill });
			}
		}
	},

	/*events: {
		"$metrics.snapshot"(ctx) {
			ctx.params.map(metric => this.addMetric(metric, ctx.nodeID));
		}
	},*/

	events: {
		"$services.changed"(ctx) {
			if (this.settings.printRegistry) this.printRegistry();
		},
		"$node.disconnected"(ctx) {
			if (this.settings.printRegistry) this.printRegistry();
		}
	},

	methods: {
		scale(num, opts) {
			if (num > this.nodes.length) {
				// Start new nodes
				this.logger.info(`Starting ${num - this.nodes.length} new nodes...`);
				return _.times(num - this.nodes.length, () =>
					this.startNewNode(this.getNextNodeID())
				);
			} else if (num < this.nodes.length && num >= 0) {
				// Stop random nodes
				this.logger.info(`Stopping ${this.nodes.length - num} nodes...`);
				const tmp = Array.from(this.nodes);
				return _.times(this.nodes.length - num, () => {
					const idx = _.random(tmp.length - 1);
					const node = tmp.splice(idx, 1)[0];
					if (opts.kill) return this.killNode(node);
					else return this.stopNode(node);
				});
			}
		},

		getNextNodeID() {
			let c = 1;
			let nodeID = `${NODE_PREFIX}-${c}`;
			while (this.nodes.find(n => n.nodeID == nodeID)) {
				nodeID = `${NODE_PREFIX}-${++c}`;
			}

			return nodeID;
		},

		startNewNode(nodeID) {
			this.logger.info(`Starting ${nodeID} node...`);
			const worker = cluster.fork();
			worker.nodeID = nodeID;
			worker.on("message", msg => this.workerMessageHandler(worker, msg));
			worker.on("disconnect", () => {
				const idx = this.nodes.findIndex(node => node.worker == worker);
				if (idx != -1) {
					const node = this.nodes[idx];
					this.nodes.splice(idx, 1);
					this.logger.info(`Node ${node.nodeID} stopped.`);
					this.removeNodeIDFromMetric(node.nodeID);
				}
			});

			worker.send({ cmd: "start", nodeID });

			this.nodes.push({ nodeID, worker });
		},

		stopNode(node) {
			this.logger.info(`Stopping ${node.nodeID} node...`);
			node.worker.send({ cmd: "stop" });
		},

		killNode(node) {
			this.logger.info(`Killing ${node.nodeID} node...`);
			node.worker.kill("SIGTERM");
		},

		workerMessageHandler(worker, msg) {
			if (msg.event == "started") {
				// No started
			} else if (msg.event == "metrics") {
				if (msg.list && msg.list.length > 0)
					msg.list.map(metric => this.addMetric(metric, worker.nodeID));
			} else if (msg.event == "registry") {
				this.updateWorkerRegistry(worker.nodeID, msg.nodes);
				if (this.settings.printRegistry) this.printRegistry();
			} else {
				this.logger.info(msg);
			}
		},

		updateWorkerRegistry(nodeID, nodes) {
			this.workerRegistry[nodeID] = nodes;
		},

		addMetric(metric, nodeID) {
			if (!this.metrics[metric.name]) this.metrics[metric.name] = {};

			const item = this.metrics[metric.name];
			item[nodeID] = metric.values;
		},

		removeNodeIDFromMetric(nodeID) {
			Object.keys(this.metrics).map(name => {
				if (this.metrics[name][nodeID]) delete this.metrics[name][nodeID];
			});
		},

		printMetrics() {
			console.log(
				kleur.yellow().bold("\nMetrics:  "),
				kleur.grey("Time:"),
				kleur.grey(humanize(process.uptime() * 1000))
			);
			console.log(kleur.yellow().bold("========"));

			const rows = [];
			let totalTx = 0,
				totalTxRate = 0,
				totalTxBytes = 0,
				totalTxBytesRate = 0;
			let totalRx = 0,
				totalRxRate = 0,
				totalRxBytes = 0,
				totalRxBytesRate = 0;
			this.nodes.forEach(node => {
				const txPackets = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.sent.total",
					"value"
				);
				if (txPackets) totalTx += txPackets;
				const txPacketsRate = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.sent.total",
					"rate"
				);
				if (txPacketsRate) totalTxRate += txPacketsRate;
				const txBytes = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.sent.bytes",
					"value"
				);
				if (txBytes) totalTxBytes += txBytes;
				const txBytesRate = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.sent.bytes",
					"rate"
				);
				if (txBytesRate) totalTxBytesRate += txBytesRate;

				const rxPackets = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.received.total",
					"value"
				);
				if (rxPackets) totalRx += rxPackets;
				const rxPacketsRate = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.received.total",
					"rate"
				);
				if (rxPacketsRate) totalRxRate += rxPacketsRate;
				const rxBytes = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.received.bytes",
					"value"
				);
				if (rxBytes) totalRxBytes += rxBytes;
				const rxBytesRate = this.getMetricValueByNode(
					node.nodeID,
					"moleculer.transporter.packets.received.bytes",
					"rate"
				);
				if (rxBytesRate) totalRxBytesRate += rxBytesRate;

				if (txPackets) {
					rows.push(
						[
							padE(node.nodeID, 8),
							kleur.grey("TX:"),
							kleur.green().bold(padS(val(txPackets) + " pck", 8)),
							kleur.green().bold(padS(val(txPacketsRate / 60) + " p/s", 8)),
							kleur.green().bold(padS(this.humanReadableBytes(txBytes), 8)),
							kleur.grey("/"),
							kleur.green().bold(padS(this.humanReadableBps(txBytesRate), 8)),
							kleur.grey("   RX:"),
							kleur.green().bold(padS(val(rxPackets) + " pck", 8)),
							kleur.green().bold(padS(val(rxPacketsRate / 60) + " p/s", 8)),
							kleur.green().bold(padS(this.humanReadableBytes(rxBytes), 8)),
							kleur.grey("/"),
							kleur.green().bold(padS(this.humanReadableBps(rxBytesRate), 8))
						].join(" ")
					);
				}
			});
			this.columnize(rows, 2).forEach(row => console.log(" ", ...row));

			// Total
			if (totalTx || totalRx) {
				console.log(padE("  ", 80, "-"));
				console.log(
					[
						" ",
						padE("Total", 8),
						kleur.grey("TX:"),
						kleur.green().bold(padS(val(totalTx) + " pck", 8)),
						kleur.green().bold(padS(val(totalTxRate / 60) + " p/s", 8)),
						kleur.green().bold(padS(this.humanReadableBytes(totalTxBytes), 8)),
						kleur.grey("/"),
						kleur.green().bold(padS(this.humanReadableBps(totalTxBytesRate), 8)),
						kleur.grey("   RX:"),
						kleur.green().bold(padS(val(totalRx) + " pck", 8)),
						kleur.green().bold(padS(val(totalRxRate / 60) + " p/s", 8)),
						kleur.green().bold(padS(this.humanReadableBytes(totalRxBytes), 8)),
						kleur.grey("/"),
						kleur.green().bold(padS(this.humanReadableBps(totalRxBytesRate), 8))
					].join(" ")
				);
			}
		},

		printRegistry: _.debounce(function () {
			console.log("\x1b[2J");
			console.log("\x1b[0;0H");
			console.log(
				kleur.yellow().bold("\nRegistry:  "),
				kleur.grey("Time:"),
				kleur.grey(humanize(process.uptime() * 1000))
			);
			console.log(kleur.yellow().bold("========"));

			const nodeIDs = _.uniq(
				[].concat(
					Object.keys(this.workerRegistry),
					this.broker.registry.nodes.toArray().map(node => node.id)
				)
			)
				.filter(nodeID => nodeID != this.broker.nodeID)
				.sort((a, b) => Number(a.replace(/[^\d]/g, "")) - Number(b.replace(/[^\d]/g, "")));

			nodeIDs.forEach(nodeID =>
				this.printWorkerRegistry(nodeID, this.workerRegistry[nodeID], nodeIDs)
			);
		}, 250),

		printWorkerRegistry(mainNodeID, nodes, allNodeIDs) {
			let s = " ";

			const mainNode = this.broker.registry.nodes.get(mainNodeID);
			const available = mainNode && mainNode.available;

			s += available ? kleur.green(padE(mainNodeID, 10)) : kleur.red(padE(mainNodeID, 10));
			s += "│";

			allNodeIDs.forEach(nodeID => {
				if (!available) {
					s += " ";
					return;
				}
				if (nodes && nodes[nodeID]) {
					const node = nodes[nodeID];
					if (node.available) s += kleur.green().bold("█");
					else s += kleur.red().bold("█");
				} else {
					s += kleur.red().bold("█");
				}
			});

			s += "│";
			console.log(s);
		},

		columnize(arr, count) {
			const res = [];

			let tmp = [];
			arr.forEach((item, i) => {
				if ((i + 1) % count == 0) {
					tmp.push(item);
					res.push(tmp);
					tmp = [];
				} else {
					tmp.push(item + " |");
				}
			});

			if (tmp.length > 0) res.push(tmp);

			return res;
		},

		getMetricValueByNode(nodeID, metricName, valueName, agg) {
			const item = this.metrics[metricName];
			if (item) {
				const values = item[nodeID];
				if (values) {
					return this.aggregateValues(values, valueName, agg);
				}
			}
		},

		aggregateValues(values, valueName = "value", agg = "sum") {
			if (agg == "sum") {
				return values.reduce((a, b) => a + b[valueName], 0);
			} else if (agg == "avg") {
				return values.reduce((a, b) => a + b[valueName], 0) / values.length;
			}
		},

		humanReadableBps(bpm) {
			if (bpm == null || Number.isNaN(bpm)) return "-";

			const bps = (bpm * 8) / 60;

			if (bps >= 1000 * 1000) return `${(bps / 1000 / 1000).toFixed(0)} Mbps`;
			if (bps >= 1000) return `${(bps / 1000).toFixed(0)} kbps`;
			else return `${bps.toFixed(0)} bps`;
		},

		humanReadableBytes(bytes) {
			if (bytes == null || Number.isNaN(bytes)) return "-";

			if (bytes >= 1000 * 1000) return `${(bytes / 1000 / 1000).toFixed(0)} MB`;
			if (bytes >= 1000) return `${(bytes / 1000).toFixed(0)} kB`;
			else return `${bytes.toFixed(0)} B`;
		}
	},

	created() {
		this.nodes = [];

		this.metrics = {};
		this.workerRegistry = {};
	},

	started() {
		// Print after the fresh metrics received
		if (this.settings.printIO) this.metricTimer = setInterval(() => this.printMetrics(), 5000);

		//if (this.settings.printRegistry)
		//	this.metricTimer = setInterval(() => this.printRegistry(), 2000);
	},

	stopped() {
		clearInterval(this.metricTimer);
	}
};
