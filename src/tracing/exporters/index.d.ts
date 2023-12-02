import BaseTraceExporter = require("./base");
import ConsoleTraceExporter = require("./console");
import DatadogTraceExporter = require("./datadog");
import EventTraceExporter = require("./event");
import EventLegacyTraceExporter = require("./event-legacy");
import JaegerTraceExporter = require("./jaeger");
import ZipkinTraceExporter = require("./zipkin");
import NewRelicTraceExporter = require("./newrelic");

export {
	BaseTraceExporter as Base,
	ConsoleTraceExporter as Console,
	DatadogTraceExporter as Datadog,
	EventTraceExporter as Event,
	EventLegacyTraceExporter as EventLegacy,
	JaegerTraceExporter as Jaeger,
	ZipkinTraceExporter as Zipkin,
	NewRelicTraceExporter as NewRelic
};

export declare function resolve(opt: Record<string,any>|string): BaseTraceExporter;
export declare function register(name: string, value: BaseTraceExporter): void;
