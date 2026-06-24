import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_type: "Administrator" | "Student" | "Instructor" | "Librarian" | "Accounting" | "Superadmin";
  profile_picture?: string | null;
  is_impersonating?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedSession = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const checkSession = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/session/`, {
        withCredentials: true,
      });
      if (response.data.authenticated) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasCheckedSession.current) {
      hasCheckedSession.current = true;
      checkSession();
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    (window as any).__isLoggingOut = true;
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/logout/`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      queryClient.clear();
      navigate("/");
      (window as any).__isLoggingOut = false;
    }
  };

  const stopImpersonating = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/stop-impersonating/`,
        {},
        { withCredentials: true }
      );
      if (response.data.user) {
        setUser(response.data.user);
        queryClient.clear();
        if (response.data.user.user_type === "Superadmin") {
          navigate("/AdminManageUsers");
        } else {
          navigate("/"); // Redirect to dashboard of the original user
        }
      }
    } catch (error) {
      console.error("Stop impersonating failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkSession, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
