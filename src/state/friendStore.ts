import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUserStore } from "./userStore";

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface Friend {
  id: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
  isPublic: boolean;
  bio?: string;
  location?: string;
  joinDate: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
}

interface FriendState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  blockedUsers: string[];
  addFriend: (friend: Friend) => void;
  removeFriend: (friendId: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  sendFriendRequest: (fromUserId: string, toUserId: string) => void;
  respondToFriendRequest: (requestId: string, status: "accepted" | "declined") => void;
  getFriendRequests: (userId: string, type: "sent" | "received") => FriendRequest[];
  searchUsers: (query: string, currentUserId?: string) => Friend[];
  getUserById: (userId: string) => Friend | undefined;
  getFriendById: (friendId: string) => Friend | undefined;
}

// Mock users for demonstration
export const mockUsers: Friend[] = [
  {
    id: "user-1",
    username: "alice_music",
    displayName: "Alice Johnson",
    profilePhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b3f4?w=150&h=150&fit=crop&crop=face",
    isPublic: true,
    bio: "Music lover and concert enthusiast 🎵",
    location: "London",
    joinDate: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "user-2",
    username: "bob_sports",
    displayName: "Bob Williams",
    profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    isPublic: true,
    bio: "Sports fanatic ⚽ Always at the games!",
    location: "Manchester",
    joinDate: "2024-02-20T00:00:00.000Z",
  },
  {
    id: "user-3",
    username: "charlie_travel",
    displayName: "Charlie Brown",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    isPublic: true,
    bio: "Travel addict ✈️ Collecting memories worldwide",
    location: "Edinburgh",
    joinDate: "2024-03-10T00:00:00.000Z",
  },
  {
    id: "user-4",
    username: "diana_food",
    displayName: "Diana Martinez",
    profilePhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    isPublic: true,
    bio: "Foodie explorer 🍴 Always finding new tastes",
    location: "Birmingham",
    joinDate: "2024-04-05T00:00:00.000Z",
  },
];

export const useFriendStore = create<FriendState>()(
  persist(
    (set, get) => ({
      friends: [],
      friendRequests: [],
      blockedUsers: [],

      addFriend: (friend) => {
        set((state) => ({
          friends: [...state.friends, friend],
        }));
      },

      removeFriend: (friendId) => {
        set((state) => ({
          friends: state.friends.filter((friend) => friend.id !== friendId),
        }));
      },

      blockUser: (userId) => {
        set((state) => ({
          blockedUsers: [...state.blockedUsers, userId],
          friends: state.friends.filter((friend) => friend.id !== userId),
        }));
      },

      unblockUser: (userId) => {
        set((state) => ({
          blockedUsers: state.blockedUsers.filter((id) => id !== userId),
        }));
      },

      isUserBlocked: (userId) => {
        return get().blockedUsers.includes(userId);
      },

      sendFriendRequest: (fromUserId, toUserId) => {
        // Prevent users from adding themselves as friends
        if (fromUserId === toUserId) {
          return;
        }

        const existingRequest = get().friendRequests.find(
          (req) => req.fromUserId === fromUserId && req.toUserId === toUserId && req.status === "pending",
        );

        if (existingRequest) return;

        const newRequest: FriendRequest = {
          id: `request-${Date.now()}`,
          fromUserId,
          toUserId,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          friendRequests: [...state.friendRequests, newRequest],
        }));
      },

      respondToFriendRequest: (requestId, status) => {
        const request = get().friendRequests.find((req) => req.id === requestId);
        if (!request) return;

        set((state) => ({
          friendRequests: state.friendRequests.map((req) =>
            req.id === requestId ? { ...req, status, updatedAt: new Date().toISOString() } : req,
          ),
        }));

        if (status === "accepted") {
          // Get user from registered users or mock users
          const registeredUsers = useUserStore.getState().registeredUsers;
          const registeredUser = registeredUsers.find((u) => u.id === request.fromUserId);

          if (registeredUser && registeredUser.profileSetupComplete) {
            // Add registered user as friend
            get().addFriend({
              id: registeredUser.id,
              username: registeredUser.username,
              displayName: registeredUser.displayName,
              profilePhoto: registeredUser.profilePhoto,
              isPublic: true,
              bio: registeredUser.bio,
              location: registeredUser.location,
              joinDate: registeredUser.joinDate,
            });
          } else {
            // Fallback to mock users
            const friend = mockUsers.find((user) => user.id === request.fromUserId);
            if (friend) {
              get().addFriend(friend);
            }
          }
        }
      },

      getFriendRequests: (userId, type) => {
        const requests = get().friendRequests;
        return type === "sent"
          ? requests.filter((req) => req.fromUserId === userId)
          : requests.filter((req) => req.toUserId === userId);
      },

      searchUsers: (query, currentUserId) => {
        if (!query.trim()) return [];

        const lowerQuery = query.toLowerCase();
        const registeredUsers = useUserStore.getState().registeredUsers;
        const blockedUsers = get().blockedUsers;

        // Search through registered users first (only those with completed profiles)
        const searchableRegisteredUsers: Friend[] = registeredUsers
          .filter((u) => u.profileSetupComplete && u.id !== currentUserId && !blockedUsers.includes(u.id))
          .map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            profilePhoto: u.profilePhoto,
            isPublic: true,
            bio: u.bio,
            location: u.location,
            joinDate: u.joinDate,
          }));

        const matchingRegistered = searchableRegisteredUsers.filter(
          (user) =>
            user.displayName.toLowerCase().includes(lowerQuery) || user.username.toLowerCase().includes(lowerQuery),
        );

        // Also include mock users for demo purposes
        const matchingMock = mockUsers.filter((user) => {
          // Exclude current user and blocked users from search results
          if (currentUserId && user.id === currentUserId) return false;
          if (blockedUsers.includes(user.id)) return false;

          return (
            user.displayName.toLowerCase().includes(lowerQuery) || user.username.toLowerCase().includes(lowerQuery)
          );
        });

        // Combine and deduplicate by ID
        const combined = [...matchingRegistered, ...matchingMock];
        const unique = combined.filter((user, index, self) => index === self.findIndex((u) => u.id === user.id));

        return unique;
      },

      getUserById: (userId) => {
        // Check registered users first
        const registeredUsers = useUserStore.getState().registeredUsers;
        const registeredUser = registeredUsers.find((u) => u.id === userId && u.profileSetupComplete);

        if (registeredUser) {
          return {
            id: registeredUser.id,
            username: registeredUser.username,
            displayName: registeredUser.displayName,
            profilePhoto: registeredUser.profilePhoto,
            isPublic: true,
            bio: registeredUser.bio,
            location: registeredUser.location,
            joinDate: registeredUser.joinDate,
          };
        }

        // Fallback to mock users
        return mockUsers.find((user) => user.id === userId);
      },

      getFriendById: (friendId) => {
        const friends = get().friends;
        const found = friends.find((friend) => friend.id === friendId);
        // If not found in friends list, check getUserById (which checks registered users and mockUsers)
        return found || get().getUserById(friendId);
      },
    }),
    {
      name: "friend-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
