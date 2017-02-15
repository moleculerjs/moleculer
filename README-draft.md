<!--
 ![Servicer logo](docs/assets/logo-servicer.png)

[![Build Status](https://travis-ci.org/icebob/servicer.svg?branch=master)](https://travis-ci.org/icebob/servicer)
[![Coverage Status](https://coveralls.io/repos/github/icebob/ice-services/badge.svg?branch=master)](https://coveralls.io/github/icebob/ice-services?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1b087e280c784a48afe91cb388879786)](https://www.codacy.com/app/mereg-norbert/servicer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=icebob/servicer&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/icebob/servicer/badges/gpa.svg)](https://codeclimate.com/github/icebob/servicer)
[![David](https://img.shields.io/david/icebob/servicer.svg)](https://david-dm.org/icebob/servicer)
[![Known Vulnerabilities](https://snyk.io/test/github/icebob/servicer/badge.svg)](https://snyk.io/test/github/icebob/servicer)
-->
# servicer
Servicer is a fast & powerful microservices framework for NodeJS (>= 6.x).
<!--
![](https://img.shields.io/badge/performance-%2B50%25-brightgreen.svg)
![](https://img.shields.io/badge/performance-%2B5%25-green.svg)
![](https://img.shields.io/badge/performance---10%25-yellow.svg)
![](https://img.shields.io/badge/performance---42%25-red.svg)
-->
**Under heavy development! Please don't use in production environment currently!**

# What's included

- multiple services on a node/server
- built-in caching solution (memory, redis)
- request-reply concept
- event bus system
- support middlewares
- load balanced calls (round-robin, random)
- every nodes are equal, no master/leader node
- auto discovery services
- parameter validation
- request timeout handling with fallback response
- Promise based methods
- health monitoring & statistics
- support versioned services (you can run different versions of the same service at the same time)


# Installation
```
$ npm install servicer --save
```

or

```
$ yarn add servicer
```

# Usage

### Simple service with actions & call actions locally
```js
"use strict";

const { ServiceBroker, Service } = require("servicer");

// Create broker
let broker = new ServiceBroker({ 
    logger: console 
});

// Create a service
broker.createService({
    name: "math",
    actions: {
        // You can call it as broker.call("math.add")
        add(ctx) {
            return Number(ctx.params.a) + Number(ctx.params.b);
        },

        // You can call it as broker.call("math.sub")
        sub(ctx) {
            return Number(ctx.params.a) - Number(ctx.params.b);
        }
    }
});

// Start broker
broker.start();

// Call actions of service
broker.call("math.add", { a: 5, b: 3 })
    .then(res => console.log("5 + 3 =", res));

broker.call("math.sub", { a: 9, b: 2 })
    .then(res => console.log("9 - 2 =", res));
    .catch(err => console.error(`Error occured! ${err.message}`));
```

# Servicer main modules

## ServiceBroker
The `ServiceBroker` is the main component of Servicer. It handles services & events, call actions, communicate with remote nodes. You need to create an instance on every node.

### Create a broker
```js
    // Create broker with default settings
    let broker = new ServiceBroker();

    // Create broker with custom settings
    let broker = new ServiceBroker({
        logger: console,
        logLevel: "info"
    });

    // Create with transporter
    let { NatsTransporter } = require("servicer");
    let broker = new ServiceBroker({
        nodeID: "node-1",
        transporter: new NatsTransporter(),
        logger: console,
        logLevel: "debug",
        requestTimeout: 5 * 1000,
        requestRetry: 3
    });

    // Create with cacher
    let MemoryCacher = require("servicer").Cachers.Memory;
    let broker = new ServiceBroker({
        cacher: new MemoryCacher(),
        logger: console,
        logLevel: {
            "*": "warn", // global log level for every modules
            "CAHER": "debug" // custom log level for cacher modules
        }
    });
    
```

### Broker options
All available options:
```js
{
    nodeID: null,

    logger: null,
    logLevel: "info",

    transporter: null,
    requestTimeout: 15 * 1000,
    requestRetry: 0,
    sendHeartbeatTime: 10,
    nodeHeartbeatTimeout: 30,

    cacher: null,

    metrics: false,
    metricsNodeTime: 5 * 1000,
    statistics: false,
    validation: true,
    internalActions: true
    
    ServiceFactory: null,
    ContextFactory: null
}
```

| Name | Type | Default | Description |
| ------- | ----- | ------- | ------- |
| `nodeID` | `String` | Computer name | This is the ID of node. It's important to communication when you have 2 or more nodes. |
| `logger` | `Object` | `null` | Logger class. Under development or test you can set to `console`. In production you can set an external logger e.g. `winston` |
| `logLevel` | `String` | `info` | Level of logging (debug, info, warn, error) |
| `transporter` | `Object` | `null` | Instance of transporter. Need if you have 2 or more nodes. Internal transporters: [NatsTransporter](#nats-transporter)  |
| `requestTimeout` | `Number` | `15000` | Timeout of request in milliseconds. If the request is timed out, broker will throw a `RequestTimeout` error. Disable: 0 |
| `requestRetry` | `Number` | `0` | Count of retry of request. If the request timed out, broker will try to call again. |
| `cacher` | `Object` | `null` | Instance of cacher. Built-in cachers: [MemoryCacher](#memory-cacher) or [RedisCacher](#redis-cacher) |
| `metrics` | `Boolean` | `false` | Enable [metrics](#metrics) function. |
| `metricsNodeTime` | `Number` | `5000` | Metrics event send period in milliseconds |
| `statistics` | `Boolean` | `false` | Enable broker [statistics](). Measure the requests count & latencies |
| `validation` | `Boolean` | `false` | Enable action [parameters validation](). |
| `internalActions` | `Boolean` | `true` | Register internal actions for metrics & statistics functions |
| `sendHeartbeatTime` | `Number` | `10` | ??? |
| `nodeHeartbeatTimeout` | `Number` | `30` | ??? |
| `ServiceFactory` | `Class` | `null` | Custom Service class. Broker will use it when create a service |
| `ContextFactory` | `Class` | `null` | Custom Context class. Broker will use it when create a context at call |

## Call actions
You can call an action with the `broker.call` method. Broker will search which service (and which node) has the action and call it. The function returns with a Promise.

### Syntax
```js
    let promise = broker.call(actionName, params, opts);
```
The `actionName` is a dot-separated string. First part is the name of service. Seconds part is the name of action. So if you have a `posts` service which contains a `create` action, you need to use `posts.create` string as first parameter.

The `params` is an object, which pass to the action in [Context](#context)

The `opts` is an object. With this, you can set/override some request parameter, e.g.: `timeout`, `retryCount`
Available options:
| Name | Type | Default | Description |
| ------- | ----- | ------- | ------- |
| `timeout` | `Number` | `requestTimeout of broker` | Timeout of request in milliseconds. If the request is timed out and don't define `fallbackResponse`, broker will throw a `RequestTimeout` error. Disable: 0 |
| `retryCount` | `Number` | `requestRetry of broker` | Count of retry of request. If the request timed out, broker will try to call again. |
| `fallbackResponse` | `Any` | `null` | If you define it and the request timed out, broker won't throw error, instead return with this value. It can be an `Object`, `Array`...etc. If it is a `Function`, it should return a `Promise` |


### Usage
```js
    // Call without params
    broker.call("user.list").then(res => console.log("User list: ", res));

    // Call with params
    broker.call("user.get", { id: 3 }).then(res => console.log("User: ", res));

    // Call with options
    broker.call("recommendation", { limit: 5 }, { timeout: 500, fallbackResponse: defaultRecommendation }).then(res => console.log("User: ", res));
```

### Request timeout & fallback response

## Emit events

## Middlewares


# Service

## Schema

## Actions

## Events

## Methods

## Create a service

# Service broker

# Context

# Cachers

## Memory cacher

## Redis cacher

## Custom cacher

# Transporters

## NATS Transporter

## Custom transporter

# Metrics

# Statistics

# Nodes

# Test
```
$ npm test
```

or in development

```
$ npm run ci
```

# Benchmarks

# Contribution
Please send pull requests improving the usage and fixing bugs, improving documentation and providing better examples, or providing some testing, because these things are important.

# License
servicer is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2017 Icebob

[![@icebob](https://img.shields.io/badge/github-icebob-green.svg)](https://github.com/icebob) [![@icebob](https://img.shields.io/badge/twitter-Icebobcsi-blue.svg)](https://twitter.com/Icebobcsi)