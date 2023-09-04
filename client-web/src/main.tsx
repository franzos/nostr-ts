import React from "react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import ReactDOM from "react-dom/client";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import { useNClient } from "./state/client.ts";
import { AccountRoute } from "./routes/account.tsx";
import { PrimaryLayout } from "./layouts/primary.tsx";
import { WelcomeRoute } from "./routes/welcome.js";
import { FollowingRoute } from "./routes/following.tsx";
import { SubscriptionsRoute } from "./routes/subscriptions.tsx";
import { ProfileRoute } from "./routes/profile.tsx";
import { MAX_EVENTS } from "./defaults.ts";
import { RelaysRoute } from "./routes/relays.tsx";
import { PublishingQueueRoute } from "./routes/queue.tsx";
import { UserMentionsRoute } from "./routes/mentions.tsx";
import { UserProfileRoute } from "./routes/user-profile.tsx";
import { FollowingFeedRoute } from "./routes/following-feed.tsx";
import "./index.css";
import theme from "./theme.ts";

const init = async () => {
  await useNClient.getState().init({
    maxEvents: MAX_EVENTS,
  });
};

init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <BrowserRouter basename={import.meta.env.VITE_CLIENT_WEB_BASE_URL}>
        <Routes>
          <Route element={<PrimaryLayout />}>
            <Route path="/" element={<WelcomeRoute />} />
            <Route path="/account" element={<AccountRoute />} />
            <Route path="/profile" element={<UserProfileRoute />} />
            <Route path="/following" element={<FollowingRoute />} />
            <Route path="/following-feed" element={<FollowingFeedRoute />} />
            <Route path="/mentions/:pubkey" element={<UserMentionsRoute />} />
            <Route path="/subscriptions" element={<SubscriptionsRoute />} />
            <Route path="/relays" element={<RelaysRoute />} />
            <Route path="/queue" element={<PublishingQueueRoute />} />
            <Route path="/p/:pubkey" element={<ProfileRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
