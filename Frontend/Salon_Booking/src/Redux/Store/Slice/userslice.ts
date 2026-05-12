import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthentication: false,
  id: "",
  name: "",
  email: "",
  role: null,
  token: "",
  phoneNumber: "",
  salonId: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.isAuthentication = true;
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.token = action.payload.token;
      state.phoneNumber = action.payload.phoneNumber || "";
      state.salonId = action.payload.salonId || null;
    },
    resetUserData: (state) => {
      state.isAuthentication = false;
      state.id = "";
      state.name = "";
      state.email = "";
      state.role = null;
      state.token = "";
      state.phoneNumber = "";
      state.salonId = null;
    },
  },
});

export const { setUserData, resetUserData } = userSlice.actions;
export default userSlice.reducer;