import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = () => {
        login({ name: "admin" });
        navigate("/", { replace: true });
    };

    setTimeout(() => {
        handleLogin();
    }, 3 * 1000);

    return <>Login Page</>;
};

export default Login;
