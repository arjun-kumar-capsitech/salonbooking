// Redux/Store/Slice/authSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  joinedDate: string;
  role: string | number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLogin: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      
      // ✅ Also store in localStorage
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("jwt_token", action.payload.token);
    },
    setLogout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      
      // ✅ Clear storage
      localStorage.removeItem("user");
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    }
  }
});

export const { setLogin, setLogout, updateUser } = authSlice.actions;
export default authSlice.reducer;