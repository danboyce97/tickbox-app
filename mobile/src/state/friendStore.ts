import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUserStore } from "./userStore";
import { useNotificationStore } from "./notificationStore";
import { Linking } from "react-native";
import * as FirebaseService from "../services/firebase";

export type FriendRequestStatus = "pending" | "accepted" | "declined";

// Hidden/test accounts that should not appear in search results or anywhere in the app
// These accounts have been deleted from Firestore but we filter by username as a safety net
export const HIDDEN_USERNAMES = [
  "test",
  "test1",
  "test3",
  "test4",
  "test5",
  "test7",
  "livetest",
  "dan_boyce",
  "danboyce",
  "damger",
  "ali_baba",
  "apple_review",
  "manoj",
];

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

// Track bidirectional friendships
export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
}

interface FriendState {
  friends: Friend[];
  friendships: Friendship[];
  friendRequests: FriendRequest[];
  blockedUsers: string[];
  isLoading: boolean;
  searchResults: Friend[];
  isSearching: boolean;

  // Local state management
  setFriends: (friends: Friend[]) => void;
  setFriendships: (friendships: Friendship[]) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  setLoading: (loading: boolean) => void;

  // Firestore-backed actions
  loadUserFriends: (userId: string) => Promise<void>;
  addFriend: (friend: Friend, userId: string, friendId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  sendFriendRequest: (fromUserId: string, toUserId: string) => Promise<void>;
  respondToFriendRequest: (requestId: string, status: "accepted" | "declined") => Promise<void>;
  getFriendRequests: (userId: string, type: "sent" | "received") => FriendRequest[];
  searchUsers: (query: string, currentUserId?: string) => Promise<Friend[]>;
  clearSearchResults: () => void;
  getUserById: (userId: string) => Promise<Friend | undefined>;
  getFriendById: (friendId: string) => Friend | undefined;
  areFriends: (userId1: string, userId2: string) => boolean;

  // Real-time subscriptions
  subscribeToFriendships: (userId: string) => () => void;
  subscribeToFriendRequests: (userId: string) => () => void;
}

// Mock users for demonstration (fallback for non-Firestore users)
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
      friendships: [],
      friendRequests: [],
      blockedUsers: [],
      isLoading: false,
      searchResults: [],
      isSearching: false,

      setFriends: (friends) => set({ friends }),
      setFriendships: (friendships) => set({ friendships }),
      setFriendRequests: (requests) => set({ friendRequests: requests }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Load user's friends from Firestore
      loadUserFriends: async (userId) => {
        try {
          set({ isLoading: true });

          // Get friendships from Firestore
          const friendships = await FirebaseService.getUserFriendships(userId);
          set({ friendships });

          // Get friend IDs
          const friendIds = friendships.map((f) =>
            f.user1Id === userId ? f.user2Id : f.user1Id
          );

          // Load friend user data
          const friendsData: Friend[] = [];
          for (const friendId of friendIds) {
            const userData = await FirebaseService.getUserDocument(friendId);
            if (userData) {
              friendsData.push({
                id: userData.id,
                username: userData.username,
                displayName: userData.displayName,
                profilePhoto: userData.profilePhoto,
                isPublic: !userData.isPrivate,
                bio: userData.bio,
                location: userData.location,
                joinDate: userData.joinDate,
              });
            }
          }

          set({ friends: friendsData, isLoading: false });
        } catch (error) {
          console.error("Error loading friends:", error);
          set({ isLoading: false });
        }
      },

      addFriend: async (friend, userId, friendId) => {
        try {
          // Check if already friends locally first to prevent duplicate local state
          const existingLocalFriend = get().friends.find(f => f.id === friendId);
          if (existingLocalFriend) {
            console.log(`⚠️ Already friends locally: ${userId} <-> ${friendId}`);
            return;
          }

          // Check if already friends in Firestore to prevent duplicates
          const alreadyFriends = await FirebaseService.areFriends(userId, friendId);
          if (alreadyFriends) {
            console.log(`⚠️ Already friends (addFriend check): ${userId} <-> ${friendId}`);
            return;
          }

          // Create friendship in Firestore FIRST before updating local state
          const friendshipId = await FirebaseService.createFriendship(userId, friendId);

          // If friendship already existed (empty string returned), don't update local state
          if (!friendshipId) {
            console.log(`⚠️ Friendship creation returned empty - already exists`);
            return;
          }

          // Only add to local state after successful Firestore creation
          set((state) => {
            // Double-check to prevent race conditions in local state
            if (state.friends.some(f => f.id === friendId)) {
              return state;
            }
            return {
              friends: [...state.friends, friend],
            };
          });

          // Add friendship to local state
          const newFriendship: Friendship = {
            id: friendshipId,
            user1Id: userId,
            user2Id: friendId,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            // Check for duplicate friendships in local state
            const friendshipExists = state.friendships.some(
              f => (f.user1Id === userId && f.user2Id === friendId) ||
                   (f.user1Id === friendId && f.user2Id === userId)
            );
            if (friendshipExists) {
              return state;
            }
            return {
              friendships: [...state.friendships, newFriendship],
            };
          });

          console.log(`✅ Friendship created in Firestore: ${userId} <-> ${friendId}`);
        } catch (error) {
          console.error("Error adding friend:", error);
        }
      },

