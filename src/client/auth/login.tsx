import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useState } from "react";
import { post } from "../api";

const Login = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState("")

    const handleLogin = async(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        //sent password to server, return if successful or not
        const result = await post("/login-admin", {
            "password": password
        })

        console.log(result);

        if(result["success"])
        {
            // if not successful, alert failed, otherwise do that auth login and navigate to home
            auth.login(result["username"]);
            
            navigate("/home", { replace: true });
        }
        else
        {
            alert("INVALID PASSWORD, YOU SUCK");
        }
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