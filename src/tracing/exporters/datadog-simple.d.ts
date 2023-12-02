import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type { Logger } from "../../logger-factory";
import type Span = require("../span");
import type Tracer = require("../tracer");
import { Color } from "kleur";

declare namespace DatadogSimpleTraceExporter {
	export interface DatadogSimpleTraceExporterOptions extends BaseTraceExporterOptions {
		agentUrl?: string;
		interval?: number;
		defaultTags?: Record<string, any> | Tracer.TracerDefaultTagsFunction;
	}
}

declare class DatadogSimpleTraceExporter extends BaseTraceExporter {
	opts: DatadogSimpleTraceExporter.DatadogSimpleTraceExporterOptions;
	timer: NodeJS.Timeout;
	defaultTags: Record<string, any>;
	queue: Array<Span>;

	constructor(opts: DatadogSimpleTraceExporter.DatadogSimpleTraceExporterOptions);

	init(tracer: Tracer): void;

	spanFinished(span: Span): void;
	flush(): void;
	convertIDToNumber(str: string): number | null;
	generateDatadogTracingData(): Record<string, any>[];
}
export = DatadogSimpleTraceExporter;
