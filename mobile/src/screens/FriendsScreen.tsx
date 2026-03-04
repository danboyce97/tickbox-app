import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, FlatList, Modal, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useFriendStore, Friend } from "../state/friendStore";
import { useMemoryStore, ReactionType } from "../state/memoryStore";
import { useReportStore, ReportReason } from "../state/reportStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import UserProfilePopup from "../components/UserProfilePopup";
import CommentsModal from "../components/CommentsModal";
import ImageViewerModal from "../components/ImageViewerModal";
import ReactionsModal from "../components/ReactionsModal";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FriendsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const markActivityAsSeen = useUserStore((state) => state.markActivityAsSeen);
  const friends = useFriendStore((state) => state.friends);
  const friendRequests = useFriendStore((state) => state.friendRequests);
  const searchUsers = useFriendStore((state) => state.searchUsers);
  const searchResults = useFriendStore((state) => state.searchResults);
  const isSearching = useFriendStore((state) => state.isSearching);
  const clearSearchResults = useFriendStore((state) => state.clearSearchResults);
  const sendFriendRequest = useFriendStore((state) => state.sendFriendRequest);
  const respondToFriendRequest = useFriendStore((state) => state.respondToFriendRequest);
  const getFriendRequests = useFriendStore((state) => state.getFriendRequests);
  const getFriendById = useFriendStore((state) => state.getFriendById);
  const getUserById = useFriendStore((state) => state.getUserById);
  const removeFriend = useFriendStore((state) => state.removeFriend);
  const blockUser = useFriendStore((state) => state.blockUser);
  const reportUser = useReportStore((state) => state.reportUser);
  const memories = useMemoryStore((state) => state.memories);
  const loadFriendsMemories = useMemoryStore((state) => state.loadFriendsMemories);
  const likeMemory = useMemoryStore((state) => state.likeMemory);
  const unlikeMemory = useMemoryStore((state) => state.unlikeMemory);
  const addReaction = useMemoryStore((state) => state.addReaction);
  const removeReaction = useMemoryStore((state) => state.removeReaction);
  const addComment = useMemoryStore((state) => state.addComment);
  const deleteComment = useMemoryStore((state) => state.deleteComment);
  const likeComment = useMemoryStore((state) => state.likeComment);
  const unlikeComment = useMemoryStore((state) => state.unlikeComment);
  const refreshMemory = useMemoryStore((state) => state.refreshMemory);
  const subscribeToFriendsMemories = useMemoryStore((state) => state.subscribeToFriendsMemories);

  const [activeTab, setActiveTab] = useState<"activity" | "friends" | "find">("activity");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pendingRequestUsers, setPendingRequestUsers] = useState<Record<string, Friend>>({});
  // Comment modal state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  // User profile popup
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [selectedUserPhoto, setSelectedUserPhoto] = useState<string | undefined>(undefined);
  const [showUserPopup, setShowUserPopup] = useState(false);
  // Track which users are currently being added (prevents duplicate clicks)
  const [addingFriendIds, setAddingFriendIds] = useState<Set<string>>(new Set());
  // Friend filter for activity feed
  const [showFriendFilter, setShowFriendFilter] = useState(false);
  const [friendFilterQuery, setFriendFilterQuery] = useState("");
  const [selectedFilterFriend, setSelectedFilterFriend] = useState<Friend | null>(null);
  // Photo viewer for user profile photos
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const [viewerPhotoTitle, setViewerPhotoTitle] = useState<string>("");
  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  // Reactions modal state
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionsModalMemoryId, setReactionsModalMemoryId] = useState<string | null>(null);

  // Early return must be AFTER all hooks
  const pendingRequests = user ? getFriendRequests(user.id, "received").filter(req => req.status === "pending") : [];
  const friendIds = friends.map(f => f.id);
  // Filter friend memories: must belong to a friend, have showOnFeed enabled, and not be protected
  const friendMemoriesOnly = memories.filter(
    (memory) => friendIds.includes(memory.userId) && memory.showOnFeed && !memory.isProtected
  );

  // Debug: log all memories that belong to friends but are being excluded
  const excludedFriendMemories = memories.filter(
    (memory) => friendIds.includes(memory.userId) && (!memory.showOnFeed || memory.isProtected)
  );
  if (excludedFriendMemories.length > 0) {
    console.log('🚫 EXCLUDED friend memories (showOnFeed=false or isProtected=true):');
    excludedFriendMemories.forEach(m => {
      console.log(`  - "${m.title}" by userId=${m.userId} | showOnFeed=${m.showOnFeed} isProtected=${m.isProtected}`);
    });
  }
  console.log(`📊 Feed stats: ${memories.length} total memories, ${friendIds.length} friends, ${friendMemoriesOnly.length} friend memories on feed`);

  // Get user's own memories where showOnFeed is true
  const ownFeedMemories = user ? memories.filter(
    (memory) => memory.userId === user.id && memory.showOnFeed && !memory.isProtected
  ) : [];

  // Helper to safely get timestamp from createdAt (handles both ISO strings and Firestore Timestamps)
  const getTimestamp = (createdAt: any): number => {
    if (!createdAt) return 0;
    // Handle Firestore Timestamp objects
    if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
      return createdAt.seconds * 1000;
    }
    // Handle ISO date strings
    const date = new Date(createdAt);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  // Combine friend memories and own feed memories, then sort by createdAt
  const allFeedMemories = [...friendMemoriesOnly, ...ownFeedMemories].sort(
    (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
  );

  // Debug: Log feed order
  console.log('📋 Activity Feed Order (by createdAt):');
  allFeedMemories.slice(0, 10).forEach((m, i) => {
    const timestamp = getTimestamp(m.createdAt);
    const dateStr = timestamp ? new Date(timestamp).toISOString() : 'unknown';
    console.log(`  ${i + 1}. "${m.title}" - createdAt: ${dateStr}`);
  });

  const friendMemories = allFeedMemories.slice(0, 50);

  // Filter friend memories if a filter is selected
  const filteredFriendMemories = selectedFilterFriend
    ? friendMemories.filter(m => m.userId === selectedFilterFriend.id)
    : friendMemories;

  // Get friends matching the filter search query
  const filteredFriendsForSearch = friendFilterQuery.trim()
    ? friends.filter(f =>
        f.displayName.toLowerCase().includes(friendFilterQuery.toLowerCase()) ||
        f.username.toLowerCase().includes(friendFilterQuery.toLowerCase())
      )
    : friends;

  // Clear search results when query is emptied
  useEffect(() => {
    if (!searchQuery.trim()) {
      clearSearchResults();
    }
  }, [searchQuery]);

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery, user?.id);
    }
  };

  // Subscribe to friend memories in real-time when friends change
  // This ensures new uploads from friends appear immediately without needing to refresh
  useEffect(() => {
    if (friendIds.length > 0) {
      console.log('📡 Subscribing to friend memories in real-time...', friendIds);
      // Do an initial fetch to populate immediately
      loadFriendsMemories(friendIds);
      // Then set up real-time subscription for live updates
      const unsubscribe = subscribeToFriendsMemories(friendIds);
      return () => {
        console.log('📡 Unsubscribing from friend memories');
        unsubscribe();
      };
    }
  }, [JSON.stringify(friendIds)]);

  // Fetch user data for pending friend requests
  useEffect(() => {
    const fetchRequestUsers = async () => {
      const usersMap: Record<string, Friend> = {};
      for (const request of pendingRequests) {
        if (!pendingRequestUsers[request.fromUserId]) {
          const userData = await getUserById(request.fromUserId);
          if (userData) {
            usersMap[request.fromUserId] = userData;
          }
        }
      }
      if (Object.keys(usersMap).length > 0) {
        setPendingRequestUsers(prev => ({ ...prev, ...usersMap }));
      }
    };

    if (pendingRequests.length > 0) {
      fetchRequestUsers();
    }
  }, [pendingRequests.length]);

  // AGGRESSIVELY PREFETCH ALL FEED IMAGES IMMEDIATELY
  useEffect(() => {
    if (friendMemories.length > 0 && user) {
      const imagesToPrefetch: string[] = [];

      friendMemories.forEach(memory => {
        if (memory.coverPhoto) imagesToPrefetch.push(memory.coverPhoto);
        // Prefetch user profile photo if available
        const memoryUser = friends.find(f => f.id === memory.userId) || (memory.userId === user.id ? user : null);
        if (memoryUser?.profilePhoto) imagesToPrefetch.push(memoryUser.profilePhoto);
      });

      // Prefetch ALL images in parallel IMMEDIATELY
      Promise.all(
        imagesToPrefetch.map(uri =>
          Image.prefetch(uri).catch(() => {
            // Silently ignore prefetch failures
          })
        )
      );
    }
  }, [friendMemories, friends, user]);

  // Calculate unseen activity count
  const unseenCount = user?.lastSeenActivityTimestamp
    ? allFeedMemories.filter(
        (memory) => getTimestamp(memory.createdAt) > new Date(user.lastSeenActivityTimestamp!).getTime()
      ).length
    : allFeedMemories.length;

  if (!user) return null;

  // Mark activity as seen when user switches to activity tab
  const handleTabChange = (tab: "activity" | "friends" | "find") => {
    setActiveTab(tab);
    if (tab === "activity") {
      markActivityAsSeen();
    }
  };

  const handleLike = (memoryId: string) => {
    const memory = friendMemories.find(m => m.id === memoryId);
    if (!memory || !user) return;

    // Prevent users from liking their own memories
    if (memory.userId === user.id) return;

    // Check current like state from the store directly
    const hasLiked = memory.likes?.includes(user.id) || false;
    const hasReacted = memory.reactions?.some(r => r.userId === user.id) || false;
    const currentlyLiked = hasLiked || hasReacted;

    // Update the store (which handles optimistic updates and Firebase sync)
    if (currentlyLiked) {
      // Remove both legacy like and reaction if they exist
      if (hasLiked) {
        unlikeMemory(memoryId, user.id);
      }
      if (hasReacted) {
        removeReaction(memoryId, user.id);
      }
    } else {
      // Add reaction (this also removes from legacy likes to prevent double-counting)
      addReaction(memoryId, user.id, "heart");
    }
  };

  const handleSubmitComment = async (text: string, parentId?: string) => {
    if (!user || !selectedMemoryId) return;

    await addComment(
      selectedMemoryId,
      user.id,
      user.displayName,
      user.profilePhoto,
      text,
      parentId
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !selectedMemoryId) return;
    await deleteComment(selectedMemoryId, commentId, user.id);
  };

  const handleLikeComment = (commentId: string) => {
    if (!user || !selectedMemoryId) return;
    likeComment(selectedMemoryId, commentId, user.id, user.displayName);
  };

  const handleUnlikeComment = (commentId: string) => {
    if (!user || !selectedMemoryId) return;
    unlikeComment(selectedMemoryId, commentId, user.id);
  };

  const handleOpenComments = async (memoryId: string) => {
    setSelectedMemoryId(memoryId);
    setShowCommentsModal(true);
    // Refresh the memory from Firebase to get latest comments
    await refreshMemory(memoryId);
  };

  const handleReaction = (memoryId: string, reactionType: ReactionType) => {
    console.log('📱 FriendsScreen handleReaction called:', { memoryId, reactionType });
    if (!user) {
      console.log('📱 handleReaction: No user, returning');
      return;
    }
    const memory = friendMemories.find(m => m.id === memoryId);
    if (!memory || memory.userId === user.id) {
      console.log('📱 handleReaction: Memory not found or own memory, returning');
      return;
    }

    const userReaction = memory.reactions?.find(r => r.userId === user.id);
    const hasLegacyLike = memory.likes?.includes(user.id) || false;
    console.log('📱 handleReaction: userReaction:', userReaction, 'hasLegacyLike:', hasLegacyLike);

    if (userReaction?.type === reactionType) {
      // Toggle off if same reaction
      console.log('📱 handleReaction: Removing reaction');
      removeReaction(memoryId, user.id);
    } else {
      // First, remove any legacy like if it exists (prevents double counting)
      if (hasLegacyLike) {
        console.log('📱 handleReaction: Removing legacy like first');
        unlikeMemory(memoryId, user.id);
      }
      // Add or change reaction
      console.log('📱 handleReaction: Adding reaction', reactionType);
      addReaction(memoryId, user.id, reactionType);
    }
    setShowReactionPicker(null);
  };

  const handleUserPress = (userId: string, userName: string, userPhoto?: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSelectedUserPhoto(userPhoto);
    setShowUserPopup(true);
  };

  const handleViewUserPhoto = (photo: string, userName: string) => {
    setViewerPhoto(photo);
    setViewerPhotoTitle(`${userName}'s Photo`);
    setShowPhotoViewer(true);
  };

  const handleOpenReactionsModal = (memoryId: string) => {
    setReactionsModalMemoryId(memoryId);
    setShowReactionsModal(true);
  };

  const handleFriendMenuPress = (friend: any) => {
    setSelectedFriend(friend);
    setShowFriendMenu(true);
  };

  const handleUnfriend = () => {
    if (!selectedFriend || !user) return;

    Alert.alert(
      "Unfriend",
      `Are you sure you want to unfriend ${selectedFriend.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfriend",
          style: "destructive",
          onPress: () => {
            removeFriend(selectedFriend.id);
            setShowFriendMenu(false);
            setSelectedFriend(null);
          },
        },
      ]
    );
  };

  const handleBlock = () => {
    if (!selectedFriend || !user) return;

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${selectedFriend.displayName}? They will be removed from your friends and won't be able to interact with you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            blockUser(selectedFriend.id);
            setShowFriendMenu(false);
            setSelectedFriend(null);
          },
        },
      ]
    );
  };

  const handleReport = (reason: ReportReason, details?: string) => {
    if (!selectedFriend || !user) return;

    reportUser(user.id, selectedFriend.id, reason, details, user.displayName, selectedFriend.displayName);
    setShowReportModal(false);
    setShowFriendMenu(false);
    setSelectedFriend(null);

    Alert.alert(
      "Report Submitted",
      "Thank you for your report. We'll review it and take appropriate action.",
      [{ text: "OK" }]
    );
  };

  const renderActivityItem = ({ item: memory }: any) => {
    // Check if this is the user's own memory or a friend's memory
    const isOwnMemory = memory.userId === user.id;
    const friend = isOwnMemory ? null : friends.find(f => f.id === memory.userId);

    // If it's not own memory and friend not found, don't render
    if (!isOwnMemory && !friend) return null;

    // Get user's reaction on this memory (either legacy like or new reaction)
    const userReaction = user ? memory.reactions?.find((r: { userId: string }) => r.userId === user.id) : null;
    const hasLegacyLike = user ? (memory.likes?.includes(user.id) || false) : false;
    const hasAnyReaction = userReaction || hasLegacyLike;

    // Count unique users who have interacted (either legacy like OR reaction, not both)
    // This prevents double counting when a user has both a legacy like and a reaction
    const reactorUserIds = new Set<string>();

    // Add users from reactions array
    (memory.reactions || []).forEach((r: { userId: string }) => {
      reactorUserIds.add(r.userId);
    });

    // Add users from legacy likes array (only if not already counted via reactions)
    (memory.likes || []).forEach((userId: string) => {
      reactorUserIds.add(userId);
    });

    const totalReactions = reactorUserIds.size;

    // Reaction emoji map
    const reactionEmojis: { type: ReactionType; emoji: string }[] = [
      { type: "heart", emoji: "❤️" },
      { type: "fire", emoji: "🔥" },
      { type: "celebrate", emoji: "🎉" },
      { type: "love", emoji: "😍" },
    ];

    const getUserReactionEmoji = () => {
      if (!userReaction) return null;
      const found = reactionEmojis.find(r => r.type === userReaction.type);
      return found?.emoji || "❤️";
    };

    const displayName = isOwnMemory ? "You" : friend?.displayName;
    const profilePhoto = isOwnMemory ? user.profilePhoto : friend?.profilePhoto;

    return (
      <TickBoxCard style={{ marginBottom: 12 }}>
        {/* Friend/User Header - separate from main pressable so photo is tappable */}
        <View className="flex-row items-center mb-3">
          {profilePhoto ? (
            <Pressable
              onPress={() => !isOwnMemory && memory.userId ? navigation.navigate("UserProfile", { userId: memory.userId }) : handleViewUserPhoto(profilePhoto, displayName || "User")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image
                source={profilePhoto}
                className="w-10 h-10 rounded-full mr-3"
                style={{ width: 40, height: 40, borderRadius: 20 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => !isOwnMemory && memory.userId ? navigation.navigate("UserProfile", { userId: memory.userId }) : null}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={{ backgroundColor: colors.border }} className="w-10 h-10 rounded-full mr-3">
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="person" size={20} color={colors.textMuted} />
                </View>
              </View>
            </Pressable>
          )}
          <Pressable
            className="flex-1"
            onPress={() => !isOwnMemory && memory.userId ? navigation.navigate("UserProfile", { userId: memory.userId }) : null}
          >
            <Text style={{ color: colors.text }} className="font-medium">
              {displayName}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              added a memory
            </Text>
          </Pressable>
        </View>

        {/* Main content area - navigates to memory detail */}
        <Pressable onPress={() => navigation.navigate("MemoryDetail", { memoryId: memory.id })}>

          {/* Memory Cover Photo */}
          {memory.coverPhoto && (
            <View style={{ height: 160, marginBottom: 12, borderRadius: 8, overflow: "hidden" }}>
              <Image
                source={memory.coverPhoto}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={0}
              />
            </View>
          )}

          {/* Memory Details */}
          <Text style={{ color: colors.text }} className="text-lg font-semibold mb-1">
            {memory.title}
          </Text>

          <View className="flex-row items-center mb-2">
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }} className="text-sm ml-1">
              {memory.location}
            </Text>
          </View>

          <View className="flex-row items-center mb-3">
            <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }} className="text-sm ml-1">
              {memory.category}
            </Text>
          </View>
        </Pressable>

        {/* Reaction and Comment Section - separate from main pressable */}
        <View>
          {/* Reaction Button Row */}
          <View className="flex-row items-center justify-between mb-3">
            {memory.userId !== user?.id ? (
              <View style={{ position: "relative", flexDirection: "row", alignItems: "center" }}>
                <Pressable
                  onPress={() => setShowReactionPicker(showReactionPicker === memory.id ? null : memory.id)}
                  onLongPress={() => setShowReactionPicker(memory.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {userReaction ? (
                    <Text style={{ fontSize: 20 }}>{getUserReactionEmoji()}</Text>
                  ) : hasLegacyLike ? (
                    <Ionicons name="heart" size={20} color="#FF3B30" />
                  ) : (
                    <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
                  )}
                </Pressable>
                {totalReactions > 0 ? (
                  <Pressable
                    onPress={() => handleOpenReactionsModal(memory.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{
                      color: hasAnyReaction ? colors.primary : colors.textSecondary,
                      marginLeft: 6,
                      fontWeight: "500"
                    }}>
                      {totalReactions}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{
                    color: colors.textSecondary,
                    marginLeft: 6,
                    fontWeight: "500"
                  }}>
                    React
                  </Text>
                )}

                {/* Reaction Picker Popup */}
                {showReactionPicker === memory.id && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 36,
                      left: 0,
                      backgroundColor: colors.cardBackground,
                      borderRadius: 28,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 5,
                      borderWidth: 1,
                      borderColor: colors.border,
                      zIndex: 100,
                    }}
                  >
                    {reactionEmojis.map((reaction) => (
                      <Pressable
                        key={reaction.type}
                        onPress={() => handleReaction(memory.id, reaction.type)}
                        style={{
                          width: 44,
                          height: 44,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: userReaction?.type === reaction.type ? colors.primary + "30" : "transparent",
                          borderRadius: 22,
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{reaction.emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="heart-outline" size={20} color={colors.textMuted} />
                {totalReactions > 0 ? (
                  <Pressable
                    onPress={() => handleOpenReactionsModal(memory.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{
                      color: colors.textMuted,
                      marginLeft: 6,
                      fontWeight: "500"
                    }}>
                      {`${totalReactions} reaction${totalReactions > 1 ? 's' : ''}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{
                    color: colors.textMuted,
                    marginLeft: 6,
                    fontWeight: "500"
                  }}>
                    Your memory
                  </Text>
                )}
              </View>
            )}

            {memory.price && (
              <Text style={{ color: colors.primary }} className="font-semibold">
                £{memory.price.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Comment Count Badge and Button */}
          <Pressable
            onPress={() => handleOpenComments(memory.id)}
            style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ fontSize: 16, marginRight: 6 }}>💬</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "500" }}>
              {memory.comments && memory.comments.length > 0
                ? `${memory.comments.length} ${memory.comments.length === 1 ? "comment" : "comments"}`
                : "Add a comment"}
            </Text>
          </Pressable>
        </View>
      </TickBoxCard>
    );
  };

  const renderFriendItem = ({ item: friend }: any) => (
    <Pressable onPress={() => navigation.navigate("UserProfile", { userId: friend.id })}>
      <TickBoxCard style={{ marginBottom: 12 }}>
        <View className="flex-row items-center">
          {friend.profilePhoto ? (
            <Image
              source={friend.profilePhoto}
              className="w-12 h-12 rounded-full mr-3"
              style={{ width: 48, height: 48, borderRadius: 24 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : (
            <View style={{ backgroundColor: colors.border }} className="w-12 h-12 rounded-full mr-3">
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="person" size={24} color={colors.textMuted} />
              </View>
            </View>
          )}
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="font-medium">
              {friend.displayName}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              @{friend.username}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleFriendMenuPress(friend);
            }}
            className="p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </TickBoxCard>
    </Pressable>
  );

  const renderSearchResult = ({ item: searchUser }: any) => {
    const isCurrentUser = searchUser.id === user.id;
    const isAlreadyFriend = friends.some(f => f.id === searchUser.id);
    const hasPendingRequest = friendRequests.some(
      req => req.fromUserId === user.id && req.toUserId === searchUser.id && req.status === "pending"
    );
    const isAddingThisFriend = addingFriendIds.has(searchUser.id);

    // Don't show current user in search results
    if (isCurrentUser) {
      return null;
    }

    const handleAddFriend = async () => {
      console.log('🔵 Add Friend button pressed for:', searchUser.id, searchUser.displayName);
      console.log('   - isAddingThisFriend:', isAddingThisFriend);
      console.log('   - isAlreadyFriend:', isAlreadyFriend);
      console.log('   - hasPendingRequest:', hasPendingRequest);

      if (isAddingThisFriend || isAlreadyFriend || hasPendingRequest) {
        console.log('⚠️ Blocked: conditions not met');
        return;
      }

      // Add to loading set
      console.log('⏳ Starting add friend process...');
      setAddingFriendIds(prev => new Set(prev).add(searchUser.id));

      try {
        console.log('📤 Calling sendFriendRequest with:', user.id, searchUser.id);
        await sendFriendRequest(user.id, searchUser.id);
        console.log('✅ sendFriendRequest completed');
      } catch (error) {
        console.error('❌ sendFriendRequest error:', error);
      } finally {
        // Remove from loading set after completion
        setAddingFriendIds(prev => {
          const next = new Set(prev);
          next.delete(searchUser.id);
          return next;
        });
        console.log('🔄 Loading state cleared for:', searchUser.id);
      }
    };

    const isPrivateAccount = !searchUser.isPublic;

    return (
      <Pressable onPress={() => navigation.navigate("UserProfile", { userId: searchUser.id })}>
        <TickBoxCard style={{ marginBottom: 12 }}>
          <View className="flex-row items-center">
            <View style={{ position: 'relative' }}>
              {searchUser.profilePhoto ? (
                <Image
                  source={searchUser.profilePhoto}
                  className="w-12 h-12 rounded-full mr-3"
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              ) : (
                <View style={{ backgroundColor: colors.border }} className="w-12 h-12 rounded-full mr-3">
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="person" size={24} color={colors.textMuted} />
                  </View>
                </View>
              )}
              {isPrivateAccount && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 8,
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    padding: 2,
                  }}
                >
                  <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <View className="flex-1">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.text }} className="font-medium">
                  {searchUser.displayName}
                </Text>
                {isPrivateAccount && (
                  <Ionicons name="lock-closed" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                @{searchUser.username}
              </Text>
            </View>
            {isAlreadyFriend ? (
              <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ color: colors.success, fontWeight: "500" }}>Friends</Text>
              </View>
            ) : hasPendingRequest ? (
              <Text style={{ color: colors.textSecondary }}>Requested</Text>
            ) : (
              <Pressable
                onPress={handleAddFriend}
                onPressIn={(e) => e.stopPropagation()}
                disabled={isAddingThisFriend}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  backgroundColor: isAddingThisFriend ? colors.primary + '80' : colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  opacity: isAddingThisFriend ? 0.7 : 1,
                }}
              >
                <Text className="text-white font-medium">
                  {isAddingThisFriend ? "Sending..." : isPrivateAccount ? "Send Request" : "Add Friend"}
                </Text>
              </Pressable>
            )}
          </View>
        </TickBoxCard>
      </Pressable>
    );
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Tab Navigation */}
      <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {[
          { key: "activity", label: "Activity", count: unseenCount },
          { key: "friends", label: "Friends", count: friends.length + (pendingRequests.length > 0 ? pendingRequests.length : 0) },
          { key: "find", label: "Find Friends", count: 0 },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => handleTabChange(tab.key as any)}
            className="flex-1 py-4"
            style={activeTab === tab.key ? { borderBottomWidth: 2, borderBottomColor: colors.primary } : {}}
          >
            <View className="items-center flex-row justify-center">
              <Text style={{
                fontWeight: "500",
                color: activeTab === tab.key ? colors.primary : colors.textSecondary
              }}>
                {tab.label}
                {tab.key === "friends" && friends.length > 0 && ` (${friends.length})`}
                {tab.key !== "friends" && tab.count > 0 && ` (${tab.count})`}
              </Text>
              {/* Show badge for pending requests on Friends tab */}
              {tab.key === "friends" && pendingRequests.length > 0 && (
                <View style={{
                  backgroundColor: colors.error,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 6,
                  paddingHorizontal: 6,
                }}>
                  <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
                    {pendingRequests.length}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeTab === "activity" && (
        <View className="flex-1 px-6 py-4">
          {/* Header with Filter Button */}
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: colors.text }} className="text-xl font-bold">
              Recent Activity
            </Text>
            {friends.length > 0 && (
              <Pressable
                onPress={() => setShowFriendFilter(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: selectedFilterFriend ? colors.primary : colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selectedFilterFriend ? colors.primary : colors.border,
                }}
              >
                <Ionicons
                  name="filter"
                  size={16}
                  color={selectedFilterFriend ? "white" : colors.textSecondary}
                />
                <Text
                  style={{
                    color: selectedFilterFriend ? "white" : colors.textSecondary,
                    marginLeft: 6,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  {selectedFilterFriend ? selectedFilterFriend.displayName : "Filter"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Active Filter Indicator */}
          {selectedFilterFriend && (
            <View
              style={{
                backgroundColor: `${colors.primary}15`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                {selectedFilterFriend.profilePhoto ? (
                  <Image
                    source={selectedFilterFriend.profilePhoto}
                    style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                ) : (
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="person" size={16} color={colors.textMuted} />
                  </View>
                )}
                <Text style={{ color: colors.text, fontWeight: "500" }}>
                  Showing {filteredFriendMemories.length} {filteredFriendMemories.length === 1 ? "memory" : "memories"} from {selectedFilterFriend.displayName}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedFilterFriend(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={colors.primary} />
              </Pressable>
            </View>
          )}

          {filteredFriendMemories.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
                {selectedFilterFriend ? "No Memories Found" : "No Activity Yet"}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                {selectedFilterFriend
                  ? `${selectedFilterFriend.displayName} hasn't shared any memories yet.`
                  : "Add friends to see their memories and activities here."}
              </Text>
              {selectedFilterFriend && (
                <Pressable
                  onPress={() => setSelectedFilterFriend(null)}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginTop: 16,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "500" }}>Clear Filter</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredFriendMemories}
              renderItem={renderActivityItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {activeTab === "friends" && (
        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          {/* Friend Requests Section */}
          {pendingRequests.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.text }} className="text-xl font-bold mb-3">
                Friend Requests ({pendingRequests.length})
              </Text>
              {pendingRequests.map((request) => {
                const fromUser = pendingRequestUsers[request.fromUserId];

                return (
                  <View
                    key={request.id}
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      {fromUser?.profilePhoto ? (
                        <Image
                          source={fromUser.profilePhoto}
                          style={{ width: 48, height: 48, borderRadius: 24 }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={0}
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: colors.border,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="person" size={24} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>
                          {fromUser?.displayName || "Loading..."}
                        </Text>
                        {fromUser?.username && (
                          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            @{fromUser.username}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="flex-row" style={{ gap: 12 }}>
                      <Pressable
                        onPress={() => respondToFriendRequest(request.id, "accepted")}
                        style={{
                          flex: 1,
                          backgroundColor: colors.primary,
                          paddingVertical: 12,
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "600" }}>Accept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => respondToFriendRequest(request.id, "declined")}
                        style={{
                          flex: 1,
                          backgroundColor: colors.surface,
                          paddingVertical: 12,
                          borderRadius: 8,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* My Friends Section */}
          <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">My Friends</Text>
          {friends.length === 0 && pendingRequests.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <Ionicons name="person-add-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
                No Friends Yet
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center mb-6">
                Start connecting with friends to share your memories together.
              </Text>
              <Pressable
                onPress={() => handleTabChange("find")}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text className="text-white font-medium">Find Friends</Text>
              </Pressable>
            </View>
          ) : friends.length === 0 ? (
            <View className="items-center py-8">
              <Text style={{ color: colors.textSecondary }} className="text-center">
                No friends yet. Accept requests above or find friends to connect!
              </Text>
            </View>
          ) : (
            friends.map((friend) => (
              <Pressable key={friend.id} onPress={() => navigation.navigate("UserProfile", { userId: friend.id })}>
                <TickBoxCard style={{ marginBottom: 12 }}>
                  <View className="flex-row items-center">
                    {friend.profilePhoto ? (
                      <Image
                        source={friend.profilePhoto}
                        className="w-12 h-12 rounded-full mr-3"
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
                      />
                    ) : (
                      <View style={{ backgroundColor: colors.border }} className="w-12 h-12 rounded-full mr-3">
                        <View className="w-full h-full items-center justify-center">
                          <Ionicons name="person" size={24} color={colors.textMuted} />
                        </View>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="font-medium">
                        {friend.displayName}
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        @{friend.username}
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleFriendMenuPress(friend);
                      }}
                      className="p-2"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </TickBoxCard>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === "find" && (
        <View className="flex-1 px-6 py-4">
          <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">Find Friends</Text>

          {/* Search Bar */}
          <View className="flex-row items-center mb-4" style={{ backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Search by username or name..."
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, marginLeft: 12, color: colors.text }}
              returnKeyType="search"
            />
            {searchQuery.trim() && (
              <Pressable
                onPress={handleSearchSubmit}
                disabled={isSearching}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "500", fontSize: 14 }}>
                  {isSearching ? "..." : "Search"}
                </Text>
              </Pressable>
            )}
          </View>

          {isSearching ? (
            <View className="flex-1 items-center justify-center">
              <Text style={{ color: colors.textSecondary }}>Searching users...</Text>
            </View>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
                No Results
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Try searching with a different username or name.
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
                Find Your Friends
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Search for friends by their username or display name to connect with them on TickBox.
              </Text>
            </View>
          )}
        </View>
      )}
      </SafeAreaView>

      {/* Friend Management Menu Modal */}
      <Modal
        visible={showFriendMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFriendMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowFriendMenu(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.cardBackground }}
            className="rounded-t-3xl p-6"
          >
            {selectedFriend && (
              <>
                <View className="flex-row items-center mb-6">
                  {selectedFriend.profilePhoto ? (
                    <Image
                      source={selectedFriend.profilePhoto}
                      className="w-12 h-12 rounded-full mr-3"
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                      contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
                    />
                  ) : (
                    <View style={{ backgroundColor: colors.border }} className="w-12 h-12 rounded-full mr-3">
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons name="person" size={24} color={colors.textMuted} />
                      </View>
                    </View>
                  )}
                  <View>
                    <Text style={{ color: colors.text }} className="font-semibold text-lg">
                      {selectedFriend.displayName}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm">
                      @{selectedFriend.username}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleUnfriend}
                  className="flex-row items-center py-4 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Ionicons name="person-remove-outline" size={24} color={colors.text} />
                  <Text style={{ color: colors.text }} className="ml-3 text-base">
                    Unfriend
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleBlock}
                  className="flex-row items-center py-4 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Ionicons name="ban-outline" size={24} color={colors.error} />
                  <Text style={{ color: colors.error }} className="ml-3 text-base">
                    Block
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowFriendMenu(false);
                    setShowReportModal(true);
                  }}
                  className="flex-row items-center py-4 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Ionicons name="flag-outline" size={24} color={colors.error} />
                  <Text style={{ color: colors.error }} className="ml-3 text-base">
                    Report
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowFriendMenu(false)}
                  className="mt-4 py-4 items-center"
                  style={{ backgroundColor: colors.surface, borderRadius: 12 }}
                >
                  <Text style={{ color: colors.text }} className="font-medium">
                    Cancel
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowReportModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.cardBackground }}
            className="rounded-t-3xl p-6"
          >
            <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">
              Report User
            </Text>
            <Text style={{ color: colors.textSecondary }} className="mb-6">
              Why are you reporting this user?
            </Text>

            {[
              { reason: "spam" as ReportReason, label: "Spam", icon: "mail-outline" },
              { reason: "harassment" as ReportReason, label: "Harassment or Bullying", icon: "alert-circle-outline" },
              { reason: "inappropriate_content" as ReportReason, label: "Inappropriate Content", icon: "eye-off-outline" },
              { reason: "fake_account" as ReportReason, label: "Fake Account", icon: "person-remove-outline" },
              { reason: "other" as ReportReason, label: "Other", icon: "ellipsis-horizontal-outline" },
            ].map((option) => (
              <Pressable
                key={option.reason}
                onPress={() => handleReport(option.reason)}
                className="flex-row items-center py-4 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <Ionicons name={option.icon as any} size={24} color={colors.text} />
                <Text style={{ color: colors.text }} className="ml-3 text-base">
                  {option.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowReportModal(false)}
              className="mt-4 py-4 items-center"
              style={{ backgroundColor: colors.surface, borderRadius: 12 }}
            >
              <Text style={{ color: colors.text }} className="font-medium">
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* User Profile Popup */}
      {selectedUserId && (
        <UserProfilePopup
          visible={showUserPopup}
          onClose={() => setShowUserPopup(false)}
          userId={selectedUserId}
          userName={selectedUserName}
          userPhoto={selectedUserPhoto}
        />
      )}

      {/* Comments Modal */}
      {selectedMemoryId && (
        <CommentsModal
          visible={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedMemoryId(null);
          }}
          comments={memories.find(m => m.id === selectedMemoryId)?.comments || []}
          onAddComment={handleSubmitComment}
          onDeleteComment={handleDeleteComment}
          onLikeComment={handleLikeComment}
          onUnlikeComment={handleUnlikeComment}
          onUserPress={handleUserPress}
          currentUserId={user?.id}
          memoryTitle={memories.find(m => m.id === selectedMemoryId)?.title || ""}
        />
      )}

      {/* Friend Filter Modal */}
      <Modal
        visible={showFriendFilter}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowFriendFilter(false);
          setFriendFilterQuery("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            onPress={() => {
              setShowFriendFilter(false);
              setFriendFilterQuery("");
            }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.cardBackground,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: "80%",
              }}
            >
              {/* Handle Bar */}
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: colors.border,
                    borderRadius: 2,
                  }}
                />
              </View>

              {/* Header */}
              <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>
                  Filter by Friend
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  Select a friend to see only their memories
                </Text>
              </View>

              {/* Search Input */}
              <View
                style={{
                  marginHorizontal: 24,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                  value={friendFilterQuery}
                  onChangeText={setFriendFilterQuery}
                  placeholder="Search friends..."
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, marginLeft: 10, color: colors.text, fontSize: 16 }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {friendFilterQuery.length > 0 && (
                  <Pressable onPress={() => setFriendFilterQuery("")}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Clear Filter Button (if filter is active) */}
              {selectedFilterFriend && (
                <Pressable
                  onPress={() => {
                    setSelectedFilterFriend(null);
                    setShowFriendFilter(false);
                    setFriendFilterQuery("");
                  }}
                  style={{
                    marginHorizontal: 24,
                    marginBottom: 12,
                    backgroundColor: `${colors.error}15`,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                  <Text style={{ color: colors.error, fontWeight: "600", marginLeft: 8 }}>
                    Clear Filter
                  </Text>
                </Pressable>
              )}

              {/* Friends List */}
              <ScrollView
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredFriendsForSearch.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                    <Text style={{ color: colors.text, fontWeight: "500", marginTop: 12 }}>
                      No friends found
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                      Try a different search term
                    </Text>
                  </View>
                ) : (
                  filteredFriendsForSearch.map((friend) => {
                    const isSelected = selectedFilterFriend?.id === friend.id;
                    const friendMemoryCount = friendMemories.filter(m => m.userId === friend.id).length;

                    return (
                      <Pressable
                        key={friend.id}
                        onPress={() => {
                          setSelectedFilterFriend(friend);
                          setShowFriendFilter(false);
                          setFriendFilterQuery("");
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 24,
                          paddingVertical: 14,
                          backgroundColor: isSelected ? `${colors.primary}15` : "transparent",
                        }}
                      >
                        {friend.profilePhoto ? (
                          <Image
                            source={friend.profilePhoto}
                            style={{ width: 44, height: 44, borderRadius: 22 }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={0}
                          />
                        ) : (
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: colors.border,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons name="person" size={22} color={colors.textMuted} />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>
                            {friend.displayName}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            @{friend.username} · {friendMemoryCount} {friendMemoryCount === 1 ? "memory" : "memories"}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {/* Bottom Padding */}
              <View style={{ height: 34 }} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Photo Viewer Modal for user profile photos */}
      {viewerPhoto && (
        <ImageViewerModal
          visible={showPhotoViewer}
          onClose={() => {
            setShowPhotoViewer(false);
            setViewerPhoto(null);
          }}
          images={[viewerPhoto]}
          title={viewerPhotoTitle}
        />
      )}

      {/* Reactions Modal */}
      {reactionsModalMemoryId && (
        <ReactionsModal
          visible={showReactionsModal}
          onClose={() => {
            setShowReactionsModal(false);
            setReactionsModalMemoryId(null);
          }}
          reactions={memories.find(m => m.id === reactionsModalMemoryId)?.reactions || []}
          legacyLikes={memories.find(m => m.id === reactionsModalMemoryId)?.likes || []}
        />
      )}
    </>
  );
}

