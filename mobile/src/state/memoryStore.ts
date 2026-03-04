import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { scheduleMemoryNotifications } from "../utils/notificationScheduler";
import { useNotificationStore } from "./notificationStore";
import { useFriendStore } from "./friendStore";
import { useUserStore } from "./userStore";
import * as FirebaseService from "../services/firebase";

export type Currency = "GBP" | "USD" | "EUR";
export type EventCategory = "Concert" | "Sports" | "Theatre" | "Movies" | "Travel" | "Food" | "Other";

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
  parentId?: string; // For replies
  replies?: Comment[]; // Nested replies
  likes?: string[]; // Array of user IDs who liked this comment
  deletedAt?: string; // Soft delete timestamp - comment is hidden but not removed from Firebase
}

export type ReactionType = "heart" | "fire" | "celebrate" | "love";

export interface Reaction {
  userId: string;
  type: ReactionType;
  createdAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  title: string;
  date: string; // ISO date string
  time?: string;
  location: string;
  price?: number;
  currency: Currency;
  category: EventCategory | string;
  description?: string;
  coverPhoto?: string; // URI or base64
  memoryPhotos: string[]; // Array of URIs or base64
  memoryVideos: string[]; // Array of video URIs
  seatingInfo?: {
    entrance?: string;
    block?: string;
    row?: string;
    seat?: string;
  };
  taggedFriends: string[]; // Array of user IDs
  createdAt: string;
  updatedAt: string;
  isProtected: boolean; // For future events with QR codes
  likes: string[]; // Array of user IDs who liked this memory (legacy, for backwards compat)
  reactions?: Reaction[]; // Array of emoji reactions
  comments: Comment[]; // Array of comments on this memory
  type: "uploaded" | "digital"; // Track creation method
  showOnFeed: boolean; // Whether to show on friends' feed
  uploadedImage?: string; // Original ticket image for uploads
}

interface MemoryState {
  memories: Memory[];
  // Track active subscriptions for cleanup
  activeMemorySubscriptions: Map<string, () => void>;
  addMemory: (memory: Omit<Memory, "id" | "createdAt" | "updatedAt" | "likes" | "isProtected" | "comments" | "reactions">) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  likeMemory: (memoryId: string, userId: string) => void;
  unlikeMemory: (memoryId: string, userId: string) => void;
  addReaction: (memoryId: string, userId: string, reactionType: ReactionType) => void;
  removeReaction: (memoryId: string, userId: string) => void;
  likeComment: (memoryId: string, commentId: string, userId: string, userName: string) => void;
  unlikeComment: (memoryId: string, commentId: string, userId: string) => void;
  addComment: (memoryId: string, userId: string, userName: string, userPhoto: string | undefined, text: string, parentId?: string) => Promise<void>;
  deleteComment: (memoryId: string, commentId: string, userId: string) => Promise<void>;
  getMemoriesByUser: (userId: string) => Memory[];
  getMemoriesByFriend: (friendIds: string[]) => Memory[];
  searchMemories: (query: string, userId: string) => Memory[];
  filterMemories: (filters: {
    userId: string;
    dateFilter?: "all" | "thisWeek" | "upcoming" | "past";
    category?: string;
    sortBy?: "date" | "priceHigh" | "priceLow" | "title";
  }) => Memory[];
  renameCategoryInMemories: (oldName: string, newName: string, userId: string) => void;
  deleteCategoryFromMemories: (categoryName: string, userId: string, defaultCategory: string) => void;
  loadUserMemories: (userId: string) => Promise<void>;
  subscribeToUserMemoriesRealtime: (userId: string) => () => void;
  loadFriendsMemories: (friendIds: string[]) => Promise<void>;
  subscribeToFriendsMemories: (friendIds: string[]) => () => void;
  subscribeToMemory: (memoryId: string) => () => void;
  unsubscribeFromMemory: (memoryId: string) => void;
  updateMemoryInStore: (memory: Memory) => void;
  refreshMemory: (memoryId: string) => Promise<void>;
  setMemories: (memories: Memory[]) => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      activeMemorySubscriptions: new Map<string, () => void>(),

      // Subscribe to a single memory for real-time updates
      subscribeToMemory: (memoryId: string) => {
        const existing = get().activeMemorySubscriptions.get(memoryId);
        if (existing) {
          // Already subscribed
          return existing;
        }

        console.log('📡 Subscribing to memory:', memoryId);
        const unsubscribe = FirebaseService.subscribeToMemory(memoryId, (memory) => {
          if (memory) {
            get().updateMemoryInStore(memory);
          }
        });

        set((state) => {
          const newMap = new Map(state.activeMemorySubscriptions);
          newMap.set(memoryId, unsubscribe);
          return { activeMemorySubscriptions: newMap };
        });

        return unsubscribe;
      },

