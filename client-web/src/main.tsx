import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import ReactDOM from "react-dom/client";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import { useNClient } from "./state/client.ts";
import { AccountRoute } from "./routes/account.tsx";
import { PrimaryLayout } from "./layouts/primary.tsx";
import { WelcomeRoute } from "./routes/welcome.tsx";
import { FollowingRoute } from "./routes/following.tsx";
import { SubscriptionsRoute } from "./routes/subscriptions.tsx";
import { MAX_EVENTS } from "./defaults.ts";
import "./index.css";

await useNClient.getState().init({
  maxEvents: MAX_EVENTS,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider>
      {/* <App /> */}
      <BrowserRouter>
        <Routes>
          <Route element={<PrimaryLayout />}>
            <Route path="/" element={<WelcomeRoute />} />
            <Route path="/account" element={<AccountRoute />} />
            <Route path="/following" element={<FollowingRoute />} />
            <Route path="/subscriptions" element={<SubscriptionsRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
