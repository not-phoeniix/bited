#!/bin/bash

mkdir -p out 
ags bundle src/app.ts out/bited

mkdir -p $HOME/.local/bin
cp out/bited $HOME/.local/bin
