import { requireOptionalNativeModule } from 'expo';

export type BackgroundRefreshStatus = 'available' | 'denied' | 'restricted' | 'unknown';

type WidgetBridgeModule = {
  setContext(json: string): void;
  clearContext(): void;
  backgroundRefreshStatus(): BackgroundRefreshStatus;
};

// iOS only (modules/widget-bridge); Android and tests see null and every call is a no-op.
const native = requireOptionalNativeModule<WidgetBridgeModule>('WidgetBridge');

export function setWidgetContext(json: string): void {
  native?.setContext(json);
}

export function clearWidgetContext(): void {
  native?.clearContext();
}

export function backgroundRefreshStatus(): BackgroundRefreshStatus {
  return native?.backgroundRefreshStatus() ?? 'unknown';
}
