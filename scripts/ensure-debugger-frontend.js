#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const reactNativeNodeModulesDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native"
);
const debuggerFrontendPath = path.join(
  reactNativeNodeModulesDir,
  "debugger-frontend"
);
const debuggerClientPath = path.join(reactNativeNodeModulesDir, "debugger-client");

function pathExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

if (pathExists(debuggerFrontendPath)) {
  process.exit(0);
}

if (!pathExists(debuggerClientPath)) {
  console.warn(
    "[ensure-debugger-frontend] @react-native/debugger-client not found; skipping alias creation."
  );
  process.exit(0);
}

try {
  const linkType = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync("debugger-client", debuggerFrontendPath, linkType);
  console.log(
    "[ensure-debugger-frontend] Linked @react-native/debugger-frontend -> @react-native/debugger-client"
  );
} catch (error) {
  console.error(
    "[ensure-debugger-frontend] Failed to create debugger frontend alias:",
    error.message
  );
  process.exit(1);
}
