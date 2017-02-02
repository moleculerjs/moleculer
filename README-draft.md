![Servicer logo](docs/assets/logo-servicer.png)

[![Build Status](https://travis-ci.org/icebob/servicer.svg?branch=master)](https://travis-ci.org/icebob/servicer)
[![Coverage Status](https://coveralls.io/repos/github/icebob/ice-services/badge.svg?branch=master)](https://coveralls.io/github/icebob/ice-services?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/d6b80db8619348e79210d6a725dfe2aa)](https://www.codacy.com/app/mereg-norbert/servicer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=icebob/servicer&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/icebob/servicer/badges/gpa.svg)](https://codeclimate.com/github/icebob/servicer)
[![David](https://img.shields.io/david/icebob/servicer.svg)](https://david-dm.org/icebob/servicer)
[![Known Vulnerabilities](https://snyk.io/test/github/icebob/servicer/badge.svg)](https://snyk.io/test/github/icebob/servicer)

# servicer
`servicer` is a fast & powerful microservices framework for NodeJS.

**Under heavy development! Please don't use in production environment currently!**

# What's included

- multiple services on a node/server
- built-in caching solution (memory, redis)
- request-reply concept
- event system
- support middlewares
- support plugins
- parameter validation
- load balanced calls (if running 2 or more instances from a service)
- every nodes are equal, no master/leader node
- auto discovery services
- Promise based methods
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

// Create service
new Service(broker, {
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

// Call actions
broker.call("math.add", { a: 5, b: 3 })
	.then(res => console.log("5 + 3 =", res));

broker.call("math.sub", { a: 9, b: 2 })
	.then(res => console.log("9 - 2 =", res));
	.catch(err => console.error(`Error occured! ${err.message}`));
```

## Create a broker

## Create a service

## Call the actions of service

# Service

## Schema

## Actions

## Events

## Methods

# Service broker

## Options

## Call actions

## Emit events

## Middlewares

## Plugins

# Context

# Cachers

## Memory cacher

## Redis cacher

## Custom cacher

# Transporters

## NATS Transporter

## Custom transporter

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