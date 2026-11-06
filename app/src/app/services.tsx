// Composition root for the demo: wires the in-memory adapters into the app.
// Screens use only `useServices()` and the four ports, never the adapters,
// so the real AT Protocol adapters can replace these without touching them.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MemoryNetwork, cannedQuestioner, createMemoryDiscovery, createMemoryNotesStore, createMemoryRecordStore,
  mapStorage, type KeyValueStorage,
} from "../adapters/memory";
import type { AppError, Result } from "../domain/result";
import type { Did, Profile } from "../domain/types";
import type { Discovery, NotesStore, Questioner, RecordStore } from "../ports";

export interface Services {
  me: Profile;
  users: Profile[];
  switchUser(did: Did): void;
  store: RecordStore;
  discovery: Discovery;
  notes: NotesStore;
  questioner: Questioner;
  /** Small private preferences (review progress, feature toggles). */
  prefs: KeyValueStorage;
  /** Changes whenever any record changes, so screens reload. */
  version: number;
  /** Optional AI follow-up questions. Off by default. */
  aiFollowUps: boolean;
  setAiFollowUps(on: boolean): void;
  now(): Date;
}

const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error("useServices must be used inside a services provider");
  return s;
}

export function DemoServicesProvider({ network, initialUser, storage, children }: {
  network: MemoryNetwork;
  initialUser: Did;
  /** window.localStorage in the browser; in-memory by default (tests). */
  storage?: KeyValueStorage;
  children: ReactNode;
}) {
  const [did, setDid] = useState(initialUser);
  const [version, setVersion] = useState(0);
  const [aiFollowUps, setAiFollowUps] = useState(false);
  const prefs = useMemo(() => storage ?? mapStorage(), [storage]);

  useEffect(() => network.subscribe(() => setVersion((v) => v + 1)), [network]);

  const services = useMemo<Services>(() => {
    const users = network.users();
    return {
      me: users.find((u) => u.did === did) ?? { did, handle: did, displayName: did },
      users,
      switchUser: setDid,
      store: createMemoryRecordStore(network, did),
      discovery: createMemoryDiscovery(network),
      notes: createMemoryNotesStore(prefs, `learnchain.notes.${did}`),
      questioner: cannedQuestioner,
      prefs,
      version,
      aiFollowUps,
      setAiFollowUps,
      now: network.now,
    };
  }, [network, did, prefs, version, aiFollowUps]);

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export interface Loaded<T> {
  data?: T;
  error?: AppError;
  loading: boolean;
}

/** Loads data through a port; reloads when `deps` change or any record changes. */
export function useData<T>(load: () => Promise<Result<T>>, deps: unknown[]): Loaded<T> {
  const { version } = useServices();
  const [state, setState] = useState<Loaded<T>>({ loading: true });
  useEffect(() => {
    let live = true;
    load().then((r) => {
      if (live) setState(r.ok ? { data: r.value, loading: false } : { error: r.error, loading: false });
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  return state;
}
