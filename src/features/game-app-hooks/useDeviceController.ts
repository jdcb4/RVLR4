import { useEffect, useState, useSyncExternalStore } from "react";

export interface DeviceController<View> {
  getSnapshot: () => View;
  subscribe: (listener: () => void) => () => void;
  mount: () => () => void;
}

/** React owns one controller per mounted game; the controller owns durable transitions. */
export function useDeviceController<Controller extends DeviceController<unknown>>(
  create: () => Controller,
) {
  const [controller] = useState(create);
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot as () => ReturnType<Controller["getSnapshot"]>,
  );
  useEffect(() => controller.mount(), [controller]);
  return { controller, view };
}