      // Unsubscribe from a memory
      unsubscribeFromMemory: (memoryId: string) => {
        const unsubscribe = get().activeMemorySubscriptions.get(memoryId);
        if (unsubscribe) {
          console.log('📡 Unsubscribing from memory:', memoryId);
          unsubscribe();
          set((state) => {
            const newMap = new Map(state.activeMemorySubscriptions);
            newMap.delete(memoryId);
            return { activeMemorySubscriptions: newMap };
          });
        }
      },

      // Update a single memory in the store (used by real-time subscriptions)
      updateMemoryInStore: (memory: Memory) => {
        set((state) => {
          const existingIndex = state.memories.findIndex(m => m.id === memory.id);
          if (existingIndex >= 0) {
            const updatedMemories = [...state.memories];
            // Preserve local comments if they have more data
            const existingComments = state.memories[existingIndex].comments || [];
            const incomingComments = memory.comments || [];
            // Use whichever has more comments (handles async comment loading)
            const mergedComments = incomingComments.length >= existingComments.length
              ? incomingComments
              : existingComments;
            updatedMemories[existingIndex] = { ...memory, comments: mergedComments };
            return { memories: updatedMemories };
          } else {
            // Memory not in store, add it
            return { memories: [...state.memories, memory] };
          }
        });
      },

