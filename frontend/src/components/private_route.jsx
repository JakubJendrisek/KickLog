import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const readToken = () => {
    try {
      return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
    } catch {
      return "";
    }
  };

  const decodeJwtPayload = (token) => {
    const parts = (token || "").split(".");
    if (parts.length < 2) return null;
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  const isJwtExpired = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") return false; // if no exp, treat as not expired
    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds >= payload.exp;
  };

  const token = readToken();
  const isAuthenticated = Boolean(token) && !isJwtExpired(token);

  if (token && !isAuthenticated) {
    // token exists but is expired/invalid
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
    } catch {
      // ignore
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>
}

export default PrivateRoute;