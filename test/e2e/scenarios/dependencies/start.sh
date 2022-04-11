#!/bin/bash

echo "Start Service Dependency scenario...";
echo "Transporter: $TRANSPORTER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=depedency;
node scenario.js
