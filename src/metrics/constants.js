/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {

	// --- METRIC TYPES ---

	TYPE_COUNTER:  "counter",
	TYPE_GAUGE:  "gauge",
	TYPE_HISTOGRAM:  "histogram",
	TYPE_INFO:  "info",

	// --- METRICREGISTRY METRICS ---

	MOLECULER_METRICS_COMMON_COLLECT_TOTAL: "moleculer.metrics.common.collect.total",
	MOLECULER_METRICS_COMMON_COLLECT_TIME: "moleculer.metrics.common.collect.time",

	// --- PROCESS METRICS ---

	PROCESS_ARGUMENTS: "process.arguments", // INFO

	PROCESS_PID: "process.pid",
	PROCESS_PPID: "process.ppid",

	// TODO: https://github.com/bripkens/event-loop-stats
	PROCESS_EVENTLOOP_LAG: "process.eventloop.lag", // msec

	PROCESS_MEMORY_HEAP_SIZE_TOTAL: "process.memory.heap.size.total", // bytes
	PROCESS_MEMORY_HEAP_SIZE_USED: "process.memory.heap.size.used", // bytes
	PROCESS_MEMORY_RSS: "process.memory.rss", // bytes
	PROCESS_MEMORY_EXTERNAL: "process.memory.external", // bytes

	PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL: "process.memory.heap.space.size.total", // bytes
	PROCESS_MEMORY_HEAP_SPACE_SIZE_USED: "process.memory.heap.space.size.used", // bytes
	PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE: "process.memory.heap.space.size.available", // bytes
	PROCESS_MEMORY_HEAP_SPACE_SIZE_PHYSICAL: "process.memory.heap.space.size.physical", // bytes

	PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_TOTAL: "process.memory.heap.stat.heap.size.total", // bytes
	PROCESS_MEMORY_HEAP_STAT_EXECUTABLE_SIZE_TOTAL: "process.memory.heap.stat.executable.size.total", // bytes
	PROCESS_MEMORY_HEAP_STAT_PHYSICAL_SIZE_TOTAL: "process.memory.heap.stat.physical.size.total", // bytes
	PROCESS_MEMORY_HEAP_STAT_AVAILABLE_SIZE_TOTAL: "process.memory.heap.stat.available.size.total", // bytes
	PROCESS_MEMORY_HEAP_STAT_USED_HEAP_SIZE: "process.memory.heap.stat.used.heap.size", // bytes
	PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_LIMIT: "process.memory.heap.stat.heap.size.limit", // bytes
	PROCESS_MEMORY_HEAP_STAT_MALLOCATED_MEMORY: "process.memory.heap.stat.mallocated.memory", // bytes
	PROCESS_MEMORY_HEAP_STAT_PEAK_MALLOCATED_MEMORY: "process.memory.heap.stat.peak.mallocated.memory", // bytes
	PROCESS_MEMORY_HEAP_STAT_ZAP_GARBAGE: "process.memory.heap.stat.zap.garbage",

	PROCESS_UPTIME: "process.uptime", // seconds
	PROCESS_ACTIVE_HANDLES: "process.active.handles",
	PROCESS_ACTIVE_REQUESTS: "process.active.requests",

	// --- GARBAGE COLLECTOR METRICS ---

	PROCESS_GC_TIME: "process.gc.time", // nanoseconds
	PROCESS_GC_TOTAL_TIME: "process.gc.total.time", // milliseconds
	PROCESS_GC_SCAVENGE: "process.gc.scavenge",
	PROCESS_GC_MARKSWEEP: "process.gc.marksweep",

	// --- OS METRICS ---

	OS_MEMORY_FREE: "os.memory.free", // bytes
	OS_MEMORY_TOTAL: "os.memory.total", // bytes
	OS_UPTIME: "os.uptime", // seconds
	OS_TYPE: "os.type",
	OS_RELEASE: "os.release",
	OS_HOSTNAME: "os.hostname",
	OS_ARCH: "os.arch",
	OS_PLATFORM: "os.platform",
	OS_USER_UID: "os.user.uid",
	OS_USER_GID: "os.user.gid",
	OS_USER_USERNAME: "os.user.username",
	OS_USER_HOMEDIR: "os.user.homedir",

	OS_DATETIME_UNIX: "os.datetime.unix",
	OS_DATETIME_ISO: "os.datetime.iso",
	OS_DATETIME_UTC: "os.datetime.utc",
	OS_DATETIME_TZ_OFFSET: "os.datetime.tz.offset",

	OS_NETWORK_ADDRESS: "os.network.address",
	OS_NETWORK_FAMILY: "os.network.family",
	OS_NETWORK_MAC: "os.network.mac",

	OS_CPU_LOAD_1: "os.cpu.load.1",
	OS_CPU_LOAD_5: "os.cpu.load.5",
	OS_CPU_LOAD_15: "os.cpu.load.15",
	OS_CPU_UTILIZATION: "os.cpu.utilization",

	OS_CPU_USER: "os.cpu.user", // seconds
	OS_CPU_SYSTEM: "os.cpu.system", // seconds

	OS_CPU_TOTAL: "os.cpu.total",
	OS_CPU_INFO_MODEL: "os.cpu.info.model",
	OS_CPU_INFO_SPEED: "os.cpu.info.speed",
	OS_CPU_INFO_TIMES_USER: "os.cpu.info.times.user",
	OS_CPU_INFO_TIMES_SYS: "os.cpu.info.times.sys",

	// --- MOLECULER NODE METRICS ---

	MOLECULER_NODE_TYPE: "moleculer.node.type",
	MOLECULER_NODE_VERSIONS_MOLECULER: "moleculer.node.versions.moleculer",
	MOLECULER_NODE_VERSIONS_LANG: "moleculer.node.versions.lang",

	// --- MOLECULER BROKER METRICS ---

	MOLECULER_BROKER_NAMESPACE: "moleculer.broker.namespace",
	MOLECULER_BROKER_STARTED: "moleculer.broker.started",
	MOLECULER_BROKER_SERVICES_TOTAL: "moleculer.broker.services.total",
	MOLECULER_BROKER_MIDDLEWARES_TOTAL: "moleculer.broker.middlewares.total",

	// --- MOLECULER REGISTRY METRICS ---

	MOLECULER_REGISTRY_NODES_COUNT: "moleculer.registry.nodes.count",
	MOLECULER_REGISTRY_SERVICES_COUNT: "moleculer.registry.services.count",
	MOLECULER_REGISTRY_SERVICE_ENDPOINTS_COUNT: "moleculer.registry.service.endpoints.count",
	MOLECULER_REGISTRY_ACTIONS_COUNT: "moleculer.registry.actions.count",
	MOLECULER_REGISTRY_ACTION_ENDPOINTS_COUNT: "moleculer.registry.action.endpoints.count",
	MOLECULER_REGISTRY_EVENTS_COUNT: "moleculer.registry.events.count",
	MOLECULER_REGISTRY_EVENT_ENDPOINTS_COUNT: "moleculer.registry.event.endpoints.count",

	// --- MOLECULER REQUEST METRICS ---

	MOLECULER_REQUEST_TOTAL: "moleculer.request.total",
	MOLECULER_REQUEST_ERROR_TOTAL: "moleculer.request.error.total",
	MOLECULER_REQUEST_DURATION: "moleculer.request.duration", //msec
	MOLECULER_REQUEST_LEVELS: "moleculer.request.levels", //ctx.level histogram
	MOLECULER_REQUEST_OPRHAN_TOTAL: "moleculer.request.orphan.total",
	MOLECULER_REQUEST_DIRECTCALL_TOTAL: "moleculer.request.directcall.total",
	MOLECULER_REQUEST_MULTICALL_TOTAL: "moleculer.request.multicall.total",

	MOLECULER_REQUEST_STREAMS_SENT_TOTAL: "moleculer.request.streams.sent.total",
	MOLECULER_REQUEST_STREAMS_RECEIVED_TOTAL: "moleculer.request.streams.received.total",

	// --- MOLECULER EVENTS METRICS ---

	MOLECULER_EVENT_EMIT_TOTAL: "moleculer.event.emit.total", //msec
	MOLECULER_EVENT_BROADCAST_TOTAL: "moleculer.event.broadcast.total", //msec
	MOLECULER_EVENT_BROADCASTLOCAL_TOTAL: "moleculer.event.broadcastlocal.total", //msec

	// --- MOLECULER TRANSIT METRICS ---

	MOLECULER_TRANSIT_PACKETS_SENT_TOTAL: "moleculer.transit.packets.sent.total",
	MOLECULER_TRANSIT_PACKETS_SENT_BYTES: "moleculer.transit.packets.sent.bytes", // bytes
	MOLECULER_TRANSIT_PACKETS_RECEIVED_TOTAL: "moleculer.transit.packets.received.total",
	MOLECULER_TRANSIT_PACKETS_RECEIVED_BYTES: "moleculer.transit.packets.received.bytes", // bytes
	MOLECULER_TRANSIT_PENDING_REQUESTS: "moleculer.transit.pending.requests",
	MOLECULER_TRANSIT_READY: "moleculer.transit.ready", // true/false
	MOLECULER_TRANSIT_CONNECTED: "moleculer.transit.connected", // true/false

	MOLECULER_TRANSIT_PONG_TIME: "moleculer.transit.pong.time", // true/false
	MOLECULER_TRANSIT_PONG_SYSTIME_DIFF: "moleculer.transit.pong.systime-diff", // true/false

	// --- MOLECULER CIRCUIT BREAKER METRICS ---

	MOLECULER_CIRCUIT_BREAKER_OPENED: "moleculer.circuit-breaker.opened",
	MOLECULER_CIRCUIT_BREAKER_HALF_OPENED: "moleculer.circuit-breaker.half-opened",

	// --- MOLECULER FALLBACK METRICS ---

	MOLECULER_FALLBACK_TOTAL: "moleculer.fallback.total",

	// --- MOLECULER CACHER METRICS ---

	MOLECULER_CACHER_TYPE: "moleculer.cacher.type",
	MOLECULER_CACHER_GET_TOTAL: "moleculer.cacher.get.total",
	MOLECULER_CACHER_GET_DURATION: "moleculer.cacher.get.duration",
	MOLECULER_CACHER_FOUND_TOTAL: "moleculer.cacher.found.total",
	MOLECULER_CACHER_FOUND_DURATION: "moleculer.cacher.found.duration",
	MOLECULER_CACHER_SET_TOTAL: "moleculer.cacher.set.total",
	MOLECULER_CACHER_SET_DURATION: "moleculer.cacher.set.duration",
	MOLECULER_CACHER_DEL_TOTAL: "moleculer.cacher.del.total",
	MOLECULER_CACHER_DEL_DURATION: "moleculer.cacher.del.duration",
	MOLECULER_CACHER_CLEAR_TOTAL: "moleculer.cacher.clear.total",
	MOLECULER_CACHER_CLEAR_DURATION: "moleculer.cacher.clear.duration",


	// --- COMMON UNITS ---
	// Inspired by https://docs.datadoghq.com/developers/metrics/#units

	// Bytes
	UNIT_BIT: "bit",
	UNIT_BYTE: "byte",
	UNIT_KILOBYTES: "kilobyte",
	UNIT_MEGABYTE: "megabyte",
	UNIT_GIGABYTE: "gigabyte",
	UNIT_TERRABYTE: "terrabyte",
	UNIT_PETABYTE: "petabyte",
	UNIT_EXOBYTE: "exabyte",

	// Time
	UNIT_NANOSECONDS: "nanosecond",
	UNIT_MICROSECONDS: "microsecond",
	UNIT_MILLISECONDS: "millisecond",
	UNIT_SECONDS: "second",
	UNIT_MINUTE: "minute",
	UNIT_HOUR: "hour",
	UNIT_DAY: "day",
	UNIT_WEEK: "wek",
	UNIT_MONTH: "month",
	UNIT_YEAR: "year",

	// Process
	UNIT_HANDLE: "handle",
	UNIT_CPU: "cpu",
	UNIT_GHZ: "GHz",

	// Network
	UNIT_REQUEST: "request",
	UNIT_CONNECTION: "connection",
	UNIT_PACKET: "packet",
	UNIT_MESSAGE: "message",
};
