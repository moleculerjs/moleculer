import MetricBaseReporter = require("./base");
import ConsoleReporter = require("./console");
import CSVReporter = require("./csv");
import EventReporter = require("./event");
import DatadogReporter = require("./datadog");
import PrometheusReporter = require("./prometheus");
import StatsDReporter = require("./statsd");

export {
	MetricBaseReporter as Base,
	ConsoleReporter as Console,
	CSVReporter as CSV,
	EventReporter as Event,
	DatadogReporter as Datadog,
	PrometheusReporter as Prometheus,
	StatsDReporter as StatsD
};

export declare function resolve(opt: Record<string, any> | string | boolean): MetricBaseReporter;
export declare function register(name: string, value: MetricBaseReporter): void;