      addMemory: async (memoryData) => {
        const now = new Date().toISOString();
        const eventDate = new Date(memoryData.date);
        const isQRProtected = memoryData.type === "uploaded" && eventDate > new Date();

        const newMemory: Memory = {
          ...memoryData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          isProtected: isQRProtected,
          likes: [],
          comments: [],
        };

        // Add to local state first
        set((state) => ({
          memories: [...state.memories, newMemory],
        }));

        // Save to Firebase
        try {
          await FirebaseService.createMemory(newMemory);
          console.log('✅ Memory saved to Firebase:', newMemory.id);
        } catch (error) {
          console.error('❌ Failed to save memory to Firebase:', error);
          // Note: Memory still exists in local state as fallback
        }

        // Schedule notifications for the memory
        scheduleMemoryNotifications(
          newMemory.id,
          newMemory.userId,
          newMemory.title,
          new Date(newMemory.date),
          newMemory.taggedFriends
        );

        // Notify tagged friends only
        if (memoryData.taggedFriends && memoryData.taggedFriends.length > 0) {
          useFriendStore.getState().getUserById(memoryData.userId).then((creator) => {
            if (creator) {
              memoryData.taggedFriends!.forEach((friendId) => {
                // In-app notification (also sends push notification via notificationStore)
                useNotificationStore.getState().addNotification({
                  userId: friendId,
                  type: "tagged_in_memory",
                  title: "You were tagged in a memory",
                  message: `${creator.displayName} tagged you in "${memoryData.title}"`,
                  data: { memoryId: newMemory.id, creatorId: memoryData.userId },
                  read: false,
                });
              });
            }
          }).catch((error) => {
            console.error("Error notifying tagged friends:", error);
          });
        }
      },
      updateMemory: async (id, updates) => {
        // Update in local state
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.id === id
              ? { ...memory, ...updates, updatedAt: new Date().toISOString() }
              : memory
          ),
        }));

        // Update in Firebase
        try {
          await FirebaseService.updateMemory(id, updates);
          console.log('✅ Memory updated in Firebase:', id);
        } catch (error) {
          console.error('❌ Failed to update memory in Firebase:', error);
        }
      },
      deleteMemory: async (id) => {
        // Delete from local state
        set((state) => ({
          memories: state.memories.filter((memory) => memory.id !== id),
        }));

        // Delete from Firebase
        try {
          await FirebaseService.deleteMemory(id);
          console.log('✅ Memory deleted from Firebase:', id);
        } catch (error) {
          console.error('❌ Failed to delete memory from Firebase:', error);
        }
      },
      likeMemory: (memoryId, userId) => {
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) return;

        // Check if already liked
        const isCurrentlyLiked = (memory.likes || []).includes(userId);
        if (isCurrentlyLiked) return;

        // Optimistic update
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? { ...m, likes: [...(m.likes || []), userId] }
              : m
          ),
        }));

        // Use atomic operation - Firebase will update the store via real-time subscription
        FirebaseService.toggleMemoryLike(memoryId, userId, false)
          .then((result) => {
            if (!result.success) {
              // Revert optimistic update on failure
              set((state) => ({
                memories: state.memories.map((m) =>
                  m.id === memoryId
                    ? { ...m, likes: (m.likes || []).filter(id => id !== userId) }
                    : m
                ),
              }));
            }
          });

        // Trigger notification to memory owner (if not liking own memory)
        if (memory.userId !== userId) {
          const currentUser = useUserStore.getState().user;
          const likerName = currentUser?.displayName || currentUser?.username || 'Someone';
          useNotificationStore.getState().addNotification({
            userId: memory.userId,
            type: "memory_liked",
            title: "Someone liked your memory",
            message: `${likerName} liked your memory "${memory.title}"`,
            data: { memoryId, likerId: userId },
            read: false,
          });
        }
      },
      unlikeMemory: (memoryId, userId) => {
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) return;

        // Check if actually liked
        const isCurrentlyLiked = (memory.likes || []).includes(userId);
        if (!isCurrentlyLiked) return;

        // Optimistic update
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? { ...m, likes: (m.likes || []).filter((id) => id !== userId) }
              : m
          ),
        }));

        // Use atomic operation
        FirebaseService.toggleMemoryLike(memoryId, userId, true)
          .then((result) => {
            if (!result.success) {
              // Revert optimistic update on failure
              set((state) => ({
                memories: state.memories.map((m) =>
                  m.id === memoryId
                    ? { ...m, likes: [...(m.likes || []), userId] }
                    : m
                ),
              }));
            }
          });
      },
      addReaction: (memoryId, userId, reactionType) => {
        console.log('🔥 addReaction called:', { memoryId, userId, reactionType });
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) {
          console.error('❌ addReaction: Memory not found in store!', memoryId);
          return;
        }

        const currentReactions = memory.reactions || [];
        // Remove any existing reaction from this user first
        const filteredReactions = currentReactions.filter(r => r.userId !== userId);
        const newReaction: Reaction = {
          userId,
          type: reactionType,
          createdAt: new Date().toISOString(),
        };
        const updatedReactions = [...filteredReactions, newReaction];
        // Also remove from legacy likes to prevent double counting
        const updatedLikes = (memory.likes || []).filter(id => id !== userId);

        // Optimistic update
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? { ...m, reactions: updatedReactions, likes: updatedLikes }
              : m
          ),
        }));

        // Use atomic operation
        FirebaseService.setMemoryReaction(memoryId, userId, reactionType)
          .then((success) => {
            if (!success) {
              // Revert optimistic update on failure
              set((state) => ({
                memories: state.memories.map((m) =>
                  m.id === memoryId
                    ? { ...m, reactions: currentReactions, likes: memory.likes || [] }
                    : m
                ),
              }));
            }
          });
        // Trigger notification to memory owner (if not reacting to own memory)
        if (memory.userId !== userId) {
          const reactionEmojis: Record<ReactionType, string> = {
            heart: "❤️",
            fire: "🔥",
            celebrate: "🎉",
            love: "😍",
          };
          const currentUser = useUserStore.getState().user;
          const reactorName = currentUser?.displayName || currentUser?.username || 'Someone';
          useNotificationStore.getState().addNotification({
            userId: memory.userId,
            type: "memory_liked",
            title: "Someone reacted to your memory",
            message: `${reactorName} reacted ${reactionEmojis[reactionType]} to "${memory.title}"`,
            data: { memoryId, reactorId: userId, reactionType },
            read: false,
          });
        }
      },
      removeReaction: (memoryId, userId) => {
        console.log('🔥 removeReaction called:', { memoryId, userId });
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) {
          console.error('❌ removeReaction: Memory not found in store!', memoryId);
          return;
        }

        const currentReactions = memory.reactions || [];
        const updatedReactions = currentReactions.filter(r => r.userId !== userId);
        // Also remove from legacy likes
        const updatedLikes = (memory.likes || []).filter(id => id !== userId);

        // Optimistic update
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? { ...m, reactions: updatedReactions, likes: updatedLikes }
              : m
          ),
        }));

        // Use atomic operation
        FirebaseService.removeMemoryReaction(memoryId, userId)
          .then((success) => {
            if (!success) {
              // Revert optimistic update on failure
              set((state) => ({
                memories: state.memories.map((m) =>
                  m.id === memoryId
                    ? { ...m, reactions: currentReactions, likes: memory.likes || [] }
                    : m
                ),
              }));
            }
          });
      },
      likeComment: (memoryId, commentId, userId, userName) => {
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) return;

        // Find the comment to get current likes
        const findComment = (comments: Comment[]): Comment | undefined => {
          for (const comment of comments) {
            if (comment.id === commentId) return comment;
            if (comment.replies) {
              const found = findComment(comment.replies);
              if (found) return found;
            }
          }
          return undefined;
        };

        const targetComment = findComment(memory.comments || []);
        if (!targetComment) return;

        const currentLikes = targetComment.likes || [];
        if (currentLikes.includes(userId)) return; // Already liked

        const updatedLikes = [...currentLikes, userId];

        // Helper to add like to a comment (works for both top-level and replies)
        const addLikeToComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, likes: updatedLikes };
            }
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: addLikeToComment(comment.replies) };
            }
            return comment;
          });
        };

        const updatedComments = addLikeToComment(memory.comments || []);

        // Update local state immediately (optimistic)
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId ? { ...m, comments: updatedComments } : m
          ),
        }));

        // Save to MemoryComments collection (works for all users)
        FirebaseService.updateComment(commentId, { likes: updatedLikes })
          .then(() => console.log('✅ Comment like saved to MemoryComments collection'))
          .catch((error) => console.log('ℹ️ Could not update MemoryComments collection:', error));

        // Also try to update the memory document (for backwards compatibility)
        FirebaseService.updateMemory(memoryId, { comments: updatedComments })
          .then(() => console.log('✅ Comment like also saved to memory document'))
          .catch(() => console.log('ℹ️ Could not update memory document (expected for other users\' memories)'));

        // Send notification to comment owner (not for own comments)
        if (targetComment.userId !== userId) {
          const truncatedText = targetComment.text.length > 30
            ? targetComment.text.substring(0, 30) + '...'
            : targetComment.text;

          useNotificationStore.getState().addNotification({
            userId: targetComment.userId,
            type: "comment_liked",
            title: "Someone liked your comment",
            message: `${userName} liked your comment: "${truncatedText}"`,
            data: { memoryId, commentId, likerId: userId, memoryTitle: memory.title },
            read: false,
          });
        }
      },
      unlikeComment: (memoryId, commentId, userId) => {
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) return;

        // Find the comment to get current likes
        const findComment = (comments: Comment[]): Comment | undefined => {
          for (const comment of comments) {
            if (comment.id === commentId) return comment;
            if (comment.replies) {
              const found = findComment(comment.replies);
              if (found) return found;
            }
          }
          return undefined;
        };

        const targetComment = findComment(memory.comments || []);
        if (!targetComment) return;

        const currentLikes = targetComment.likes || [];
        const updatedLikes = currentLikes.filter(id => id !== userId);

        // Helper to remove like from a comment (works for both top-level and replies)
        const removeLikeFromComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, likes: updatedLikes };
            }
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: removeLikeFromComment(comment.replies) };
            }
            return comment;
          });
        };

        const updatedComments = removeLikeFromComment(memory.comments || []);

        // Update local state immediately (optimistic)
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId ? { ...m, comments: updatedComments } : m
          ),
        }));

        // Save to MemoryComments collection (works for all users)
        FirebaseService.updateComment(commentId, { likes: updatedLikes })
          .then(() => console.log('✅ Comment unlike saved to MemoryComments collection'))
          .catch((error) => console.log('ℹ️ Could not update MemoryComments collection:', error));

        // Also try to update the memory document (for backwards compatibility)
        FirebaseService.updateMemory(memoryId, { comments: updatedComments })
          .then(() => console.log('✅ Comment unlike also saved to memory document'))
          .catch(() => console.log('ℹ️ Could not update memory document (expected for other users\' memories)'));
      },
      getMemoriesByUser: (userId) => {
        return get().memories.filter((memory) => memory.userId === userId);
      },
      getMemoriesByFriend: (friendIds) => {
        return get().memories.filter(
          (memory) => 
            friendIds.includes(memory.userId) && 
            !memory.isProtected
        );
      },
      searchMemories: (query, userId) => {
        const userMemories = get().getMemoriesByUser(userId);
        if (!query.trim()) return userMemories;
        
        const lowercaseQuery = query.toLowerCase();
        return userMemories.filter(
          (memory) =>
            memory.title.toLowerCase().includes(lowercaseQuery) ||
            memory.location.toLowerCase().includes(lowercaseQuery) ||
            memory.category.toLowerCase().includes(lowercaseQuery)
        );
      },
      filterMemories: ({ userId, dateFilter = "all", category, sortBy = "date" }) => {
        let filteredMemories = get().getMemoriesByUser(userId);
        
        // Date filtering
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        switch (dateFilter) {
          case "thisWeek":
            filteredMemories = filteredMemories.filter(
              (memory) => new Date(memory.date) >= oneWeekAgo
            );
            break;
          case "upcoming":
            filteredMemories = filteredMemories.filter(
              (memory) => new Date(memory.date) > now
            );
            break;
          case "past":
            filteredMemories = filteredMemories.filter(
              (memory) => new Date(memory.date) <= now
            );
            break;
        }
        
        // Category filtering
        if (category && category !== "All") {
          filteredMemories = filteredMemories.filter(
            (memory) => memory.category === category
          );
        }
        
        // Sorting
        switch (sortBy) {
          case "date":
            filteredMemories.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            break;
          case "priceHigh":
            filteredMemories.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
          case "priceLow":
            filteredMemories.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
          case "title":
            filteredMemories.sort((a, b) => a.title.localeCompare(b.title));
            break;
        }
        
        return filteredMemories;
      },
      renameCategoryInMemories: (oldName, newName, userId) => {
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.userId === userId && memory.category === oldName
              ? { ...memory, category: newName, updatedAt: new Date().toISOString() }
              : memory
          ),
        }));
      },
      deleteCategoryFromMemories: (categoryName, userId, defaultCategory) => {
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.userId === userId && memory.category === categoryName
              ? { ...memory, category: defaultCategory, updatedAt: new Date().toISOString() }
              : memory
          ),
        }));
      },
      loadUserMemories: async (userId) => {
        try {
          console.log('🔄 Loading memories from Firebase for user:', userId);

          // First, clean up any orphaned memories (from before the ID fix)
          const orphanedCount = await FirebaseService.cleanupOrphanedMemories(userId);
          if (orphanedCount > 0) {
            console.log(`🧹 Cleaned up ${orphanedCount} orphaned memories`);
          }

          // Repair any memories missing the showOnFeed field (they won't appear on friends' feeds otherwise)
          const repairedCount = await FirebaseService.repairMissingShowOnFeed(userId);
          if (repairedCount > 0) {
            console.log(`🔧 Repaired showOnFeed on ${repairedCount} memories`);
          }

          const firebaseMemories = await FirebaseService.getUserMemories(userId);
          console.log('✅ Loaded', firebaseMemories.length, 'memories from Firebase');

          // Get deleted comment IDs from user profile to filter them out
          let deletedCommentIds: string[] = [];
          try {
            deletedCommentIds = useUserStore.getState().user?.deletedCommentIds || [];
          } catch (e) {
            console.log('⚠️ Could not load deletedCommentIds, using empty array');
          }

          // Also fetch comments from the separate MemoryComments collection
          const memoryIds = firebaseMemories.map(m => m.id);
          const commentsFromCollection = await FirebaseService.getCommentsForMemories(memoryIds);
          console.log('✅ Loaded comments from MemoryComments collection for', commentsFromCollection.size, 'memories');

          // Helper function to convert flat comments to nested structure
          const buildNestedComments = (flatComments: FirebaseService.FirebaseComment[]): Comment[] => {
            const sorted = [...flatComments].sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            const topLevel: Comment[] = [];
            const repliesMap = new Map<string, Comment[]>();

            sorted.forEach(fc => {
              const comment: Comment = {
                id: fc.id,
                userId: fc.userId,
                userName: fc.userName,
                userPhoto: fc.userPhoto,
                text: fc.text,
                createdAt: fc.createdAt,
                parentId: fc.parentId,
                likes: fc.likes || [],
                deletedAt: fc.deletedAt,
                replies: [],
              };

              if (fc.parentId) {
                const existing = repliesMap.get(fc.parentId) || [];
                existing.push(comment);
                repliesMap.set(fc.parentId, existing);
              } else {
                topLevel.push(comment);
              }
            });

            topLevel.forEach(comment => {
              comment.replies = repliesMap.get(comment.id) || [];
            });

            return topLevel;
          };

          // Helper function to filter out soft-deleted comments recursively
          const filterDeletedComments = (comments: Comment[]): Comment[] => {
            return comments
              .filter(c => !deletedCommentIds.includes(c.id) && !c.deletedAt)
              .map(c => ({
                ...c,
                replies: c.replies ? filterDeletedComments(c.replies) : undefined
              }));
          };

          // Merge comments from both sources for each memory
          const filteredMemories = firebaseMemories.map(m => {
            const collectionComments = commentsFromCollection.get(m.id) || [];
            const nestedCollectionComments = buildNestedComments(collectionComments);
            const memoryDocComments = m.comments || [];

            // Create a map to deduplicate by comment ID
            const allCommentsMap = new Map<string, Comment>();
            memoryDocComments.forEach(c => allCommentsMap.set(c.id, c));
            nestedCollectionComments.forEach(c => allCommentsMap.set(c.id, c));

            const mergedComments = Array.from(allCommentsMap.values());

            return {
              ...m,
              comments: filterDeletedComments(mergedComments)
            };
          });

          // Merge with existing memories - UPDATE existing memories with fresh data from Firebase
          // This ensures comments from friends are visible
          set((state) => {
            const existingMemoriesMap = new Map(state.memories.map(m => [m.id, m]));

            // Update user's memories with fresh data
            filteredMemories.forEach(freshMemory => {
              existingMemoriesMap.set(freshMemory.id, freshMemory);
            });

            return { memories: Array.from(existingMemoriesMap.values()) };
          });
        } catch (error) {
          console.error('❌ Failed to load memories from Firebase:', error);
        }
      },
      setMemories: (memories) => {
        set({ memories });
      },
      refreshMemory: async (memoryId: string) => {
        try {
          console.log('🔄 Refreshing memory from Firebase:', memoryId);
          const freshMemory = await FirebaseService.getMemory(memoryId);

          if (!freshMemory) {
            console.log('❌ Memory not found in Firebase:', memoryId);
            return;
          }

          // Get deleted comment IDs from user profile to filter them out
          let deletedCommentIds: string[] = [];
          try {
            deletedCommentIds = useUserStore.getState().user?.deletedCommentIds || [];
          } catch (e) {
            console.log('⚠️ Could not load deletedCommentIds, using empty array');
          }

          // Also fetch comments from the separate MemoryComments collection
          const commentsFromCollection = await FirebaseService.getCommentsForMemory(memoryId);
          console.log('✅ Loaded', commentsFromCollection.length, 'comments from MemoryComments collection');

          // Helper function to convert flat comments to nested structure
          const buildNestedComments = (flatComments: FirebaseService.FirebaseComment[]): Comment[] => {
            const sorted = [...flatComments].sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            const topLevel: Comment[] = [];
            const repliesMap = new Map<string, Comment[]>();

            sorted.forEach(fc => {
              const comment: Comment = {
                id: fc.id,
                userId: fc.userId,
                userName: fc.userName,
                userPhoto: fc.userPhoto,
                text: fc.text,
                createdAt: fc.createdAt,
                parentId: fc.parentId,
                likes: fc.likes || [],
                deletedAt: fc.deletedAt,
                replies: [],
              };

              if (fc.parentId) {
                const existing = repliesMap.get(fc.parentId) || [];
                existing.push(comment);
                repliesMap.set(fc.parentId, existing);
              } else {
                topLevel.push(comment);
              }
            });

            topLevel.forEach(comment => {
              comment.replies = repliesMap.get(comment.id) || [];
            });

            return topLevel;
          };

          // Helper function to filter out deleted comments recursively
          const filterDeletedComments = (comments: Comment[]): Comment[] => {
            return comments
              .filter(c => !deletedCommentIds.includes(c.id) && !c.deletedAt)
              .map(c => ({
                ...c,
                replies: c.replies ? filterDeletedComments(c.replies) : undefined
              }));
          };

          // Merge comments from both sources
          const nestedCollectionComments = buildNestedComments(commentsFromCollection);
          const memoryDocComments = freshMemory.comments || [];

          // Create a map to deduplicate by comment ID
          const allCommentsMap = new Map<string, Comment>();
          memoryDocComments.forEach(c => allCommentsMap.set(c.id, c));
          nestedCollectionComments.forEach(c => allCommentsMap.set(c.id, c));

          const mergedComments = Array.from(allCommentsMap.values());

          // Filter deleted comments
          const filteredMemory = {
            ...freshMemory,
            comments: filterDeletedComments(mergedComments)
          };

          // Update this specific memory in the store
          // If memory doesn't exist in local state, add it; otherwise update it
          set((state) => {
            const existingIndex = state.memories.findIndex(m => m.id === memoryId);
            if (existingIndex >= 0) {
              // Update existing memory
              return {
                memories: state.memories.map(m =>
                  m.id === memoryId ? filteredMemory : m
                )
              };
            } else {
              // Add new memory to state (e.g., viewing friend's memory from notification)
              return {
                memories: [...state.memories, filteredMemory]
              };
            }
          });

          console.log('✅ Memory refreshed with', filteredMemory.comments.length, 'comments and', filteredMemory.likes.length, 'likes');
        } catch (error) {
          console.error('❌ Failed to refresh memory from Firebase:', error);
        }
      },
      loadFriendsMemories: async (friendIds: string[]) => {
        if (friendIds.length === 0) return;

        try {
          console.log('🔄 Loading friend memories from Firebase for friends:', friendIds);
          const friendMemories = await FirebaseService.getFriendsMemories(friendIds);
          console.log('✅ Loaded', friendMemories.length, 'friend memories from Firebase');

          // Get deleted comment IDs from user profile to filter them out
          let deletedCommentIds: string[] = [];
          try {
            deletedCommentIds = useUserStore.getState().user?.deletedCommentIds || [];
          } catch (e) {
            console.log('⚠️ Could not load deletedCommentIds, using empty array');
          }

          // Also fetch comments from the separate MemoryComments collection
          const memoryIds = friendMemories.map(m => m.id);
          const commentsFromCollection = await FirebaseService.getCommentsForMemories(memoryIds);
          console.log('✅ Loaded comments from MemoryComments collection for', commentsFromCollection.size, 'memories');

          // Helper function to convert flat comments to nested structure
          const buildNestedComments = (flatComments: FirebaseService.FirebaseComment[]): Comment[] => {
            // Sort by createdAt to ensure proper ordering
            const sorted = [...flatComments].sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            const topLevel: Comment[] = [];
            const repliesMap = new Map<string, Comment[]>();

            // Separate top-level comments from replies
            sorted.forEach(fc => {
              const comment: Comment = {
                id: fc.id,
                userId: fc.userId,
                userName: fc.userName,
                userPhoto: fc.userPhoto,
                text: fc.text,
                createdAt: fc.createdAt,
                parentId: fc.parentId,
                likes: fc.likes || [],
                deletedAt: fc.deletedAt,
                replies: [],
              };

              if (fc.parentId) {
                // This is a reply
                const existing = repliesMap.get(fc.parentId) || [];
                existing.push(comment);
                repliesMap.set(fc.parentId, existing);
              } else {
                // This is a top-level comment
                topLevel.push(comment);
              }
            });

            // Attach replies to their parent comments
            topLevel.forEach(comment => {
              comment.replies = repliesMap.get(comment.id) || [];
            });

            return topLevel;
          };

          // Helper function to filter out deleted comments recursively
          const filterDeletedComments = (comments: Comment[]): Comment[] => {
            return comments
              .filter(c => !deletedCommentIds.includes(c.id) && !c.deletedAt)
              .map(c => ({
                ...c,
                replies: c.replies ? filterDeletedComments(c.replies) : undefined
              }));
          };

          // Merge comments from both sources (memory document + MemoryComments collection)
          const filteredMemories = friendMemories.map(m => {
            // Get comments from the separate collection
            const collectionComments = commentsFromCollection.get(m.id) || [];
            const nestedCollectionComments = buildNestedComments(collectionComments);

            // Merge with comments from memory document (for backwards compatibility)
            const memoryDocComments = m.comments || [];

            // Create a map to deduplicate by comment ID
            const allCommentsMap = new Map<string, Comment>();

            // Add memory doc comments first
            memoryDocComments.forEach(c => allCommentsMap.set(c.id, c));

            // Override/add with collection comments (these are the source of truth)
            nestedCollectionComments.forEach(c => allCommentsMap.set(c.id, c));

            const mergedComments = Array.from(allCommentsMap.values());

            return {
              ...m,
              comments: filterDeletedComments(mergedComments)
            };
          });

          // Merge with existing memories - UPDATE existing memories with fresh data from Firebase
          // Also REMOVE friend memories that no longer exist (were deleted)
          set((state) => {
            const existingMemoriesMap = new Map(state.memories.map(m => [m.id, m]));

            // Create a set of friend memory IDs that exist in Firebase
            const freshMemoryIds = new Set(filteredMemories.map(m => m.id));
            const friendIdSet = new Set(friendIds);

            // Remove memories from friends that are no longer in the Firebase list
            state.memories.forEach(m => {
              if (friendIdSet.has(m.userId) && !freshMemoryIds.has(m.id)) {
                // This memory belongs to a friend but is no longer in Firebase
                // It was likely deleted
                console.log('🗑️ Removing deleted friend memory from local state:', m.id);
                existingMemoriesMap.delete(m.id);
              }
            });

            // Update existing memories with fresh data (especially comments)
            filteredMemories.forEach(freshMemory => {
              existingMemoriesMap.set(freshMemory.id, {
                ...existingMemoriesMap.get(freshMemory.id),
                ...freshMemory,
              });
            });

            return { memories: Array.from(existingMemoriesMap.values()) };
          });
        } catch (error) {
          console.error('❌ Failed to load friend memories from Firebase:', error);
        }
      },
      subscribeToUserMemoriesRealtime: (userId: string) => {
        console.log('📡 Setting up real-time subscription for own memories...', userId);

        return FirebaseService.subscribeToUserMemories(userId, (userMemories) => {
          console.log('📡 Real-time update received:', userMemories.length, 'own memories');

          set((state) => {
            const existingMemoriesMap = new Map(state.memories.map(m => [m.id, m]));

            // Remove own memories that no longer exist (deleted elsewhere)
            state.memories.forEach(m => {
              if (m.userId === userId && !userMemories.find(um => um.id === m.id)) {
                existingMemoriesMap.delete(m.id);
              }
            });

            // Upsert fresh own memories
            userMemories.forEach(freshMemory => {
              existingMemoriesMap.set(freshMemory.id, {
                ...existingMemoriesMap.get(freshMemory.id),
                ...freshMemory,
              });
            });

            return { memories: Array.from(existingMemoriesMap.values()) };
          });
        });
      },
      subscribeToFriendsMemories: (friendIds: string[]) => {
        if (friendIds.length === 0) {
          return () => {};
        }

        console.log('📡 Setting up real-time subscription for friend memories...');

        return FirebaseService.subscribeToFriendsMemories(friendIds, (friendMemories) => {
          console.log('📡 Real-time update received:', friendMemories.length, 'friend memories');

          // Create a set of friend memory IDs that still exist
          const friendMemoryIds = new Set(friendMemories.map(m => m.id));

          // Merge with existing memories - update friend memories with fresh data
          // Also REMOVE friend memories that no longer exist (were deleted)
          set((state) => {
            const existingMemoriesMap = new Map(state.memories.map(m => [m.id, m]));

            // Remove memories from friends that are no longer in the Firebase list
            // Only remove if the memory belongs to one of the friends
            const friendIdSet = new Set(friendIds);
            state.memories.forEach(m => {
              if (friendIdSet.has(m.userId) && !friendMemoryIds.has(m.id)) {
                // This memory belongs to a friend but is no longer in Firebase
                // It was likely deleted
                console.log('📡 Removing deleted friend memory from local state:', m.id);
                existingMemoriesMap.delete(m.id);
              }
            });

            // Update existing friend memories with fresh data (especially likes/comments)
            friendMemories.forEach(freshMemory => {
              existingMemoriesMap.set(freshMemory.id, {
                ...existingMemoriesMap.get(freshMemory.id),
                ...freshMemory,
              });
            });

            return { memories: Array.from(existingMemoriesMap.values()) };
          });
        });
      },
      addComment: async (memoryId, userId, userName, userPhoto, text, parentId) => {
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) return;

        // Build comment object without undefined values (Firebase doesn't accept undefined)
        const newComment: Comment = {
          id: uuidv4(),
          userId,
          userName,
          text,
          createdAt: new Date().toISOString(),
          ...(userPhoto ? { userPhoto } : {}),
          ...(parentId ? { parentId } : {}),
        };

        let updatedComments: Comment[];

        if (parentId) {
          // This is a reply - add it to the parent comment's replies
          updatedComments = (memory.comments || []).map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              };
            }
            return comment;
          });
        } else {
          // This is a top-level comment
          updatedComments = [...(memory.comments || []), { ...newComment, replies: [] }];
        }

        // Update local state
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? { ...m, comments: updatedComments }
              : m
          ),
        }));

        // Save to Firebase - use separate MemoryComments collection (works for all users)
        // AND try to update the memory document (only works for own memories)
        try {
          // Always save to MemoryComments collection - this is the source of truth
          await FirebaseService.addCommentToMemory({
            id: newComment.id,
            memoryId,
            userId,
            userName,
            text,
            createdAt: newComment.createdAt,
            ...(userPhoto ? { userPhoto } : {}),
            ...(parentId ? { parentId } : {}),
          });
          console.log('✅ Comment saved to MemoryComments collection:', newComment.id);

          // Also try to update the memory document (for backwards compatibility with own memories)
          // This will silently fail for other users' memories due to permissions
          try {
            await FirebaseService.updateMemory(memoryId, {
              comments: updatedComments,
            });
            console.log('✅ Comment also saved to memory document:', memoryId);
          } catch (memoryUpdateError) {
            // Expected to fail for other users' memories - that's OK, we have the comment in MemoryComments
            console.log('ℹ️ Could not update memory document (expected for other users\' memories)');
          }
        } catch (error) {
          console.error('❌ Failed to add comment to Firebase:', error);
        }

        // Truncate comment text for notification display
        const truncatedText = text.length > 50 ? text.substring(0, 50) + '...' : text;

        // Notify memory owner if commenter is not the owner
        if (memory.userId !== userId) {
          useNotificationStore.getState().addNotification({
            userId: memory.userId,
            type: parentId ? "comment_reply" : "memory_comment",
            title: parentId ? "New reply on your memory" : "New comment on your memory",
            message: `${userName}: "${truncatedText}"`,
            data: { memoryId, commenterId: userId, memoryTitle: memory.title },
            read: false,
          });
        }

        // If this is a reply, also notify the parent comment author
        if (parentId) {
          const parentComment = (memory.comments || []).find(c => c.id === parentId);
          // Only notify if:
          // 1. Parent comment exists
          // 2. Parent comment author is not the current user (don't notify yourself)
          // 3. Parent comment author is not the memory owner (they already got a notification above)
          if (parentComment && parentComment.userId !== userId && parentComment.userId !== memory.userId) {
            useNotificationStore.getState().addNotification({
              userId: parentComment.userId,
              type: "comment_reply",
              title: "Someone replied to your comment",
              message: `${userName}: "${truncatedText}"`,
              data: { memoryId, commenterId: userId, parentCommentId: parentId, memoryTitle: memory.title },
              read: false,
            });
          }
        }
      },
      deleteComment: async (memoryId, commentId, userId) => {
        const memory = get().memories.find(m => m.id === memoryId);
        if (!memory) return;

        const isOwnMemory = memory.userId === userId;

        // Helper function to recursively remove comment from replies
        const removeCommentFromReplies = (commentsList: Comment[]): Comment[] => {
          return commentsList.map(comment => {
            if (comment.replies && comment.replies.length > 0) {
              const filteredReplies = comment.replies.filter(reply => reply.id !== commentId);
              return { ...comment, replies: removeCommentFromReplies(filteredReplies) };
            }
            return comment;
          });
        };

        // Remove from top-level comments
        let updatedComments = memory.comments.filter(c => c.id !== commentId);

        // If no top-level comment was removed, try removing from replies
        if (updatedComments.length === memory.comments.length) {
          updatedComments = removeCommentFromReplies(memory.comments);
        }

        // Update local state immediately (optimistic)
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? { ...m, comments: updatedComments }
              : m
          ),
        }));

        // Update in Firebase - different approach based on memory ownership
        if (isOwnMemory) {
          // User owns this memory, can directly update it in Firebase
          try {
            await FirebaseService.deleteCommentFromMemory(memoryId, commentId, userId);
            console.log('✅ Comment deleted from Firebase:', memoryId);
          } catch (error) {
            console.error('❌ Failed to delete comment from Firebase:', error);
          }
        } else {
          // User doesn't own this memory - store deleted comment ID in their profile
          // This avoids Firebase permission errors when trying to update others' memories
          try {
            await useUserStore.getState().addDeletedCommentId(commentId);
            console.log('✅ Comment marked as deleted in user profile:', commentId);
          } catch (error) {
            console.error('❌ Failed to mark comment as deleted:', error);
          }
        }
      },
    }),
    {
      name: "memory-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist runtime-only fields
      partialize: (state) => ({
        memories: state.memories,
      }),
      // Ensure runtime fields are initialized on rehydration
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<MemoryState>),
        // Always reset runtime-only fields
        activeMemorySubscriptions: new Map<string, () => void>(),
      }),
    }
  )
);