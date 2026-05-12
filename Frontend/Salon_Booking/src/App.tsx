import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// import { setLogin } from "./Redux/Store/authSlice";

import Login from "./Pages/Login/Login";
import Register from "./Pages/Login/Register";
import Allrouts from "./Layout/Allroutes";
import ProtectedRoute from "./ProtectedRoute";
import { setLogin } from "./Redux/Store/Slice/authSlice";

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: any) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");

    if (token && user) {
      dispatch(
        setLogin({
          token,
          user: JSON.parse(user),
        })
      );
    }
  }, []);

  const getDashboardPath = () => {
    switch (user?.role) {
      case 1:
        return "/super-admin/deshboard";
      case 2:
        return "/admin/dashboard";
      case 3:
        return "/employee/deshbord";
      case 4:
        return "/customer/booking";
      default:
        return "/";
    }
  };

  return (
    <>
      <Routes>
        <Route path="/signup" element={<Register />} />

        <Route
          path="/"
          element={
            token ? <Navigate to={getDashboardPath()} replace /> : <Login />
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Allrouts />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;