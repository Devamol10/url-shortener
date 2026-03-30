// CampusCart — App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import AddItem from "./pages/AddItem";
import ItemDetails from "./pages/ItemDetails";
import Chat from "./pages/Chat";
import MyListings from "./pages/MyListings";
import MyOffers from "./pages/MyOffers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SetPassword from "./pages/SetPassword";
import CreatePassword from "./pages/CreatePassword";
import AuthCallback from "./authCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import { ChatProvider } from "./context/ChatContext";
import { AuthProvider } from "./context/AuthContext";
import Toast from "./components/Toast";
import AISearchAssistant from "./components/AISearchAssistant";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/create-password" element={<CreatePassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected Marketplace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/category/:categoryName" element={<Home />} />
              <Route path="/add-item" element={<AddItem />} />
              <Route path="/listings/:id" element={<ItemDetails />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/my-offers" element={<MyOffers />} />
            </Route>
          </Routes>
          <Toast />
          <AISearchAssistant />
        </ChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;