![Moleculer logo](docs/assets/logo.png)

[![Build Status](https://travis-ci.org/ice-services/moleculer.svg?branch=master)](https://travis-ci.org/ice-services/moleculer)
[![Coverage Status](https://coveralls.io/repos/github/ice-services/moleculer/badge.svg?branch=master)](https://coveralls.io/github/ice-services/moleculer?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b108c12cbf554fca9c66dd1925d11cd0)](https://www.codacy.com/app/mereg-norbert/moleculer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ice-services/moleculer&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/ice-services/moleculer/badges/gpa.svg)](https://codeclimate.com/github/ice-services/moleculer)
[![David](https://img.shields.io/david/ice-services/moleculer.svg)](https://david-dm.org/ice-services/moleculer)
[![Known Vulnerabilities](https://snyk.io/test/github/ice-services/moleculer/badge.svg)](https://snyk.io/test/github/ice-services/moleculer)
[![Join the chat at https://gitter.im/ice-services/moleculer](https://badges.gitter.im/ice-services/moleculer.svg)](https://gitter.im/ice-services/moleculer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Moleculer [![NPM version](https://img.shields.io/npm/v/moleculer.svg)](https://www.npmjs.com/package/moleculer)

Moleculer is a fast & powerful microservices framework for NodeJS (>= v6.x).
<!--
![](https://img.shields.io/badge/performance-%2B50%25-brightgreen.svg)
![](https://img.shields.io/badge/performance-%2B5%25-green.svg)
![](https://img.shields.io/badge/performance---10%25-yellow.svg)
![](https://img.shields.io/badge/performance---42%25-red.svg)
-->

**Website**: [https://moleculer.services](https://moleculer.services)

**Documentation**: [https://moleculer.services/docs](https://moleculer.services/docs)

# What's included

- Promise-based solution
- request-reply concept
- event bus system
- supports middlewares
- multiple services on a node/server
- built-in caching solution (memory, Redis)
- multiple supported transporters (NATS, MQTT, Redis)
- multiple supported serializers (JSON, Avro, MsgPack, Protocol Buffer)
- load balanced requests (round-robin, random)
- every nodes are equal, no master/leader node
- auto discovery services
- parameter validation
- distributed timeout handling with fallback response
- health monitoring, metrics & statistics
- supports versioned services (run different versions of the service)

# Installation
```
$ npm install moleculer --save
```
or
```
$ yarn add moleculer
```

# Your first microservice

```js
const { ServiceBroker } = require("moleculer");

let broker = new ServiceBroker({ logger: console });

broker.createService({
    name: "math",
    actions: {
        add(ctx) {
            return Number(ctx.params.a) + Number(ctx.params.b);
        }
    }
});

broker.start();

// Call service
broker.call("math.add", { a: 5, b: 3 })
    .then(res => console.log("5 + 3 =", res))
    .catch(err => console.error(`Error occured! ${err.message}`));
```
[Try it on Runkit](https://runkit.com/icebob/moleculer-quick-example)

# Create a Moleculer project
The fastest way is that use Moleculer CLI tool to create a new Moleculer based microservices project.
1. Install [moleculer-cli](https://github.com/ice-services/moleculer-cli)
    ```bash
    $ npm install moleculer-cli -g
    ````
2. Create a new project (named `first-demo`)
    ```bash
    $ moleculer init project-simple first-demo
    ````
    > Add API Gateway and press Y to `npm install`
    
3. Open project folder
    ```bash
    $ cd first-demo
    ````
    
4. Start project
    ```bash
    $ npm run dev
    ````
5. Open the [http://localhost:3000/math.add?a=5&b=3](http://localhost:3000/math.add?a=5&b=3) link in your browser. It will call the `add` action of `math` service with two params via [API gateway](https://github.com/ice-services/moleculer-web) and returns with the result.

:tada:**Congratulation, you created your first Moleculer based microservices project. Read our [documentation](https://moleculer.services/docs) to learn more about Moleculer.**

# Documentation
You can find [the documentation here](https://moleculer.services/docs).

# Changelog
See [CHANGELOG.md](CHANGELOG.md).

# Roadmap
See [ROADMAP.md](ROADMAP.md).

# License
Moleculer is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2016-2017 Ice Services

[![@ice-services](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/ice-services) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
