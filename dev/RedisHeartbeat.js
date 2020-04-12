
const Redis = require("ioredis");

module.exports = function(broker) {
	let timer, client;
	const logger = broker.getLogger("RHB");
	const HEARTBEAT_INTERVAL = 5;
	const PREFIX = `MOL${broker.namespace ? "-" + broker.namespace : ""}-RHB`;
	const BEAT_KEY = `${PREFIX}-BEAT-${broker.nodeID}`;
	const INFO_KEY = `${PREFIX}-INFO-${broker.nodeID}`;

	const nodes = new Map();

	/*function createRedisClient() {
		const client = new Redis("redis://localhost:6379");
		client.on("connect", () => {
			logger.info("Redis heartbeat client connected.");
		});

		client.on("error", (err) => {
			logger.error(err);
		});

		return client;
	}

	function disconnectRedisClient() {
		if (client)
			return client.quit();
	}

	async function beat() {
		const localNode = broker.registry.nodes.localNode;
		localNode.updateLocalInfo(broker.getCpuUsage);

		const data = {
			sender: broker.nodeID,
			ver: broker.PROTOCOL_VERSION,
			timestamp: Date.now(),
			cpu: localNode.cpu,
			seq: localNode.seq
		};
		await client.setex(BEAT_KEY, HEARTBEAT_INTERVAL * 2, JSON.stringify(data));
		logger.info("Heartbeat sent.");
	}

	async function collectOnlineNodes() {
		const onlineKeys = [];
		await new Promise((resolve, reject) => {
			const stream = client.scanStream({
				match: `${PREFIX}-BEAT*`,
				count: 100
			});
			stream.on("data", keys => {
				if (!keys || !keys.length) return;

				onlineKeys.push(...keys);
			});

			stream.on("error", (err) => {
				this.logger.error("Error occured while scanning HB keys.", err);
				reject(err);
			});

			stream.on("end", function() {
				resolve();
			});
		});
		// console.log(onlineKeys);

		const prevNodes = new Map(nodes);

		await Promise.mapSeries(onlineKeys, async key => {
			const res = await client.get(key);
			try {
				const packet = JSON.parse(res);
				if (packet.sender == broker.nodeID) return;

				prevNodes.delete(packet.sender);

				const prevPacket = nodes.get(packet.sender);
				if (!prevPacket) {
					console.log("New node", packet);
					await refreshRemoteNodeInfo(packet.sender);
				} else {
					if (prevPacket.seq !== packet.seq) {
						// INFO is updated.
						console.log("INFO updated", packet);
						await refreshRemoteNodeInfo(packet.sender);
					}
				}
				nodes.set(packet.sender, packet);

				broker.registry.nodeHeartbeat(packet);
			} catch(err) {
				logger.warn("Unable to parse Redis response", res);
			}
		});

		if (prevNodes.size > 0) {
			logger.info("prevNodes", prevNodes);
			// Disconnected nodes
			Array.from(prevNodes.keys()).map(nodeID => {
				broker.registry.nodes.disconnected(nodeID, true);
				nodes.delete(nodeID);
			});
		}
	}

	async function updateLocalNodeInfo() {
		const info = Object.assign({
			ver: broker.PROTOCOL_VERSION,
			sender: broker.nodeID
		}, broker.registry.getLocalNodeInfo());

		await client.set(INFO_KEY, JSON.stringify(info));
	}

	async function refreshRemoteNodeInfo(nodeID) {
		const res = await client.get(`${PREFIX}-INFO-${nodeID}`);
		try {
			const info = JSON.parse(res);
			await broker.registry.processNodeInfo(info);
		} catch(err) {
			logger.warn("Unable to parse Redis response", res);
		}
	}

	async function removeLocalNodeInfo() {
		await client.del(INFO_KEY);
		await client.del(BEAT_KEY);
	}
*/
	return {
		name: "RedisHeartbeat",

		started() {
			client = createRedisClient();

			broker.localBus.on("$services.changed", local => {
				if (local)
					updateLocalNodeInfo();
			});

			updateLocalNodeInfo();

			timer = setInterval(async () => {
				await beat();
				await collectOnlineNodes();
			}, HEARTBEAT_INTERVAL * 1000);
			timer.unref();

			beat();
		},

		async stopped() {
			if (timer)
				clearInterval(timer);

			await removeLocalNodeInfo();

			await disconnectRedisClient();
		}
	};
};
