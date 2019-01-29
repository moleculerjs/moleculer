/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const C = require("../constants");

const BaseMetric = require("./base");
const CounterMetric = require("./counter");
const GaugeMetric = require("./gauge");
const HistrogramMetric = require("./histogram");
const InfoMetric = require("./info");

module.exports = {
	BaseMetric,
	CounterMetric,
	GaugeMetric,
	HistrogramMetric,
	InfoMetric,

	getByType(type)	{
		switch(type) {
			case C.METRIC_TYPE_COUNTER: return CounterMetric;
			case C.METRIC_TYPE_GAUGE: return GaugeMetric;
			case C.METRIC_TYPE_HISTROGRAM: return HistrogramMetric;
			case C.METRIC_TYPE_INFO: return InfoMetric;
		}
		return null;
	}
};
