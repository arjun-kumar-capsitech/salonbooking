import { createSlice } from "@reduxjs/toolkit";

interface AuthState {
  isAuth: boolean;
  user: any;
  token: string | null;
}

const initialState: AuthState = {
  isAuth: false,
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLogin: (state, action) => {
      state.isAuth = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    setLogout: (state) => {
      state.isAuth = false;
      state.user = null;
      state.token = null;
    },
  },
});

export const { setLogin, setLogout } = authSlice.actions;
export default authSlice.reducer;