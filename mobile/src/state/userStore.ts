import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseService from "../services/firebase";

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password?: string; // For demo - in production this would be hashed server-side
  appleUserId?: string; // Apple Sign In user identifier
  pushToken?: string; // Expo push notification token
  bio?: string;
  location?: string;
  profilePhoto?: string;
  joinDate: string;
  introSeen: boolean;
  profileSetupComplete: boolean;
  isPrivate: boolean; // Private profile requires friend request acceptance
  showLocation: boolean; // Whether to display location on profile
  theme: "light" | "dark";
  customCategories: string[];
  preferredCurrency: string; // ISO 4217 currency code
  lastSeenActivityTimestamp?: string;
  deletedCommentIds?: string[]; // IDs of comments the user has deleted (for comments on others' memories)
  notificationSettings: {
    pushEnabled: boolean;
    onThisDay: boolean;
    oneWeekToGo: boolean;
    joinAnniversary: boolean;
    weeklyReminder: boolean;
    friendRequests: boolean;
    memoriesLiked: boolean;
    tagged: boolean;
  };
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  registeredUsers: User[]; // Store all registered users for demo
  setUser: (user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setIntroSeen: () => void;
  setProfileSetupComplete: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setPreferredCurrency: (currency: string) => void;
  updateNotificationSettings: (settings: Partial<User["notificationSettings"]>) => void;
  markActivityAsSeen: () => void;
  deleteCustomCategory: (category: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  addDeletedCommentId: (commentId: string) => Promise<void>;
  registerUser: (user: User) => void;
  findUserByEmail: (email: string) => User | undefined;
  findUserByAppleId: (appleUserId: string) => User | undefined;
  findUserByUsername: (username: string) => User | undefined;
  authenticateUser: (email: string, password: string) => User | null;
  logout: () => void;
  deleteAccount: () => void;
  cleanupGhostAccounts: () => Promise<number>;
}

const defaultNotificationSettings: User["notificationSettings"] = {
  pushEnabled: true,
  onThisDay: true,
  oneWeekToGo: true,
  joinAnniversary: true,
  weeklyReminder: true,
  friendRequests: true,
  memoriesLiked: true,
  tagged: true,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      registeredUsers: [],
      setUser: async (user) => {
        // Clear friend and memory stores when setting a new user to prevent data leakage
        const currentUser = get().user;
        if (!currentUser || currentUser.id !== user.id) {
          try {
            await AsyncStorage.multiRemove([
              'friend-storage',
              'memory-storage',
              'notification-storage'
            ]);
            console.log('✅ Cleared previous user data from AsyncStorage on new login');

            // CRITICAL: Also reset in-memory Zustand state for these stores
            // Import dynamically to avoid circular dependencies
            const { useFriendStore } = await import('./friendStore');
            const { useMemoryStore } = await import('./memoryStore');
            const { useNotificationStore } = await import('./notificationStore');

            // Reset friend store in-memory state
            useFriendStore.setState({
              friends: [],
              friendships: [],
              friendRequests: [],
              blockedUsers: [],
              isLoading: false
            });

            // Reset memory store in-memory state
            useMemoryStore.setState({
              memories: []
            });

            // Reset notification store in-memory state
            useNotificationStore.setState({
              notifications: []
            });

            console.log('✅ Reset in-memory Zustand stores for new user');
          } catch (error) {
            console.error('❌ Failed to clear previous user data:', error);
          }
        }
        set({ user, isAuthenticated: true });
      },
      updateUser: async (updates): Promise<void> => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          // If profilePhoto has changed and it's a local URI, upload to Firebase Storage
          if (updates.profilePhoto && updates.profilePhoto.startsWith('file://')) {
            console.log('📸 Uploading profile photo to Firebase Storage...');
            const photoPath = `users/${currentUser.id}/profile-photo-${Date.now()}.jpg`;
            const downloadURL = await FirebaseService.uploadImage(updates.profilePhoto, photoPath);
            updates.profilePhoto = downloadURL;
            console.log('✅ Profile photo uploaded:', downloadURL);
          }

          // Update Firestore with new data
          await FirebaseService.updateUserDocument(currentUser.id, updates);
          console.log('✅ User data updated in Firestore');

          // Update local state
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });

          // Update in registered users list
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u =>
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        } catch (error) {
          console.error('❌ Failed to update user:', error);
          throw error;
        }
      },
      setIntroSeen: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, introSeen: true };
          set({ user: updatedUser });
          // Update in registered users list
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      setProfileSetupComplete: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, profileSetupComplete: true };
          set({ user: updatedUser });
          // Update in registered users list
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      setTheme: (theme) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, theme };
          set({ user: updatedUser });
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      setPreferredCurrency: (currency) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, preferredCurrency: currency };
          set({ user: updatedUser });
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      updateNotificationSettings: (settings) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            notificationSettings: { ...currentUser.notificationSettings, ...settings },
          };
          set({ user: updatedUser });
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
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
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      deleteCustomCategory: (category) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedCategories = currentUser.customCategories.filter(
            (cat) => cat !== category
          );
          const updatedUser = {
            ...currentUser,
            customCategories: updatedCategories,
          };
          set({ user: updatedUser });
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u => 
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      renameCategory: (oldName, newName) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedCategories = currentUser.customCategories.map((cat) =>
            cat === oldName ? newName : cat
          );
          const updatedUser = {
            ...currentUser,
            customCategories: updatedCategories,
          };
          set({ user: updatedUser });
          set((state) => ({
            registeredUsers: state.registeredUsers.map(u =>
              u.id === currentUser.id ? updatedUser : u
            )
          }));
        }
      },
      addDeletedCommentId: async (commentId) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const deletedCommentIds = currentUser.deletedCommentIds || [];
        if (deletedCommentIds.includes(commentId)) return;

        const updatedDeletedIds = [...deletedCommentIds, commentId];
        const updatedUser = {
          ...currentUser,
          deletedCommentIds: updatedDeletedIds,
        };

        set({ user: updatedUser });
        set((state) => ({
          registeredUsers: state.registeredUsers.map(u =>
            u.id === currentUser.id ? updatedUser : u
          )
        }));

        // Sync to Firebase
        try {
          await FirebaseService.updateUserDocument(currentUser.id, {
            deletedCommentIds: updatedDeletedIds,
          });
        } catch (error) {
          console.error('Failed to sync deleted comment ID to Firebase:', error);
        }
      },
      registerUser: (user) => {
        set((state) => ({
          registeredUsers: [...state.registeredUsers, user]
        }));
      },
      findUserByEmail: (email) => {
        return get().registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      },
      findUserByAppleId: (appleUserId) => {
        return get().registeredUsers.find(u => u.appleUserId === appleUserId);
      },
      findUserByUsername: (username) => {
        return get().registeredUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      },
      authenticateUser: (email, password) => {
        const user = get().findUserByEmail(email);
        if (user && user.password === password) {
          return user;
        }
        return null;
      },
      logout: async () => {
        // Clear all persisted data on logout
        try {
          await AsyncStorage.multiRemove([
            'user-storage',
            'friend-storage',
            'memory-storage',
            'notification-storage',
            'subscription-storage'
          ]);
          console.log('✅ Cleared all persisted data on logout');
        } catch (error) {
          console.error('❌ Failed to clear persisted data:', error);
        }
        set({ user: null, isAuthenticated: false });
      },
      deleteAccount: async () => {
        const currentUser = get().user;
        if (currentUser) {
          // Clear all persisted data when deleting account
          try {
            await AsyncStorage.multiRemove([
              'user-storage',
              'friend-storage',
              'memory-storage',
              'notification-storage',
              'subscription-storage'
            ]);
            console.log('✅ Cleared all persisted data on account deletion');
          } catch (error) {
            console.error('❌ Failed to clear persisted data:', error);
          }
          set((state) => ({
            user: null,
            isAuthenticated: false,
            registeredUsers: state.registeredUsers.filter(u => u.id !== currentUser.id)
          }));
        }
      },
      cleanupGhostAccounts: async () => {
        const registeredUsers = get().registeredUsers;
        const currentUser = get().user;
        let removedCount = 0;

        console.log('🧹 Starting ghost account cleanup...');
        console.log(`📊 Checking ${registeredUsers.length} local accounts against Firebase`);

        const validUserIds: string[] = [];

        // Check each local user against Firebase
        for (const localUser of registeredUsers) {
          // Always keep the current user
          if (currentUser && localUser.id === currentUser.id) {
            validUserIds.push(localUser.id);
            continue;
          }

          try {
            const firebaseUser = await FirebaseService.getUserDocument(localUser.id);
            if (firebaseUser) {
              validUserIds.push(localUser.id);
            } else {
              console.log(`👻 Ghost account found: ${localUser.displayName} (${localUser.id})`);
              removedCount++;
            }
          } catch (error) {
            console.error(`❌ Error checking user ${localUser.id}:`, error);
            // Keep the user if we can't verify (network error, etc.)
            validUserIds.push(localUser.id);
          }
        }

        // Update the registered users list to only include valid users
        set((state) => ({
          registeredUsers: state.registeredUsers.filter(u => validUserIds.includes(u.id))
        }));

        console.log(`✅ Ghost account cleanup complete. Removed ${removedCount} accounts.`);
        return removedCount;
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
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
  isPrivate: false, // Default to public profile
  showLocation: true, // Default to showing location
  theme: "light",
  customCategories: [],
  preferredCurrency: "GBP",
  notificationSettings: defaultNotificationSettings,
});