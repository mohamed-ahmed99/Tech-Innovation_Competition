import React, { createContext, useContext, useState, useCallback } from 'react';

// 1. Create the Context
const GlobalContext = createContext();

// 2. Create the Provider Component
export const GlobalProvider = ({ children }) => {
  const [store, setStore] = useState({});

  /**
   * Updates the global state.
   * @param {string} key - The key to update.
   * @param {any} value - The new value (can be a function like setState).
   */
  const setGlobalData = useCallback((key, value) => {
    setStore((prev) => ({
      ...prev,
      [key]: typeof value === 'function' ? value(prev[key]) : value,
    }));
  }, []);

  return (
    <GlobalContext.Provider value={{ store, setGlobalData }}>
      {children}
    </GlobalContext.Provider>
  );
};

// 3. Create the custom hook
export const useGlobalData = (key) => {
  const context = useContext(GlobalContext);
  
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalProvider');
  }

  const { store, setGlobalData } = context;

  // If a key is passed, return [value, setter] for that key
  if (key) {
    const value = store[key];
    const setter = (newValue) => setGlobalData(key, newValue);
    return [value, setter];
  }

  // If no key is passed, return [fullStore, setGlobalDataFunction]
  return [store, setGlobalData];
};
