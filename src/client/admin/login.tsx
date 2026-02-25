import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useEffect } from "react";

const Login = () => {
    const auth = useAuth();
    const navigate = useNavigate();

    const handleLogin = () => {
        auth.login({ name: "admin" });
        console.log("login");
        navigate("/home", { replace: true });
    };

    useEffect(() => {
        setTimeout(() => {
            handleLogin();
        }, 2 * 1000);
    });

    return <>Login Page</>;
};

export default Login;
