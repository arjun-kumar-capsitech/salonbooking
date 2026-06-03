import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  isAuth: boolean;
  user: any;
  token: string | null;
}

const initialState: AuthState = {
  isAuth: localStorage.getItem("authToken") ? true : false,
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("authToken") || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLogin: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.isAuth = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      
      localStorage.setItem("authToken", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("userRole", action.payload.user.role?.toString());
    },
    setLogout: (state) => {
      state.isAuth = false;
      state.user = null;
      state.token = null;
      
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      localStorage.removeItem("lastVisitedPath");
      localStorage.removeItem("redirectAfterLogin");
    },
  },
});

export const { setLogin, setLogout } = authSlice.actions;
export default authSlice.reducer;