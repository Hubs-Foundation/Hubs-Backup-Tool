import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { AuthContext } from "../components/AuthProvider";

export interface TTokenDto {
  iss?: string;
  sub?: string;
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
}

type AuthProps = { email: string; host: string; port: string };
type StartAuthCallbackFunction = (props: AuthProps) => void;
type CancelAuthCallbackFunction = () => void;

export function useAuthentication(
  onAuthenticated: () => void
): [boolean, boolean, StartAuthCallbackFunction, CancelAuthCallbackFunction] {
  const socket = useRef(null);
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(false);
  const { updateCredentials } = useContext(AuthContext);
  const onAuthenticatedCallbackRef = useRef(onAuthenticated);

  useLayoutEffect(() => {
    onAuthenticatedCallbackRef.current = onAuthenticated;
  });

  const startAuth = useCallback(
    (props: AuthProps) => {
      const { email, host, port } = props;
      (async () => {
        setResult(false);
        setRunning(true);
        try {
          const { token, accountId } = await window.hubs.authReticulum({
            host,
            port,
            email,
          });
          setResult(true);
          setToken(token);
          setAccountId(accountId);
          updateCredentials({
            email,
            host,
            port,
            token,
            accountId,
          });
          onAuthenticatedCallbackRef.current();
        } catch (e: unknown) {
          setResult(false);
          setToken(null);
          setAccountId(null);
          updateCredentials(null);
        }
        setRunning(false);
      })();

      return () => {
        socket.current.disconnect();
        socket.current = null;
        setRunning(false);
        setResult(false);
      };
    },
    [setAccountId, setRunning, setResult, setToken, updateCredentials]
  );

  const cancelAuth = useCallback(() => {
    if (socket.current) {
      socket.current.disconnect();
    }
    updateCredentials(null);
    setRunning(false);
  }, [socket, setRunning, updateCredentials]);

  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [socket]);

  return [running, result, startAuth, cancelAuth];
}
