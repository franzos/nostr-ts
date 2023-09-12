import React from "react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import ReactDOM from "react-dom/client";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import { useNClient } from "./state/client.ts";
import { AccountRoute } from "./routes/account.tsx";
import { PrimaryLayout } from "./layouts/primary.tsx";
import { WelcomeRoute } from "./routes/welcome.js";
import { FollowingUsersRoute } from "./routes/following.tsx";
import { ProfileRoute } from "./routes/profile.tsx";
import { MAX_EVENTS } from "./defaults.ts";
import { UserProfileRoute } from "./routes/user-profile.tsx";
import { BlockedUsersRoute } from "./routes/blocked.tsx";
import { ListsRoute } from "./routes/lists.tsx";
import { EventRoute } from "./routes/event.tsx";
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
            <Route path="/following" element={<FollowingUsersRoute />} />
            <Route path="/blocked" element={<BlockedUsersRoute />} />
            <Route path="/lists" element={<ListsRoute />} />
            <Route path="/p/:npub" element={<ProfileRoute />} />
            <Route path="/e/:note" element={<EventRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
