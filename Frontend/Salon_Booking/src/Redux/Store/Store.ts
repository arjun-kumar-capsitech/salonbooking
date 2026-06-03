import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './Slice/authSlice';
import userReducer from './Slice/userslice';
import userContentReducer from './Slice/userContentSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  userContent: userContentReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Selectors
export const authData = (state: RootState) => state.auth;
export const userData = (state: RootState) => state.user;
export const userContentData = (state: RootState) => state.userContent;