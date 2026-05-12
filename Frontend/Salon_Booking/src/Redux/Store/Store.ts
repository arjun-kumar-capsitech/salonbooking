import { configureStore } from '@reduxjs/toolkit';
import authReducer from './Slice/authSlice';
import columnsReducer from './Slice/columnsSlice';
import userContentReducer from './Slice/userContentSlice';
import userReducer from './Slice/userslice'; 

export const store = configureStore({
  reducer: {
    auth: authReducer,
    columns: columnsReducer,
    userContent: userContentReducer,
    user: userReducer, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;