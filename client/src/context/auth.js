import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

// Super admins can change anything. Admins get view access plus Excel import/export.
export function useCanEdit() {
  return useContext(AuthContext)?.role === 'super_admin';
}

export const VIEW_ONLY_TITLE = 'View-only access';
