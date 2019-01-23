/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const C = require("../constants");

const BaseMetric = require("./types/base");
const CounterMetric = require("./types/counter");
const GaugeMetric = require("./types/gauge");
const HistrogramMetric = require("./types/histogram");

module.exports = {
	BaseMetric,
	CounterMetric,
	GaugeMetric,
	HistrogramMetric,

	getByType(type)	{
		switch(type) {
			case C.METRIC_TYPE_COUNTER: return CounterMetric;
			case C.METRIC_TYPE_GAUGE: return GaugeMetric;
			case C.METRIC_TYPE_HISTROGRAM: return HistrogramMetric;
		}
		return null;
	}
};
