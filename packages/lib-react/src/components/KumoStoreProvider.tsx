import { KumoStore } from "@kumo/lib-base";
import React, { createContext, useEffect, useState } from "react";

export const KumoStoreContext = createContext<KumoStore | undefined>(undefined);

type KumoStoreProviderProps = {
  store: KumoStore;
  loader?: React.ReactNode;
};

export const KumoStoreProvider: React.FC<KumoStoreProviderProps> = ({
  store,
  loader,
  children
}) => {
  const [loadedStore, setLoadedStore] = useState<KumoStore>();

  useEffect(() => {
    store.onLoaded = () => setLoadedStore(store);
    const stop = store.start();

    return () => {
      store.onLoaded = undefined;
      setLoadedStore(undefined);
      stop();
    };
  }, [store]);

  if (!loadedStore) {
    return <>{loader}</>;
  }

  return <KumoStoreContext.Provider value={loadedStore}>{children}</KumoStoreContext.Provider>;
};
