import { configureStore } from '@reduxjs/toolkit';
import authReducer from './Slice/authSlice';
// import userContentReducer from './Slice/userContentSlice';
import userReducer from './Slice/userslice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // userContent: userContentReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const authData = (state: RootState) => state.auth;
export const userData = (state: RootState) => state.user;

export default store;