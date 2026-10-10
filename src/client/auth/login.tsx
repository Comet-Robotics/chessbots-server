import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useState } from "react";

const Login = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState("")

    const handleLogin = async() => {
        //sent password to server, return if successful or not

        // if not successful, alert failed, otherwise do that auth login and navigate to home
        auth.login({ name: "admin" });
        navigate("/home", { replace: true });
    };

    return (
        <div>
            <h2>Put Your Password Here!</h2>
            <form onSubmit={handleLogin}>
                <input
                    type = "password"
                    value={password}
                    onChange={(e) => {setPassword(e.target.value)}}
                    placeholder="Password Here"
                    required
                />
            </form>
        </div>
    );
};

export default Login;