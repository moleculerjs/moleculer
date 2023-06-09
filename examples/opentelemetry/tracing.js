"use strict";

const {
	api,
	core,
	node,
	tracing,
	metrics,
	resources,
	contextBase
} = require("@opentelemetry/sdk-node");

const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

// const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-proto");
// const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
// api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.ALL);

// const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");
// const exporter = new OTLPTraceExporter({
// 	tags: [], // optional
// 	endpoint: "http://localhost:14268/api/traces"
// });

const exporter = new OTLPTraceExporter({
	url: "https://otlp.nr-data.net:4318/v1/traces",
	headers: {
		"api-key": `${process.env.NR_LICENSE}`
	}
});

const provider = new node.NodeTracerProvider({
	resource: new resources.Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: "moleculer",
		[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: "dev"
	})
});

// Configure span processor to send spans to the exporter
provider.addSpanProcessor(new tracing.SimpleSpanProcessor(new tracing.ConsoleSpanExporter()));
provider.addSpanProcessor(new tracing.BatchSpanProcessor(exporter));
provider.register();

registerInstrumentations({
	// Instrumentation configuration
	instrumentations: [
		getNodeAutoInstrumentations({
			"@opentelemetry/instrumentation-fs": {
				requireParentSpan: true
			}
		})
	],
	autoDetectResources: true
});
