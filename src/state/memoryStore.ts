import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { scheduleMemoryNotifications } from "../utils/notificationScheduler";

export type Currency = "GBP" | "USD" | "EUR";
export type EventCategory = "Concert" | "Sports" | "Theater" | "Movies" | "Travel" | "Food" | "Other";

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
  likes: string[]; // Array of user IDs who liked this memory
  type: "uploaded" | "digital"; // Track creation method
  showOnFeed: boolean; // Whether to show on friends' feed
  uploadedImage?: string; // Original ticket image for uploads
}

interface MemoryState {
  memories: Memory[];
  addMemory: (memory: Omit<Memory, "id" | "createdAt" | "updatedAt" | "likes" | "isProtected">) => void;
  updateMemory: (id: string, updates: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  likeMemory: (memoryId: string, userId: string) => void;
  unlikeMemory: (memoryId: string, userId: string) => void;
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
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      addMemory: (memoryData) => {
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
        };
        
        // Schedule notifications for the memory
        scheduleMemoryNotifications(
          newMemory.id,
          newMemory.userId,
          newMemory.title,
          new Date(newMemory.date),
          newMemory.taggedFriends
        );
        
        set((state) => ({
          memories: [...state.memories, newMemory],
        }));
      },
      updateMemory: (id, updates) => {
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.id === id
              ? { ...memory, ...updates, updatedAt: new Date().toISOString() }
              : memory
          ),
        }));
      },
      deleteMemory: (id) => {
        set((state) => ({
          memories: state.memories.filter((memory) => memory.id !== id),
        }));
      },
      likeMemory: (memoryId, userId) => {
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.id === memoryId && !memory.likes.includes(userId)
              ? { ...memory, likes: [...memory.likes, userId] }
              : memory
          ),
        }));
      },
      unlikeMemory: (memoryId, userId) => {
        set((state) => ({
          memories: state.memories.map((memory) =>
            memory.id === memoryId
              ? { ...memory, likes: memory.likes.filter((id) => id !== userId) }
              : memory
          ),
        }));
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
    }),
    {
      name: "memory-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);