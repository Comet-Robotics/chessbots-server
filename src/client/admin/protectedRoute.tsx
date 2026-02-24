import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";

export const ProtectedRoute = () => {
    const { user } = useAuth();

    // Check if the user is authenticated
    if (!user) {
        // If not authenticated, redirect to the login page
        return <Navigate to="/" />;
    }

    // If authenticated, render the child routes
    return <Outlet />;
};
