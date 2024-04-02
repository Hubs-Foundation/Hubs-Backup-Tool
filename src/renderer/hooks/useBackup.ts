import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IBackupParams, IBackupProgressUpdateT } from "../../common/types";

type ProgressCallbackFunction = (props: IBackupProgressUpdateT) => void;
type StartBackupF = (props: IBackupParams) => () => void;
type CancelBackupF = () => void;

export function useBackup(
  onBackupProgress: ProgressCallbackFunction
): [string, boolean, boolean, boolean, StartBackupF, CancelBackupF] {
  const [log, setLog] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const onBackupProgressCallbackRef = useRef(onBackupProgress);

  const onBackupProgressCallback = useCallback(
    (props: IBackupProgressUpdateT) => {
      if (onBackupProgressCallbackRef.current) {
        onBackupProgressCallbackRef.current(props);
      }
    },
    [onBackupProgressCallbackRef]
  );

  useEffect(() => {
    window.hubs.onBackupProgressUpdate(onBackupProgressCallback);

    return () => {
      window.hubs.offBackupProgress(onBackupProgressCallback);
    };
  }, [onBackupProgressCallback]);

  useLayoutEffect(() => {
    onBackupProgressCallbackRef.current = onBackupProgress;
  });

  const startBackup = useCallback(
    (props: IBackupParams) => {
      const { types, directory, credentials, override } = props;
      (async () => {
        try {
          setCancelled(false);
          setResult(false);
          setRunning(true);
          setLog("Backing up your Hubs files...");
          const result = await window.hubs.startBackup({
            types,
            directory,
            credentials,
            override,
          });
          setResult(result);
          if (cancelled) {
            setLog("Backup cancelled");
          } else if (result) {
            setLog("Backup finished successfully");
          } else {
            setLog("The backup finished with errors, please check the log");
          }
        } catch (e: unknown) {
          setLog("Error happened while running the backup. Try again.");
          setResult(false);
        }
        setRunning(false);
      })();

      return () => {
        setCancelled(false);
        setRunning(false);
        setResult(false);
      };
    },
    [setLog, setRunning, setResult, cancelled, setCancelled]
  );

  const cancelBackup = useCallback(() => {
    setCancelled(true);
    setLog("Cancelling...");
    window.hubs.cancelBackup();
  }, [setCancelled, setLog]);

  return [log, running, result, cancelled, startBackup, cancelBackup];
}
