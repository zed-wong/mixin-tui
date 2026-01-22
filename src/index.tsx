#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./ui/App.js";

const main = () => {
  render(<App />);
};

main();
