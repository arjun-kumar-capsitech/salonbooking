import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Login/Register";
import Allrouts from "./Layout/Allroutes";
import LiveBooking from "./Pages/LiveBooking";
import { getDashboardPath } from "./config/Route";
import type { RootState } from "./Redux/Store/Store";

function App() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isLoggedIn = Boolean(user && isAuthenticated);
  const role = user?.role == null ? undefined : Number(user.role);

  return (
    <Routes>
      <Route path="/signup" element={<Register />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to={getDashboardPath(role)} replace /> : <Login />} />
      <Route path="/" element={isLoggedIn ? <Navigate to={getDashboardPath(role)} replace /> : <Navigate to="/login" replace />} />
      <Route path="/live-booking" element={<LiveBooking />} />
      <Route path="/*" element={<Allrouts />} />
    </Routes>
  );
}

export default App;