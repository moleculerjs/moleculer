/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const METRIC = require("../constants");

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
			case METRIC.TYPE_COUNTER: return CounterMetric;
			case METRIC.TYPE_GAUGE: return GaugeMetric;
			case METRIC.TYPE_HISTOGRAM: return HistrogramMetric;
			case METRIC.TYPE_INFO: return InfoMetric;
		}
		return null;
	}
};
