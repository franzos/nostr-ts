import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import ReactDOM from "react-dom/client";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import { useNClient } from "./state/client.ts";
import { AccountRoute } from "./routes/account.tsx";
import { PrimaryLayout } from "./layouts/primary.tsx";
import { WelcomeRoute } from "./routes/welcome.js";
import { FollowingRoute } from "./routes/following.tsx";
import { SubscriptionsRoute } from "./routes/subscriptions.tsx";
import { UserProfileRoute } from "./routes/profile.tsx";
import { MAX_EVENTS } from "./defaults.ts";
import { RelaysRoute } from "./routes/relays.tsx";
import { PublishingQueueRoute } from "./routes/queue.tsx";
import "./index.css";

const init = async () => {
  await useNClient.getState().init({
    maxEvents: MAX_EVENTS,
  });
};

init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider>
      <BrowserRouter basename={import.meta.env.VITE_CLIENT_WEB_BASE_URL}>
        <Routes>
          <Route element={<PrimaryLayout />}>
            <Route path="/" element={<WelcomeRoute />} />
            <Route path="/account" element={<AccountRoute />} />
            <Route path="/following" element={<FollowingRoute />} />
            <Route path="/subscriptions" element={<SubscriptionsRoute />} />
            <Route path="/relays" element={<RelaysRoute />} />
            <Route path="/queue" element={<PublishingQueueRoute />} />
            <Route path="/p/:relayid/:pubkey" element={<UserProfileRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
