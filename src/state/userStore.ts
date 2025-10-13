import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PurchasesService } from "../api/purchases-services";

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password?: string; // For demo - in production this would be hashed server-side
  bio?: string;
  location?: string;
  profilePhoto?: string;
  joinDate: string;
  introSeen: boolean;
  profileSetupComplete: boolean;
  theme: "light" | "dark";
  customCategories: string[];
  preferredCurrency: string; // ISO 4217 currency code
  lastSeenActivityTimestamp?: string;
  notificationSettings: {
    pushEnabled: boolean;
    onThisDay: boolean;
    oneWeekToGo: boolean;
    joinAnniversary: boolean;
    weeklyReminder: boolean;
    friendRequests: boolean;
    newMemories: boolean;
    memoriesLiked: boolean;
    tagged: boolean;
  };
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  ticketCount: number;
  registeredUsers: User[]; // Store all registered users for demo
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setIntroSeen: () => void;
  setProfileSetupComplete: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setPreferredCurrency: (currency: string) => void;
  updateNotificationSettings: (settings: Partial<User["notificationSettings"]>) => void;
  markActivityAsSeen: () => void;
  deleteCustomCategory: (category: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  registerUser: (user: User) => void;
  findUserByEmail: (email: string) => User | undefined;
  authenticateUser: (email: string, password: string) => User | null;
  logout: () => void;
  deleteAccount: () => void;
  updatePremiumStatus: () => Promise<void>;
  incrementTicketCount: () => void;
  canCreateTicket: () => boolean;
}

const defaultNotificationSettings: User["notificationSettings"] = {
  pushEnabled: true,
  onThisDay: true,
  oneWeekToGo: true,
  joinAnniversary: true,
  weeklyReminder: true,
  friendRequests: true,
  newMemories: true,
  memoriesLiked: true,
  tagged: true,
};

export const useUserStore = create<UserState>()(
  persist(
    (set: (arg0: { (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { registeredUsers: any; }; (state: any): { ticketCount: any; }; (state: any): { registeredUsers: any; }; (state: { registeredUsers: any; }): { registeredUsers: any[]; }; (state: any): { user: null; isAuthenticated: boolean; registeredUsers: any; }; user?: any; isAuthenticated?: boolean; isPremium?: boolean; }) => void, get: () => { (): any; new(): any; user?: any; registeredUsers?: any; findUserByEmail?: any; isPremium?: any; ticketCount?: any; }) => ({
      user: null,
      isAuthenticated: false,
      registeredUsers: [],
      setUser: (user: any) => set({ user, isAuthenticated: true }),
      updateUser: (updates: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
          // Update in registered users list
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      setIntroSeen: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, introSeen: true };
          set({ user: updatedUser });
          // Update in registered users list
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      setProfileSetupComplete: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, profileSetupComplete: true };
          set({ user: updatedUser });
          // Update in registered users list
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      setTheme: (theme: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, theme };
          set({ user: updatedUser });
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      setPreferredCurrency: (currency: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, preferredCurrency: currency };
          set({ user: updatedUser });
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      updateNotificationSettings: (settings: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            notificationSettings: { ...currentUser.notificationSettings, ...settings },
          };
          set({ user: updatedUser });
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      markActivityAsSeen: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            lastSeenActivityTimestamp: new Date().toISOString(),
          };
          set({ user: updatedUser });
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      deleteCustomCategory: (category: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedCategories = currentUser.customCategories.filter((cat: any) => cat !== category);
          const updatedUser = {
            ...currentUser,
            customCategories: updatedCategories,
          };
          set({ user: updatedUser });
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },

      // Add to store implementation
      updatePremiumStatus: async () => {
        const isPremium = await PurchasesService.isPremiumUser();
        set({ isPremium });
      },

      incrementTicketCount: () => {
        set((state: { ticketCount: number; }) => ({ ticketCount: state.ticketCount + 1 }));
      },

      canCreateTicket: () => {
        const { isPremium, ticketCount } = get();
        return isPremium || ticketCount < 3;
      },

      renameCategory: (oldName: any, newName: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedCategories = currentUser.customCategories.map((cat: any) => (cat === oldName ? newName : cat));
          const updatedUser = {
            ...currentUser,
            customCategories: updatedCategories,
          };
          set({ user: updatedUser });
          set((state: { registeredUsers: any[]; }) => ({
            registeredUsers: state.registeredUsers.map((u: { id: any; }) => (u.id === currentUser.id ? updatedUser : u)),
          }));
        }
      },
      registerUser: (user: any) => {
        set((state: { registeredUsers: any }) => ({
          registeredUsers: [...state.registeredUsers, user],
        }));
      },
      findUserByEmail: (email: string) => {
        return get().registeredUsers.find((u: { email: string; }) => u.email.toLowerCase() === email.toLowerCase());
      },
      authenticateUser: (email: any, password: any) => {
        const user = get().findUserByEmail(email);
        if (user && user.password === password) {
          return user;
        }
        return null;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      deleteAccount: () => {
        const currentUser = get().user;
        if (currentUser) {
          set((state: { registeredUsers: any[]; }) => ({
            user: null,
            isAuthenticated: false,
            registeredUsers: state.registeredUsers.filter((u: { id: any; }) => u.id !== currentUser.id),
          }));
        }
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Mock function to create a new user (for demo purposes)
export const createMockUser = (): User => ({
  id: `user-${Date.now()}`,
  username: "",
  displayName: "",
  email: "",
  password: "",
  bio: "",
  location: "",
  profilePhoto: undefined,
  joinDate: new Date().toISOString(),
  introSeen: false,
  profileSetupComplete: false,
  theme: "light",
  customCategories: [],
  preferredCurrency: "GBP",
  notificationSettings: defaultNotificationSettings,
});
