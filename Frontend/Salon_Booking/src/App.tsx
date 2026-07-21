import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect,  } from "react";
import { useDispatch, useSelector } from "react-redux";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Login/Register";
import Allrouts from "./Layout/Allroutes";
import { setLogin } from "./Redux/Store/Slice/authSlice";

function App() {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated } = useSelector((state: any) => state.auth);
  useEffect(() => {
    const loadStoredData = () => {
      const token = localStorage.getItem("token") || 
                    localStorage.getItem("jwt_token") || 
                    localStorage.getItem("authToken");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          dispatch(setLogin({ token, user: parsedUser }));
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("authToken");
        }
      }
    };

    loadStoredData();
  }, [dispatch]);
  

  const getDashboardPath = () => {
    if (!user) return "/";
    
    const roleRoutes: Record<number, string> = {
      1: "/super-admin/dashboard",
      2: "/admin/dashboard",
      3: "/employee/dashboard",
      4: "/customer/booking",
    };
    
    return roleRoutes[user.role] || "/";
  };

  const isLoggedIn = token && user && isAuthenticated;

  return (
    <Routes>
      <Route path="/signup" element={<Register />} />
      <Route
        path="/"
        element={
          isLoggedIn ? <Navigate to={getDashboardPath()} replace /> : <Login />
        }
      />
      <Route path="/*" element={<Allrouts />} />
    </Routes>
  );
}

export default App;