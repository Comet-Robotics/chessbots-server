import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";
import { useEffect, useState } from "react";
import { post } from "../api";

export const ProtectedRoute = () => {
    const [checkStatus, SetCheckStatus] = useState(true);
    const [authenticationSuccessful, SetAuthenticationSuccessful] = useState(true);
    const { user } = useAuth();

    // ding dong ditch!
    useEffect(() => {
        const serverSideCheck = async() => {            
            const serverResponse = await post("/check-admin", {
                "username": user ?? ""
            });

            SetCheckStatus(false);
            SetAuthenticationSuccessful(serverResponse["success"]);
        }
        serverSideCheck()
    }, []);


    if(checkStatus)
    {
        return <p>Checking...</p>
    }
    else
    {
        if(authenticationSuccessful)
        {
            // If authenticated, render the child routes
            return <Outlet />;
        }
        else
        {
            // If not authenticated, redirect to the login page
            return <Navigate to="/login" />;
        }
    }
};
