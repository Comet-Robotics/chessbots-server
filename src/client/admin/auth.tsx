import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "./useLocalStorage";

type LoginType = {
    name: string;
};
interface ProviderProps {
    user: string | null;
    login(data: LoginType): void;
    logout(): void;
}

const AuthContext = createContext<ProviderProps>({
    user: null,
    login: () => {},
    logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useLocalStorage("user", null);
    const navigate = useNavigate();

    // call this function when you want to authenticate the user
    const login = async (data) => {
        setUser(data);
    };

    // call this function to sign out logged in user
    const logout = () => {
        setUser(null);
        navigate("/", { replace: true });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;

export const useAuth = () => {
    return useContext(AuthContext);
};
