import { createContext, useContext } from "react";
import { Outlet, useNavigate } from "react-router-dom";
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

export const AuthProvider = () => {
    const [user, setUser] = useLocalStorage("user", null);
    const navigate = useNavigate();

    // call this function when you want to authenticate the user
    const login = async (data) => {
        console.log("login2");
        setUser(data);
    };

    // call this function to sign out logged in user
    const logout = () => {
        setUser(null);
        navigate("/home", { replace: true });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            <Outlet />
        </AuthContext.Provider>
    );
};

export default AuthProvider;

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
