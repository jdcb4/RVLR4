import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: false,
  addListener: vi.fn(),
  getState: vi.fn(),
  bridge: { setKeepAwake: vi.fn() },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
}));
vi.mock("@capacitor/app", () => ({
  App: { addListener: mocks.addListener, getState: mocks.getState },
}));
vi.mock("./nativeSnapshotStore", () => ({ deviceBridge: mocks.bridge }));

type NativeCallback = (state: { isActive: boolean }) => void;
const callbacks = new Map<string, NativeCallback>();

async function lifecycle() {
  return import("./deviceLifecycle");
}

function visible(value: boolean) {
  vi.spyOn(document, "hidden", "get").mockReturnValue(!value);
  document.dispatchEvent(new Event("visibilitychange"));
}

function nativeEvent(name: string, active = false) {
  callbacks.get(name)?.({ isActive: active });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.clearAllMocks();
  callbacks.clear();
  mocks.native = false;
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  mocks.getState.mockResolvedValue({ isActive: true });
  mocks.addListener.mockImplementation(async (name: string, callback: NativeCallback) => {
    callbacks.set(name, callback);
    return { remove: vi.fn().mockResolvedValue(undefined) };
  });
  mocks.bridge.setKeepAwake.mockResolvedValue(undefined);
});

describe("device lifecycle", () => {
  it("reports initial browser activity, deduplicates visibility changes and cleans up", async () => {
    const api = await lifecycle();
    const listener = vi.fn();
    const stop = api.subscribeDeviceActivity(listener);
    visible(false);
    visible(false);
    visible(true);
    expect(listener.mock.calls.map(([value]) => value)).toEqual([true, false, true]);
    expect(api.isDeviceActive()).toBe(true);
    stop();
    visible(false);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(mocks.addListener).not.toHaveBeenCalled();
    await api.setDeviceKeepAwake(true);
    expect(mocks.bridge.setKeepAwake).not.toHaveBeenCalled();
  });

  it("shares native listeners and stays inactive until both native and DOM are active", async () => {
    mocks.native = true;
    const api = await lifecycle();
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = api.subscribeDeviceActivity(first);
    const stopSecond = api.subscribeDeviceActivity(second);
    await Promise.resolve();
    nativeEvent("pause");
    nativeEvent("appStateChange", false);
    visible(false);
    nativeEvent("resume");
    expect(api.isDeviceActive()).toBe(false);
    visible(true);
    expect(first.mock.calls.map(([value]) => value)).toEqual([true, false, true]);
    expect(second.mock.calls.map(([value]) => value)).toEqual([true, false, true]);
    expect(mocks.addListener).toHaveBeenCalledTimes(3);
    const handles = await Promise.all(mocks.addListener.mock.results.map(({ value }) => value));
    stopFirst();
    expect(handles[0].remove).not.toHaveBeenCalled();
    stopSecond();
    handles.forEach((handle) => expect(handle.remove).toHaveBeenCalledOnce());
  });

  it("does not let a delayed initial getState undo a newer pause", async () => {
    mocks.native = true;
    let resolveState!: (state: { isActive: boolean }) => void;
    mocks.getState.mockImplementation(
      () => new Promise<{ isActive: boolean }>((resolve) => (resolveState = resolve)),
    );
    const api = await lifecycle();
    const listener = vi.fn();
    const stop = api.subscribeDeviceActivity(listener);
    nativeEvent("pause");
    resolveState({ isActive: true });
    await Promise.resolve();
    expect(api.isDeviceActive()).toBe(false);
    expect(listener.mock.calls.map(([value]) => value)).toEqual([true, false]);
    stop();
  });

  it("notifies subscribers when the native initial state is inactive", async () => {
    mocks.native = true;
    mocks.getState.mockResolvedValue({ isActive: false });
    const api = await lifecycle();
    const listener = vi.fn();
    const stop = api.subscribeDeviceActivity(listener);
    await Promise.resolve();
    expect(listener.mock.calls.map(([value]) => value)).toEqual([true, false]);
    stop();
  });

  it("removes native listener handles that arrive after unsubscription", async () => {
    mocks.native = true;
    const remove = vi.fn().mockResolvedValue(undefined);
    const pending: Array<(value: { remove: typeof remove }) => void> = [];
    mocks.addListener.mockImplementation(
      () => new Promise<{ remove: typeof remove }>((resolve) => pending.push(resolve)),
    );
    const api = await lifecycle();
    const listener = vi.fn();
    const stop = api.subscribeDeviceActivity(listener);
    stop();
    pending.forEach((resolve) => resolve({ remove }));
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("serializes keep-awake calls and never enables it after a background transition", async () => {
    mocks.native = true;
    let release!: () => void;
    mocks.bridge.setKeepAwake.mockImplementationOnce(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    const api = await lifecycle();
    const stop = api.subscribeDeviceActivity(vi.fn());
    const first = api.setDeviceKeepAwake(true);
    await Promise.resolve();
    const second = api.setDeviceKeepAwake(true);
    nativeEvent("pause");
    const third = api.setDeviceKeepAwake(false);
    expect(mocks.bridge.setKeepAwake).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second, third]);
    expect(mocks.bridge.setKeepAwake.mock.calls.map(([value]) => value.enabled)).toEqual([
      true,
      false,
      false,
    ]);
    stop();
  });

  it("returns native failures to callers and allows later device operations", async () => {
    mocks.native = true;
    mocks.bridge.setKeepAwake.mockRejectedValueOnce(new Error("native failure"));
    const api = await lifecycle();
    await expect(api.setDeviceKeepAwake(true)).rejects.toThrow("native failure");
    await api.setDeviceKeepAwake(false);
    expect(mocks.bridge.setKeepAwake).toHaveBeenLastCalledWith({ enabled: false });
  });
});
