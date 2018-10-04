/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * CPU usage measure.
 *
 * Based on: https://github.com/icebob/cpu
 */
const os = require("os");

/* istanbul ignore next */
module.exports = function getCpuUsage(sampleTime = 100) {
    return new Promise((resolve, reject) => {
        try {
            const first = os.cpus().map(cpu => cpu.times);
            setTimeout(() => {
                try {
                    const second = os.cpus().map(cpu => cpu.times);
                    setTimeout(() => {
                        try {
                            const third = os.cpus().map(cpu => cpu.times);

                            const usages = [];
                            for (let i = 0; i < first.length; i++) {
                                const first_idle = first[i].idle;
                                const first_total = first[i].idle + first[i].user + first[i].nice + first[i].sys + first[i].irq;
                                const second_idle = second[i].idle;
                                const second_total = second[i].idle + second[i].user + second[i].nice + second[i].sys + second[i].irq;
                                const third_idle = third[i].idle;
                                const third_total = third[i].idle + third[i].user + third[i].nice + third[i].sys + third[i].irq;
                                const first_usage = 1 - (second_idle - first_idle) / (second_total - first_total);
                                const second_usage = 1 - (third_idle - second_idle) / (third_total - second_total);
                                const per_usage = (first_usage + second_usage) / 2 * 100;
                                usages.push(per_usage);
                            }

                            resolve({
                                avg: usages.reduce((a, b) => a + b, 0) / usages.length,
                                usages
                            });
                        } catch (err) {
                            reject();
                        }
                    }, sampleTime);
                } catch (err) {
                    reject();
                }
            }, sampleTime);
        } catch (err) {
            reject();
        }
    });
};
