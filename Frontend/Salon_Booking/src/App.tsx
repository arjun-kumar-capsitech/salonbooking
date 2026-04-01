import { Routes, Route } from "react-router-dom";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Login/Register";
import Allrouts from "./Layout/Allroutes";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />}/>
      <Route path="/signup" element={<Register />} />
      <Route path="/*" element={ <Allrouts />} />
    </Routes>
  );
}

export default App;