import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

export interface SchoolYear {
  school_year_id: number;
  school_year: string;
}

interface SchoolYearContextType {
  selectedSchoolYear: string;
  setSelectedSchoolYear: (sy: string) => void;
  schoolYears: SchoolYear[];
  latestSchoolYear: string;
  isLoading: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(undefined);

export const SchoolYearProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYearState] = useState<string>("");
  const [latestSchoolYear, setLatestSchoolYear] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      setSchoolYears([]);
      setSelectedSchoolYearState("");
      setLatestSchoolYear("");
      return;
    }

    const fetchSchoolYears = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/get/course-school-years/`,
          { withCredentials: true }
        );
        const data = res.data as SchoolYear[];
        
        // Sort school years by ID descending so the latest is first
        const sorted = [...data].sort((a, b) => b.school_year_id - a.school_year_id);
        
        if (sorted.length > 0) {
          const latest = sorted[0].school_year;
          setLatestSchoolYear(latest);
          setSchoolYears(sorted); // Set the sorted list so the latest is first in dropdowns
          
          // Load saved selection from localStorage if valid
          const saved = localStorage.getItem("selectedSchoolYear");
          if (saved && (saved === "All" || data.some(sy => sy.school_year === saved))) {
            setSelectedSchoolYearState(saved);
          } else {
            setSelectedSchoolYearState(latest);
            localStorage.setItem("selectedSchoolYear", latest);
          }
        }
      } catch (error) {
        console.error("Failed to fetch school years:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolYears();
  }, [user, authLoading]);

  const setSelectedSchoolYear = (sy: string) => {
    setSelectedSchoolYearState(sy);
    localStorage.setItem("selectedSchoolYear", sy);
  };

  return (
    <SchoolYearContext.Provider
      value={{
        selectedSchoolYear,
        setSelectedSchoolYear,
        schoolYears,
        latestSchoolYear,
        isLoading,
      }}
    >
      {children}
    </SchoolYearContext.Provider>
  );
};

export const useSchoolYear = () => {
  const context = useContext(SchoolYearContext);
  if (context === undefined) {
    throw new Error("useSchoolYear must be used within a SchoolYearProvider");
  }
  return context;
};

