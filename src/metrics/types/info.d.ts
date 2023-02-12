import BaseMetric = require("./base");

export interface InfoMetricSnapshot {
	value: any;
	labels: Record<string, any>;
	timestamp: number;
}

declare class InfoMetric extends BaseMetric<InfoMetricSnapshot> {
	set(value: any | null, labels?: Record<string, any>, timestamp?: number): void;

	generateSnapshot(): InfoMetricSnapshot[];
}
export = InfoMetric;
