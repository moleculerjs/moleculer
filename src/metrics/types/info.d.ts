import BaseMetric = require("./base");

declare namespace InfoMetric {
	export interface InfoMetricSnapshot {
		value: any;
		labels: Record<string, any>;
		timestamp: number;
	}
}

declare class InfoMetric extends BaseMetric<InfoMetric.InfoMetricSnapshot> {
	set(value: any | null, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): InfoMetric.InfoMetricSnapshot[];
}
export = InfoMetric;
