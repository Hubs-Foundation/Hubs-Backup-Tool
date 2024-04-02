import { useContext, createContext, ReactNode, useState, useCallback } from "react";
import { IAuthCredentials } from "../../common/types";

type Props = {
  children?: ReactNode;
};

export type UpdateCredentialsF = (newState: IAuthCredentials) => void;

type IAuthContext = {
  credentials: IAuthCredentials;
  updateCredentials: UpdateCredentialsF;
};

const AuthContext = createContext<IAuthContext>({
  credentials: null,
  updateCredentials: null
});

const AuthProvider = ({ children }: Props) => {
  const [credentials, setCredentials] = useState(JSON.parse(localStorage.getItem("credentials")));

  const updateCredentials = useCallback((newState: IAuthCredentials) => {
    setCredentials(newState);
    localStorage.setItem("credentials", JSON.stringify(newState));
  }, [setCredentials]);

  return (
    <AuthContext.Provider value={{ credentials, updateCredentials }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };

export const useAuth = () => {
  return useContext(AuthContext);
};
