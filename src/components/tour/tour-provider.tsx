'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { TourProvider as ReactourProvider, useTour as useReactour, type StepType } from '@reactour/tour';
// Importăm definițiile pașilor
import { adminSteps } from './admin-steps';
import { getMayorSteps } from './mayor-steps';
import { farmerSteps } from './farmer-steps';
// Importăm useSession pentru a obține datele utilizatorului curent
import { useSession } from 'next-auth/react';

interface TourContextType {
  startTour: (role: 'admin' | 'mayor' | 'farmer') => void;
  isOpen: boolean;
  stopTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface CustomTourProviderProps {
  children: ReactNode;
}

export default function CustomTourProvider({ children }: CustomTourProviderProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(async (role: 'admin' | 'mayor' | 'farmer') => {
    console.log(`Tour disabled temporarily for deployment. Role: ${role}`);
    // Tour functionality disabled for deployment
  }, []);

  const stopTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextValue: TourContextType = {
    startTour,
    isOpen,
    stopTour,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
    </TourContext.Provider>
  );
}

// Hook-ul customizat pentru a accesa funcția noastră startTour și starea isOpen
export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a CustomTourProvider');
  }
  return context;
};