import BaseTraceExporter = require("./base");
import type { BaseTraceExporterOptions } from "./base";

import type { Logger } from "../../logger-factory";
import type Span = require("../span");
import type Tracer = require("../tracer");
import { Color } from "kleur";

declare namespace ConsoleTraceExporter {
	export interface ConsoleTraceExporterOptions extends BaseTraceExporterOptions {
		logger?: Logger | null;
		colors?: boolean;
		width?: number;
		gaugeWidth?: number;
	}
}

declare class ConsoleTraceExporter extends BaseTraceExporter {
	opts: ConsoleTraceExporter.ConsoleTraceExporterOptions;

	constructor(opts: ConsoleTraceExporter.ConsoleTraceExporterOptions);

	init(tracer: Tracer): void;

	stop(): void;

	spanStarted(span: Span): void;
	spanFinished(span: Span): void;

	removeSpanWithChildren(spanID: string): void;
	drawTableTop(): void;
	drawHorizonalLine(): void;
	drawLine(text: any): void;
	drawTableBottom(): void;
	getAlignedTexts(str: string, space: number): string;
	drawGauge(gstart: number, gstop: number): string;
	getCaption(span: Span): string;
	getColor(span: Span): Color;
	getTraceInfo(main: Record<string, any>): {
		depth: number;
		total: number;
	};
	getSpanIndent(spanItem: Record<string, any>): string;
	printSpanTime(
		spanItem: Record<string, any>,
		mainItem: Record<string, any>,
		level: number
	): void;
	printRequest(id: string): void;
	log(...args: any[]): any;
}
export = ConsoleTraceExporter;
