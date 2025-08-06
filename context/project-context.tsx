'use client';

import { createContext, useContext } from 'react';

// Define the shape of the data you want to share
type ProjectContextType = {
  workspaceId: string;
  projectId: string;
};

// Create the context with a default value
export const ProjectContext = createContext<ProjectContextType | null>(null);

// Create a custom hook for easier access to the context
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}