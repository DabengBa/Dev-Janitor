import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

type AvailableUpdate = NonNullable<Awaited<ReturnType<typeof check>>>;

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'installing'
  | 'restarting'
  | 'unsupported'
  | 'error';

export interface DownloadProgress {
  downloaded: number;
  total?: number;
  percent?: number;
}

export interface AutoUpdaterState {
  currentVersion: string;
  isTauri: boolean;
  pendingUpdate: AvailableUpdate | null;
  promptOpen: boolean;
  status: UpdateStatus;
  progress: DownloadProgress | null;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  requestInstall: () => void;
  confirmInstall: () => Promise<void>;
  cancelInstall: () => void;
}

const AutoUpdaterContext = createContext<AutoUpdaterState | null>(null);

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function releaseUpdate(update: AvailableUpdate | null) {
  if (!update) {
    return;
  }

  void update.close().catch((closeError) => {
    console.warn('Unable to release the updater resource:', closeError);
  });
}

export function useAutoUpdater(): AutoUpdaterState {
  const isTauri = isTauriRuntime();
  const mountedRef = useRef(true);
  const hasCheckedRef = useRef(false);
  const checkInProgressRef = useRef<Promise<void> | null>(null);
  const installInProgressRef = useRef(false);
  const updateRef = useRef<AvailableUpdate | null>(null);
  const [currentVersion, setCurrentVersion] = useState(__APP_VERSION__);
  const [pendingUpdate, setPendingUpdate] = useState<AvailableUpdate | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>(isTauri ? 'idle' : 'unsupported');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!installInProgressRef.current) {
        const update = updateRef.current;
        updateRef.current = null;
        releaseUpdate(update);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    void getVersion()
      .then((version) => {
        if (mountedRef.current && version) {
          setCurrentVersion(version);
        }
      })
      .catch((versionError) => {
        console.warn('Unable to read the packaged app version:', versionError);
      });
  }, [isTauri]);

  const checkForUpdates = useCallback((): Promise<void> => {
    if (checkInProgressRef.current) {
      return checkInProgressRef.current;
    }

    if (!isTauriRuntime()) {
      if (mountedRef.current) {
        setStatus('unsupported');
        setError(null);
      }
      return Promise.resolve();
    }

    if (installInProgressRef.current) {
      return Promise.resolve();
    }

    setStatus('checking');
    setError(null);
    setProgress(null);

    const checkPromise = (async () => {
      try {
        const update = await check({ timeout: 30_000 });
        if (!mountedRef.current) {
          releaseUpdate(update);
          return;
        }

        if (!update) {
          const previousUpdate = updateRef.current;
          updateRef.current = null;
          setPendingUpdate(null);
          setPromptOpen(false);
          setStatus('up-to-date');
          releaseUpdate(previousUpdate);
          return;
        }

        const previousUpdate = updateRef.current;
        updateRef.current = update;
        setPendingUpdate(update);
        setPromptOpen(true);
        setStatus('available');
        if (previousUpdate && previousUpdate !== update) {
          releaseUpdate(previousUpdate);
        }
      } catch (checkError) {
        if (!mountedRef.current) {
          return;
        }

        console.error('Auto updater check failed:', checkError);
        setStatus('error');
        setError(errorMessage(checkError));
      } finally {
        checkInProgressRef.current = null;
      }
    })();

    checkInProgressRef.current = checkPromise;
    return checkPromise;
  }, []);

  useEffect(() => {
    if (hasCheckedRef.current || import.meta.env.DEV || !isTauri) {
      return;
    }

    hasCheckedRef.current = true;
    void checkForUpdates();
  }, [checkForUpdates, isTauri]);

  const cancelInstall = useCallback(() => {
    if (installInProgressRef.current) {
      return;
    }

    setPromptOpen(false);
  }, []);

  const requestInstall = useCallback(() => {
    if (updateRef.current) {
      setPromptOpen(true);
      return;
    }

    void checkForUpdates();
  }, [checkForUpdates]);

  const confirmInstall = useCallback(async () => {
    const update = updateRef.current;
    if (!update || installInProgressRef.current) {
      return;
    }

    installInProgressRef.current = true;
    setStatus('downloading');
    setError(null);
    setProgress({ downloaded: 0 });

    try {
      let downloaded = 0;
      let total: number | undefined;
      const onDownloadEvent = (event: DownloadEvent) => {
        if (!mountedRef.current) {
          return;
        }

        if (event.event === 'Started') {
          total = event.data.contentLength;
          setProgress({ downloaded: 0, total, percent: total ? 0 : undefined });
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          setProgress({
            downloaded,
            total,
            percent: total ? Math.min(100, Math.round((downloaded / total) * 100)) : undefined,
          });
        } else {
          setProgress({ downloaded, total, percent: 100 });
          setStatus('installing');
        }
      };

      await update.downloadAndInstall(onDownloadEvent, { timeout: 10 * 60_000 });
      if (!mountedRef.current) {
        return;
      }

      setStatus('restarting');
      updateRef.current = null;
      setPendingUpdate(null);
      releaseUpdate(update);
      await relaunch();
    } catch (installError) {
      if (!mountedRef.current) {
        return;
      }

      console.error('Auto updater install failed:', installError);
      updateRef.current = null;
      setPendingUpdate(null);
      setStatus('error');
      setError(errorMessage(installError));
      setPromptOpen(false);
      releaseUpdate(update);
    } finally {
      installInProgressRef.current = false;
    }
  }, []);

  return {
    currentVersion,
    isTauri,
    pendingUpdate,
    promptOpen,
    status,
    progress,
    error,
    checkForUpdates,
    requestInstall,
    confirmInstall,
    cancelInstall,
  };
}

export function AutoUpdaterProvider({ children }: PropsWithChildren) {
  const updater = useAutoUpdater();

  return createElement(AutoUpdaterContext.Provider, { value: updater }, children);
}

export function useUpdater() {
  const updater = useContext(AutoUpdaterContext);
  if (!updater) {
    throw new Error('useUpdater must be used inside AutoUpdaterProvider');
  }

  return updater;
}
