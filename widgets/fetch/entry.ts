import { buildTimelineFromInput, type FetchInput } from './buildTimeline.ts';

// The extension's JavaScriptCore context has no console, and i18next reaches
// for one on warnings.
if (typeof globalThis.console === 'undefined') {
  Object.defineProperty(globalThis, 'console', {
    value: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
  });
}

declare global {
  var __tracearrBuildTimeline: (inputJson: string) => string;
}

const parseInput = (inputJson: string): FetchInput => JSON.parse(inputJson);

globalThis.__tracearrBuildTimeline = (inputJson) =>
  JSON.stringify(buildTimelineFromInput(parseInput(inputJson)));
