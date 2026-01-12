#!/bin/bash
export PORT=${PORT:-8080}
export HOSTNAME="0.0.0.0"
cd .next/standalone
node server.js

