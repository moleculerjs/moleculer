/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {

	// --- METRIC TYPES ---

	METRIC_TYPE_COUNTER:  "counter",
	METRIC_TYPE_GAUGE:  "gauge",
	METRIC_TYPE_HISTROGRAM:  "histogram",
	METRIC_TYPE_INFO:  "info",

	// --- PROCESS METRICS ---

	METRIC_PROCESS_ARGUMENTS: "process.arguments",

	METRIC_PROCESS_PID: "process.pid",
	METRIC_PROCESS_PPID: "process.ppid",

	METRIC_PROCESS_EVENTLOOP_LAG: "process.eventloop.lag", // msec

	METRIC_PROCESS_MEMORY_HEAP_SIZE_TOTAL: "process.memory.heap.size.total", // bytes
	METRIC_PROCESS_MEMORY_HEAP_SIZE_USED: "process.memory.heap.size.used", // bytes
	METRIC_PROCESS_MEMORY_RSS: "process.memory.rss", // bytes
	METRIC_PROCESS_MEMORY_EXTERNAL: "process.memory.external", // bytes

	METRIC_PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL: "process.memory.heap.size.total", // bytes
	METRIC_PROCESS_MEMORY_HEAP_SPACE_SIZE_USED: "process.memory.heap.size.used", // bytes
	METRIC_PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE: "process.memory.heap.size.available", // bytes

	METRIC_PROCESS_UPTIME: "process.uptime", // seconds
	METRIC_PROCESS_ACTIVE_HANDLES: "process.active.handles",
	METRIC_PROCESS_ACTIVE_REQUESTS: "process.active.requests",

	// --- GARBAGE COLLECTOR METRICS ---

	METRICS_PROCESS_GC_TIME: "metrics.process.gc.time",
	METRICS_PROCESS_GC_SCAVENGE: "metrics.process.gc.scavenge",
	METRICS_PROCESS_GC_MARKSWEEP: "metrics.process.gc.marksweep",

	// --- OS METRICS ---

	METRIC_OS_MEMORY_FREE: "os.memory.free", // bytes
	METRIC_OS_MEMORY_TOTAL: "os.memory.total", // bytes
	METRIC_OS_CPU_TOTAL: "os.cpu.total",
	METRIC_OS_UPTIME: "os.uptime", // seconds
	METRIC_OS_TYPE: "os.type",
	METRIC_OS_RELEASE: "os.release",
	METRIC_OS_HOSTNAME: "os.hostname",
	METRIC_OS_ARCH: "os.arch",
	METRIC_OS_PLATFORM: "os.platform",
	METRIC_OS_USER_UID: "os.user.uid",
	METRIC_OS_USER_GID: "os.user.gid",
	METRIC_OS_USER_USERNAME: "os.user.username",
	METRIC_OS_USER_HOMEDIR: "os.user.homedir",

	METRICS_OS_DATETIME_UNIX: "os.datetime.unix",
	METRICS_OS_DATETIME_ISO: "os.datetime.iso",
	METRICS_OS_DATETIME_UTC: "os.datetime.utc",

	// TODO NETWORKS

	METRIC_OS_CPU_LOAD_1: "os.cpu.load.1",
	METRIC_OS_CPU_LOAD_5: "os.cpu.load.5",
	METRIC_OS_CPU_LOAD_15: "os.cpu.load.15",

	METRIC_OS_CPU_USER: "os.cpu.user", // seconds
	METRIC_OS_CPU_SYSTEM: "os.cpu.system", // seconds

	// --- MOLECULER NODE METRICS ---

	METRIC_MOLECULER_NODE_TYPE: "moleculer.node.type",
	METRIC_MOLECULER_NODE_VERSIONS_MOLECULER: "moleculer.node.versions.moleculer",
	METRIC_MOLECULER_NODE_VERSIONS_LANG: "moleculer.node.versions.lang",


	// --- MOLECULER BROKER METRICS ---

	METRIC_MOLECULER_BROKER_NAMESPACE: "moleculer.broker.namespace",
	METRIC_MOLECULER_BROKER_STARTED: "moleculer.broker.started",
	METRIC_MOLECULER_BROKER_SERVICES_TOTAL: "moleculer.broker.services.total",
	METRIC_MOLECULER_BROKER_MIDDLEWARES_TOTAL: "moleculer.broker.middlewares.total",

	// --- MOLECULER REGISTRY METRICS ---

	METRIC_MOLECULER_REGISTRY_NODES_COUNT: "moleculer.registry.nodes.count",
	METRIC_MOLECULER_REGISTRY_SERVICES_COUNT: "moleculer.registry.services.count",
	METRIC_MOLECULER_REGISTRY_SERVICE_ENDPOINTS_COUNT: "moleculer.registry.service.endpoints.count",
	METRIC_MOLECULER_REGISTRY_ACTIONS_COUNT: "moleculer.registry.actions.count",
	METRIC_MOLECULER_REGISTRY_ACTION_ENDPOINTS_COUNT: "moleculer.registry.action.endpoints.count",
	METRIC_MOLECULER_REGISTRY_EVENTS_COUNT: "moleculer.registry.events.count",
	METRIC_MOLECULER_REGISTRY_EVENT_ENDPOINTS_COUNT: "moleculer.registry.event.endpoints.count",

	// --- MOLECULER REQUEST METRICS ---

	METRIC_MOLECULER_REQUEST_TOTAL: "moleculer.request.total",
	METRIC_MOLECULER_REQUEST_ERROR_TOTAL: "moleculer.request.error.total",
	METRIC_MOLECULER_REQUEST_DURATION: "moleculer.request.duration", //msec
	METRIC_MOLECULER_REQUEST_LEVELS: "moleculer.request.levels", //ctx.level histogram
	METRIC_MOLECULER_REQUEST_OPRHAN_TOTAL: "moleculer.request.orphan.total",
	METRIC_MOLECULER_REQUEST_DIRECTCALL_TOTAL: "moleculer.request.directcall.total",
	METRIC_MOLECULER_REQUEST_MULTICALL_TOTAL: "moleculer.request.multicall.total",

	METRIC_MOLECULER_REQUEST_STREAMS_SENT_TOTAL: "moleculer.request.streams.sent.total",
	METRIC_MOLECULER_REQUEST_STREAMS_RECEIVED_TOTAL: "moleculer.request.streams.received.total",

	// --- MOLECULER EVENTS METRICS ---

	METRIC_MOLECULER_EVENT_EMIT_TOTAL: "moleculer.event.emit.total", //msec
	METRIC_MOLECULER_EVENT_BROADCAST_TOTAL: "moleculer.event.broadcast.total", //msec
	METRIC_MOLECULER_EVENT_BROADCASTLOCAL_TOTAL: "moleculer.event.broadcastlocal.total", //msec

	// --- MOLECULER TRANSIT METRICS ---

	METRIC_MOLECULER_TRANSIT_PACKETS_SENT_TOTAL: "moleculer.transit.packets.sent.total",
	METRIC_MOLECULER_TRANSIT_PACKETS_SENT_BYTES: "moleculer.transit.packets.sent.bytes", // bytes
	METRIC_MOLECULER_TRANSIT_PACKETS_RECEIVED_TOTAL: "moleculer.transit.packets.received.total",
	METRIC_MOLECULER_TRANSIT_PACKETS_RECEIVED_BYTES: "moleculer.transit.packets.received.bytes", // bytes
	METRIC_MOLECULER_TRANSIT_PENDING_REQUESTS: "moleculer.transit.pending.requests",
	METRIC_MOLECULER_TRANSIT_READY: "moleculer.transit.ready", // true/false
	METRIC_MOLECULER_TRANSIT_CONNECTED: "moleculer.transit.connected", // true/false

	METRIC_MOLECULER_TRANSIT_PONG_TIME: "moleculer.transit.pong.time", // true/false
	METRIC_MOLECULER_TRANSIT_PONG_SYSTIME_DIFF: "moleculer.transit.pong.systime-diff", // true/false

	// --- MOLECULER CIRCUIT BREAKER METRICS ---

	METRIC_MOLECULER_CIRCUIT_BREAKER_OPENED: "moleculer.circuit-breaker.opened",
	METRIC_MOLECULER_CIRCUIT_BREAKER_HALF_OPENED: "moleculer.circuit-breaker.half-opened",

	// --- MOLECULER FALLBACK METRICS ---

	METRIC_MOLECULER_FALLBACK_TOTAL: "moleculer.fallback.total",

	// --- MOLECULER CACHER METRICS ---

	METRIC_MOLECULER_CACHER_TYPE: "moleculer.cacher.type",
	METRIC_MOLECULER_CACHER_GET_TOTAL: "moleculer.cacher.get.total",
	METRIC_MOLECULER_CACHER_GET_DURATION: "moleculer.cacher.get.duration",
	METRIC_MOLECULER_CACHER_FOUND_TOTAL: "moleculer.cacher.found.total",
	METRIC_MOLECULER_CACHER_FOUND_DURATION: "moleculer.cacher.found.duration",
	METRIC_MOLECULER_CACHER_SET_TOTAL: "moleculer.cacher.set.total",
	METRIC_MOLECULER_CACHER_SET_DURATION: "moleculer.cacher.set.duration",
	METRIC_MOLECULER_CACHER_DEL_TOTAL: "moleculer.cacher.del.total",
	METRIC_MOLECULER_CACHER_DEL_DURATION: "moleculer.cacher.del.duration",
	METRIC_MOLECULER_CACHER_CLEAR_TOTAL: "moleculer.cacher.clear.total",
	METRIC_MOLECULER_CACHER_CLEAR_DURATION: "moleculer.cacher.clear.duration",

};
