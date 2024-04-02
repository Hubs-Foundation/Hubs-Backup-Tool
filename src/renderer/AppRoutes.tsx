import { Navigate, Route, Routes } from "react-router-dom"
import Login from "./pages/Login";
import { useContext } from "react";
import { AuthContext } from "./components/AuthProvider";
import Home from "./pages/Home";
import Backup from "./pages/Backup";
import Layout from "./components/Layout"

const PrivateRoutes = () => {
    const { credentials } = useContext(AuthContext);
    if (!credentials) {
        return <Navigate to="/login" replace />
    } else {
        return <Navigate to="/backup" replace />
    }
}

const AppRoutes = () => {
    return (
        <Layout>
            <Routes>

                <Route path="/backup" element={<Backup />} />
                <Route path="/login" element={<Login />} />
                <Route element={<PrivateRoutes />}>
                    <Route path="/" element={<Home />} />
                </Route>

            </Routes>
        </Layout>
    )
}

export default AppRoutes;