      removeFriend: async (friendId) => {
        const currentUserId = useUserStore.getState().user?.id;
        if (!currentUserId) return;

        try {
          // Remove from local state immediately
          set((state) => ({
            friends: state.friends.filter(friend => friend.id !== friendId),
            friendships: state.friendships.filter(
              f => !((f.user1Id === currentUserId && f.user2Id === friendId) ||
                    (f.user1Id === friendId && f.user2Id === currentUserId))
            ),
          }));

          // Remove from Firestore
          await FirebaseService.removeFriendship(currentUserId, friendId);

          console.log(`✅ Two-way unfriend: Removed friendship between ${currentUserId} and ${friendId}`);
        } catch (error) {
          console.error("Error removing friend:", error);
          // Reload friends on error
          get().loadUserFriends(currentUserId);
        }
      },

      blockUser: (userId) => {
        const currentUserId = useUserStore.getState().user?.id;

        set((state) => ({
          blockedUsers: [...state.blockedUsers, userId],
          friends: state.friends.filter(friend => friend.id !== userId),
        }));

        // Remove friendship from Firestore
        if (currentUserId) {
          FirebaseService.removeFriendship(currentUserId, userId).catch((error) => {
            console.error("Error removing friendship on block:", error);
          });

          set((state) => ({
            friendships: state.friendships.filter(
              f => !((f.user1Id === currentUserId && f.user2Id === userId) ||
                    (f.user1Id === userId && f.user2Id === currentUserId))
            ),
          }));
        }
      },

      unblockUser: (userId) => {
        set((state) => ({
          blockedUsers: state.blockedUsers.filter(id => id !== userId),
        }));
      },

      isUserBlocked: (userId) => {
        return get().blockedUsers.includes(userId);
      },

      sendFriendRequest: async (fromUserId, toUserId) => {
        console.log('🤝 sendFriendRequest called:', { fromUserId, toUserId });

        // Prevent users from adding themselves as friends
        if (fromUserId === toUserId) {
          console.log('⚠️ Cannot add yourself as friend');
          return;
        }

        try {
          // Check if user is already a friend (local state check)
          const existingFriend = get().friends.find(f => f.id === toUserId);
          if (existingFriend) {
            console.log('⚠️ Already friends (local state):', toUserId);
            return;
          }

          // Check if there's already a pending request from this user
          const existingRequest = get().friendRequests.find(
            req => req.fromUserId === fromUserId && req.toUserId === toUserId && req.status === "pending"
          );
          if (existingRequest) {
            console.log('⚠️ Friend request already pending:', existingRequest.id);
            return;
          }

          // Also check Firestore to prevent race conditions from rapid clicks
          console.log('🔍 Checking Firestore if already friends...');
          const alreadyFriends = await FirebaseService.areFriends(fromUserId, toUserId);
          if (alreadyFriends) {
            console.log(`⚠️ Already friends (Firestore check): ${fromUserId} <-> ${toUserId}`);
            return;
          }

          // Get the target user from Firestore
          console.log('🔍 Getting target user from Firestore:', toUserId);
          const targetUser = await FirebaseService.getUserDocument(toUserId);
          if (!targetUser) {
            console.error("❌ Target user not found in Firestore:", toUserId);
            return;
          }
          console.log('✅ Target user found:', targetUser.displayName, 'isPrivate:', targetUser.isPrivate);

          // If user is public (not private), add them directly as a friend
          if (!targetUser.isPrivate) {
            console.log('👤 User is public, adding directly as friend...');
            const targetFriend: Friend = {
              id: targetUser.id,
              username: targetUser.username,
              displayName: targetUser.displayName,
              profilePhoto: targetUser.profilePhoto,
              isPublic: !targetUser.isPrivate,
              bio: targetUser.bio,
              location: targetUser.location,
              joinDate: targetUser.joinDate,
            };

            // Add friend (this will create Firestore friendship)
            await get().addFriend(targetFriend, fromUserId, toUserId);

            // Notify both users about the new friendship
            console.log(`🔔 About to notify users about new friendship`);
            const fromUser = await FirebaseService.getUserDocument(fromUserId);
            console.log(`🔔 fromUser lookup result:`, fromUser ? `Found: ${fromUser.displayName}` : 'NOT FOUND');
            if (fromUser) {
              console.log(`🔔 Sending notification to target user: ${toUserId}`);
              await useNotificationStore.getState().addNotification({
                userId: toUserId,
                type: "friend_request_accepted",
                title: "New Friend",
                message: `${fromUser.displayName} is now your friend`,
                data: { userId: fromUserId },
                read: false,
              });

              await useNotificationStore.getState().addNotification({
                userId: fromUserId,
                type: "friend_request_accepted",
                title: "New Friend",
                message: `You are now friends with ${targetUser.displayName}`,
                data: { userId: toUserId },
                read: false,
              });
            }
            return;
          }

          // If user is private, send a friend request via Firestore
          await FirebaseService.sendFriendRequest(fromUserId, toUserId);

          // Trigger notification to recipient
          const fromUser = await FirebaseService.getUserDocument(fromUserId);

          if (fromUser) {
            // In-app notification (also sends push notification via Firestore)
            await useNotificationStore.getState().addNotification({
              userId: toUserId,
              type: "friend_request_received",
              title: "New Friend Request",
              message: `${fromUser.displayName} sent you a friend request`,
              data: { fromUserId },
              read: false,
            });
          }

          console.log(`✅ Friend request sent from ${fromUserId} to ${toUserId}`);
        } catch (error) {
          console.error("Error sending friend request:", error);
        }
      },

