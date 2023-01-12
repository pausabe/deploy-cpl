#!/bin/sh
cd $1
rm -rf node_modules
npm cache clean --force
npm install