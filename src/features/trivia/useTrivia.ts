import { useEffect, useState, useSyncExternalStore } from "react";

import type { TriviaQuestion } from "@/data/triviaSchema";
import {
  createTriviaSession,
  prepareTriviaQuiz,
  startTriviaQuiz,
  type TriviaQuiz,
  type TriviaSession,
  triviaSessionSchema,
  type TriviaSettings,
} from "@/domain/trivia/game";
import { loadTriviaCatalogue } from "@/services/contentPacks/store";
import { requireContentPreferences } from "@/services/contentPreference";
import {
  isDeviceActive,
  setDeviceKeepAwake,
  subscribeDeviceActivity,
} from "@/services/deviceLifecycle";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const key = "trivia.device.v3";

/** One ordered owner: transforms always see the last acknowledged checkpoint. */
class TriviaController {
  private session: TriviaSession | null = null;
  private catalogue: TriviaQuestion[] = [];
  private packVersion = 1;
  private ready = false;
  private error: string | null = null;
  private warning: string | null = null;
  private resumePending = false;
  private blocked = false;
  private active = isDeviceActive();
  private mounted = false;
  private epoch = 0;
  private operations = 0;
  private awake = false;
  private hydration: Promise<void> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private pending: { session: TriviaSession; uncover: boolean; epoch: number } | null = null;
  private listeners = new Set<() => void>();
  private view = this.makeView();

  private makeView() {
    return {
      session: this.session,
      catalogue: this.catalogue,
      packVersion: this.packVersion,
      busy: this.operations > 0,
      error: this.error,
      warning: this.warning,
      ready: this.ready,
      resumePending: this.resumePending,
    };
  }

  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.view = this.makeView();
    this.listeners.forEach((listener) => listener());
    const awake = Boolean(
      this.mounted &&
      this.active &&
      this.ready &&
      !this.blocked &&
      !this.resumePending &&
      this.session?.quiz &&
      this.session.quiz.phase !== "results",
    );
    if (awake !== this.awake) {
      this.awake = awake;
      void setDeviceKeepAwake(awake).catch(() => undefined);
    }
  }

  private fail(error: unknown) {
    this.blocked = true;
    this.error = error instanceof Error ? error.message : "Trivia could not be saved. Retry.";
    this.emit();
  }

  private enqueue(operation: () => Promise<void>, retry = false): Promise<void> {
    this.operations++;
    this.emit();
    const result = this.queue.then(async () => {
      if (this.blocked && !retry) throw new Error(this.error ?? "Retry before continuing.");
      try {
        await operation();
      } catch (error) {
        this.fail(error);
        throw error;
      }
    });
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result.finally(() => {
      this.operations--;
      this.emit();
    });
  }

  private hydrate = (): Promise<void> => {
    if (this.hydration) return this.hydration;
    this.hydration = (async () => {
      const [saved, content] = await Promise.all([
        readSnapshot(key, triviaSessionSchema),
        loadTriviaCatalogue(),
      ]);
      this.session = saved.value ?? createTriviaSession();
      if (saved.value && !saved.value.quiz) await removeSnapshot(key);
      this.catalogue = content.pack.questions;
      this.packVersion = content.pack.version;
      this.warning = content.warning;
      this.ready = true;
      this.resumePending = this.session.quiz !== null;
      this.error = null;
      this.blocked = false;
      this.emit();
    })();
    return this.hydration;
  };

  mount = () => {
    this.mounted = true;
    this.active = isDeviceActive();
    void this.enqueue(this.hydrate).catch(() => undefined);
    const unsubscribe = subscribeDeviceActivity((active) => {
      this.active = active;
      if (!active) {
        this.epoch++;
        if (this.session?.quiz) this.resumePending = true;
      }
      this.emit();
    });
    return () => {
      unsubscribe();
      this.mounted = false;
      this.epoch++;
      if (this.session?.quiz) this.resumePending = true;
      this.emit();
    };
  };

  private current(): TriviaSession {
    if (!this.ready || !this.session) throw new Error("Load Trivia before continuing.");
    return this.session;
  }

  private async commit(next: TriviaSession, uncover = false) {
    this.pending = {
      session: triviaSessionSchema.parse({ ...next, savedAt: new Date().toISOString() }),
      uncover,
      epoch: this.epoch,
    };
    await this.commitPending();
  }

  private async commitPending() {
    const pending = this.pending;
    if (!pending) return;
    if (pending.session.quiz) await writeSnapshot(key, pending.session);
    else await removeSnapshot(key);
    this.session = pending.session;
    this.pending = null;
    if (!this.session.quiz) this.resumePending = false;
    else if (pending.uncover)
      this.resumePending = !this.active || !this.mounted || pending.epoch !== this.epoch;
    this.blocked = false;
    this.error = null;
    this.emit();
  }

  saveSettings = (settings: TriviaSettings): Promise<void> => {
    const captured = structuredClone(settings);
    return this.enqueue(async () => {
      const session = this.current();
      if (session.quiz) throw new Error("Finish or reset this quiz before changing settings.");
      this.session = triviaSessionSchema.parse({ ...session, settings: captured });
      this.emit();
    });
  };

  start = (settings: TriviaSettings): Promise<void> => {
    const captured = structuredClone(settings);
    return this.enqueue(async () => {
      const session = this.current();
      const epoch = this.epoch;
      const [preferences, content] = await Promise.all([
        requireContentPreferences(),
        loadTriviaCatalogue(),
      ]);
      if (!this.active || !this.mounted || epoch !== this.epoch)
        throw new Error("Return to Trivia and start the quiz again.");
      this.catalogue = content.pack.questions;
      this.packVersion = content.pack.version;
      this.warning = content.warning;
      const quiz = startTriviaQuiz(captured, this.catalogue, {
        kidsMode: preferences.kidsMode,
        packVersion: this.packVersion,
      });
      await this.commit({ ...session, settings: quiz.settings, quiz }, true);
    });
  };

  changeQuiz = (transform: (quiz: TriviaQuiz) => TriviaQuiz): Promise<void> =>
    this.enqueue(async () => {
      const session = this.current();
      if (!session.quiz) throw new Error("There is no quiz to update.");
      await this.commit({ ...session, quiz: transform(structuredClone(session.quiz)) });
    });

  resume = (): Promise<void> =>
    this.enqueue(async () => {
      const session = this.current();
      if (!this.active) throw new Error("Return to Trivia before resuming.");
      await this.commit(
        { ...session, quiz: session.quiz ? prepareTriviaQuiz(session.quiz) : null },
        true,
      );
    });

  reset = (): Promise<void> =>
    this.enqueue(async () => this.commit({ ...this.current(), quiz: null }));

  retry = (): Promise<void> =>
    this.enqueue(async () => {
      if (!this.ready) {
        this.hydration = null;
        await this.hydrate();
      } else if (this.pending) {
        await this.commitPending();
      } else {
        this.blocked = false;
        this.error = null;
        this.emit();
      }
    }, true);
}

export function useTrivia() {
  const [controller] = useState(() => new TriviaController());
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => controller.mount(), [controller]);
  return {
    ...view,
    saveSettings: controller.saveSettings,
    start: controller.start,
    changeQuiz: controller.changeQuiz,
    resume: controller.resume,
    reset: controller.reset,
    retry: controller.retry,
  };
}