      respondToFriendRequest: async (requestId, status) => {
        try {
          // Get the request from local state
          const request = get().friendRequests.find(req => req.id === requestId);
          if (!request) return;

          // Update request status in Firestore
          await FirebaseService.updateFriendRequestStatus(requestId, status);

          // Update local state
          set((state) => ({
            friendRequests: state.friendRequests.map(req =>
              req.id === requestId
                ? { ...req, status, updatedAt: new Date().toISOString() }
                : req
            ),
          }));

          if (status === "accepted") {
            // Check if already friends (prevent duplicate on accept)
            const alreadyFriends = await FirebaseService.areFriends(request.toUserId, request.fromUserId);
            if (alreadyFriends) {
              console.log(`⚠️ Already friends when accepting request, skipping friendship creation`);
            } else {
              // Get user from Firestore
              const registeredUser = await FirebaseService.getUserDocument(request.fromUserId);

              if (registeredUser && registeredUser.profileSetupComplete) {
                // Add registered user as friend
                const friend: Friend = {
                  id: registeredUser.id,
                  username: registeredUser.username,
                  displayName: registeredUser.displayName,
                  profilePhoto: registeredUser.profilePhoto,
                  isPublic: !registeredUser.isPrivate,
                  bio: registeredUser.bio,
                  location: registeredUser.location,
                  joinDate: registeredUser.joinDate,
                };

                await get().addFriend(friend, request.toUserId, request.fromUserId);
              }
            }

            // Trigger notification to requester
            const toUserData = await FirebaseService.getUserDocument(request.toUserId);

            if (toUserData) {
              // In-app notification (also sends push notification via Firestore)
              await useNotificationStore.getState().addNotification({
                userId: request.fromUserId,
                type: "friend_request_accepted",
                title: "Friend Request Accepted",
                message: `${toUserData.displayName} accepted your friend request`,
                data: { userId: request.toUserId },
                read: false,
              });
            }
          }

          console.log(`✅ Friend request ${status}: ${requestId}`);
        } catch (error) {
          console.error("Error responding to friend request:", error);
        }
      },

      getFriendRequests: (userId, type) => {
        const requests = get().friendRequests;
        return type === "sent"
          ? requests.filter(req => req.fromUserId === userId)
          : requests.filter(req => req.toUserId === userId);
      },

      searchUsers: async (query, currentUserId) => {
        if (!query.trim()) {
          set({ searchResults: [], isSearching: false });
          return [];
        }

        set({ isSearching: true });

        try {
          const blockedUsers = get().blockedUsers;

          // Search Firestore for users matching the query
          const firestoreUsers = await FirebaseService.searchUsers(query);

          // Filter and map results - also filter out hidden test accounts
          const results: Friend[] = firestoreUsers
            .filter(u =>
              u.profileSetupComplete &&
              u.id !== currentUserId &&
              !blockedUsers.includes(u.id) &&
              !HIDDEN_USERNAMES.includes(u.username.toLowerCase())
            )
            .map(u => ({
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              profilePhoto: u.profilePhoto,
              isPublic: !u.isPrivate,
              bio: u.bio,
              location: u.location,
              joinDate: u.joinDate,
            }));

          set({ searchResults: results, isSearching: false });
          return results;
        } catch (error) {
          console.error('Error searching users:', error);
          set({ searchResults: [], isSearching: false });
          return [];
        }
      },

