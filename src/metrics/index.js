/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const C = require("./constants");

const MetricRegistry = require("./registry");
const BaseMetric = require("./types/base");
const CounterMetric = require("./types/counter");
const GaugeMetric = require("./types/gauge");
const HistrogramMetric = require("./types/histogram");

module.exports = {
	METRIC_TYPE_COUNTER: C.METRIC_TYPE_COUNTER,
	METRIC_TYPE_GAUGE: C.METRIC_TYPE_GAUGE,
	METRIC_TYPE_HISTROGRAM: C.METRIC_TYPE_HISTROGRAM,

	MetricRegistry,

	BaseMetric,
	CounterMetric,
	GaugeMetric,
	HistrogramMetric,
};
