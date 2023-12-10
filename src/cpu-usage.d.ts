declare type CpuUsageResponse = {
	avg: number;
	usages: number[];
};

declare function _exports(sampleTime?: number): Promise<CpuUsageResponse>;
export = _exports;