      clearSearchResults: () => {
        set({ searchResults: [], isSearching: false });
      },

      getUserById: async (userId) => {
        // Try to get from Firestore first
        try {
          const userData = await FirebaseService.getUserDocument(userId);
          if (userData && userData.profileSetupComplete) {
            // Filter out hidden test accounts
            if (HIDDEN_USERNAMES.includes(userData.username.toLowerCase())) {
              return undefined;
            }
            return {
              id: userData.id,
              username: userData.username,
              displayName: userData.displayName,
              profilePhoto: userData.profilePhoto,
              isPublic: !userData.isPrivate,
              bio: userData.bio,
              location: userData.location,
              joinDate: userData.joinDate,
            };
          }
        } catch (error) {
          console.error("Error getting user from Firestore:", error);
        }

        // Fallback to local registered users
        const registeredUsers = useUserStore.getState().registeredUsers;
        const registeredUser = registeredUsers.find(u => u.id === userId && u.profileSetupComplete);

        if (registeredUser) {
          // Filter out hidden test accounts
          if (HIDDEN_USERNAMES.includes(registeredUser.username.toLowerCase())) {
            return undefined;
          }
          return {
            id: registeredUser.id,
            username: registeredUser.username,
            displayName: registeredUser.displayName,
            profilePhoto: registeredUser.profilePhoto,
            isPublic: !registeredUser.isPrivate,
            bio: registeredUser.bio,
            location: registeredUser.location,
            joinDate: registeredUser.joinDate,
          };
        }

        // Fallback to mock users
        return mockUsers.find(user => user.id === userId);
      },

      getFriendById: (friendId) => {
        const friends = get().friends;
        return friends.find(friend => friend.id === friendId);
      },

      areFriends: (userId1, userId2) => {
        const friendships = get().friendships;
        return friendships.some(
          f => (f.user1Id === userId1 && f.user2Id === userId2) ||
               (f.user1Id === userId2 && f.user2Id === userId1)
        );
      },

      // Real-time subscription to friendships
      subscribeToFriendships: (userId) => {

        const unsubscribeFriendships = FirebaseService.subscribeToUserFriendships(userId, async (friendships) => {
          set({ friendships });

          // Update friends list
          const friendIds = friendships.map((f) =>
            f.user1Id === userId ? f.user2Id : f.user1Id
          );

          const friendsData: Friend[] = [];
          for (const friendId of friendIds) {
            try {
              const userData = await FirebaseService.getUserDocument(friendId);
              if (userData) {
                friendsData.push({
                  id: userData.id,
                  username: userData.username,
                  displayName: userData.displayName,
                  profilePhoto: userData.profilePhoto,
                  isPublic: !userData.isPrivate,
                  bio: userData.bio,
                  location: userData.location,
                  joinDate: userData.joinDate,
                });
              }
            } catch (error) {
              console.error(`Error loading friend ${friendId}:`, error);
            }
          }

          set({ friends: friendsData });

          if (friendIds.length > 0) {
            // Load friend memories once (real-time subscription handled by FriendsScreen)
            try {
              const { useMemoryStore } = await import('./memoryStore');
              const loadFn = useMemoryStore.getState().loadFriendsMemories;
              if (typeof loadFn === 'function') {
                await loadFn(friendIds);
              }
            } catch (error) {
              console.error('Error loading friend memories:', error);
            }
          }
        });

        // Return cleanup function that unsubscribes from friendships
        return () => {
          unsubscribeFriendships();
        };
      },

      // Real-time subscription to friend requests
      subscribeToFriendRequests: (userId) => {
        const unsubscribeSent = FirebaseService.subscribeToUserFriendRequests(
          userId,
          'sent',
          (requests) => {
            set((state) => {
              const received = state.friendRequests.filter(r => r.toUserId === userId);
              return { friendRequests: [...requests, ...received] };
            });
          }
        );

        const unsubscribeReceived = FirebaseService.subscribeToUserFriendRequests(
          userId,
          'received',
          (requests) => {
            set((state) => {
              const sent = state.friendRequests.filter(r => r.fromUserId === userId);
              return { friendRequests: [...sent, ...requests] };
            });
          }
        );

        // Return unsubscribe function
        return () => {
          unsubscribeSent();
          unsubscribeReceived();
        };
      },
    }),
    {
      name: "friend-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
