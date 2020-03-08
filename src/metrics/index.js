/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const METRIC = require("./constants");

const MetricRegistry = require("./registry");
const BaseMetric = require("./types/base");
const CounterMetric = require("./types/counter");
const GaugeMetric = require("./types/gauge");
const HistrogramMetric = require("./types/histogram");
const InfoMetric = require("./types/info");

const Reporters = require("./reporters");

module.exports = {
	METRIC: METRIC,

	MetricRegistry,

	BaseMetric,
	CounterMetric,
	GaugeMetric,
	HistrogramMetric,
	InfoMetric,

	Reporters
};
