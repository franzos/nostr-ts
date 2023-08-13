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

await useNClient.getState().init();

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
