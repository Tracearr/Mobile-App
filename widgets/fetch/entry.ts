import { buildTimelineFromInput, type FetchInput } from './buildTimeline.ts';

// The extension's JavaScriptCore context has no console, and i18next reaches
// for one on warnings.
globalThis.console ??= {
  log() {},
  warn() {},
  error() {},
  info() {},
  debug() {},
} as Console;

declare global {
  var __tracearrBuildTimeline: (inputJson: string) => string;
}

globalThis.__tracearrBuildTimeline = (inputJson) => {
  const input = JSON.parse(inputJson) as FetchInput;
  return JSON.stringify(buildTimelineFromInput(input));
};
