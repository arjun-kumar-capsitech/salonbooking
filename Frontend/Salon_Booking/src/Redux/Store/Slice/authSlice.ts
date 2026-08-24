import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthUser {
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
  role?: string | number | null;
  companyId?: string | null;
  expiresAt?: string;
  salonName?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const storedUser = localStorage.getItem("user");
const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  isLoading: false,
  isAuthenticated: !!storedUser,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLogin: (
      state,
      action: PayloadAction<{
        user: AuthUser;
      }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
      localStorage.setItem(
        "user",
        JSON.stringify(action.payload.user)
      );
    },

    setLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      localStorage.removeItem("lastVisitedPath");
      localStorage.removeItem("redirectAfterLogin");
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setLogin,
  setLogout,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer;