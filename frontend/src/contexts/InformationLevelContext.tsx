/**
 * InformationLevelContext - Manages information level state for painter's easel
 * Feature: 004-create-a-tagging
 * Task: T026
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InformationLevel, DEFAULT_INFORMATION_LEVELS } from '../../shared/types/InformationLevel';
import { informationLevelService } from '../services/informationLevelService';

interface InformationLevelContextType {
  levels: InformationLevel[];
  loading: boolean;
  error: string | null;
  selectedLevelId: string;
  setSelectedLevelId: (levelId: string) => void;
  loadLevels: (campaignId: string) => Promise<void>;
  createLevel: (name: string, color: string, hierarchical: boolean, campaignId: string) => Promise<InformationLevel>;
  updateLevel: (levelId: string, name?: string, color?: string, hierarchical?: boolean) => Promise<InformationLevel>;
  deleteLevel: (levelId: string) => Promise<{ reverted_cards_count: number; warning: string }>;
  getDefaultLevels: () => InformationLevel[];
  getCustomLevels: () => InformationLevel[];
}

const InformationLevelContext = createContext<InformationLevelContextType | undefined>(undefined);

export function InformationLevelProvider({ children }: { children: ReactNode }) {
  const [levels, setLevels] = useState<InformationLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string>(DEFAULT_INFORMATION_LEVELS.SYSTEM);

  const loadLevels = async (campaignId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await informationLevelService.listInformationLevels(campaignId);
      setLevels(response.levels);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load information levels');
      console.error('Load information levels error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createLevel = async (
    name: string,
    color: string,
    hierarchical: boolean,
    campaignId: string
  ): Promise<InformationLevel> => {
    setError(null);
    try {
      const newLevel = await informationLevelService.createInformationLevel({
        name,
        color,
        hierarchical,
        campaignId,
      });

      // Add to state
      setLevels(prev => [...prev, newLevel]);

      return newLevel;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create information level';
      setError(errorMessage);
      console.error('Create information level error:', err);
      throw new Error(errorMessage);
    }
  };

  const updateLevel = async (
    levelId: string,
    name?: string,
    color?: string,
    hierarchical?: boolean
  ): Promise<InformationLevel> => {
    setError(null);
    try {
      const updatedLevel = await informationLevelService.updateInformationLevel(levelId, {
        name,
        color,
        hierarchical,
      });

      // Update in state
      setLevels(prev => prev.map(level => (level.id === levelId ? updatedLevel : level)));

      return updatedLevel;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update information level';
      setError(errorMessage);
      console.error('Update information level error:', err);
      throw new Error(errorMessage);
    }
  };

  const deleteLevel = async (
    levelId: string
  ): Promise<{ reverted_cards_count: number; warning: string }> => {
    setError(null);
    try {
      const result = await informationLevelService.deleteInformationLevel(levelId);

      // Remove from state
      setLevels(prev => prev.filter(level => level.id !== levelId));

      // Reset selected level if it was deleted
      if (selectedLevelId === levelId) {
        setSelectedLevelId(DEFAULT_INFORMATION_LEVELS.SYSTEM);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete information level';
      setError(errorMessage);
      console.error('Delete information level error:', err);
      throw new Error(errorMessage);
    }
  };

  const getDefaultLevels = (): InformationLevel[] => {
    return levels.filter(level => level.type === 'default');
  };

  const getCustomLevels = (): InformationLevel[] => {
    return levels.filter(level => level.type === 'custom');
  };

  return (
    <InformationLevelContext.Provider
      value={{
        levels,
        loading,
        error,
        selectedLevelId,
        setSelectedLevelId,
        loadLevels,
        createLevel,
        updateLevel,
        deleteLevel,
        getDefaultLevels,
        getCustomLevels,
      }}
    >
      {children}
    </InformationLevelContext.Provider>
  );
}

export function useInformationLevel() {
  const context = useContext(InformationLevelContext);
  if (!context) {
    throw new Error('useInformationLevel must be used within InformationLevelProvider');
  }
  return context;
}
