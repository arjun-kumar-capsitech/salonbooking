import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./Redux/Store/Store";
import App from "./App";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient(); 

createRoot(document.getElementById("root")!).render(
<QueryClientProvider client={queryClient}>
  <Provider store={store}>
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  </Provider>
  </QueryClientProvider>
);