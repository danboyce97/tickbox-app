import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useFriendStore } from "../state/friendStore";
import { useMemoryStore, Memory, ReactionType } from "../state/memoryStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import CommentsModal from "../components/CommentsModal";
import ReactionsModal from "../components/ReactionsModal";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDiscoverMemories, setMemoryReaction, removeMemoryReaction } from "../services/firebase";
import { useNotificationStore } from "../state/notificationStore";
import { HIDDEN_USERNAMES } from "../state/friendStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DiscoverUser {
  id: string;
  displayName: string;
  username: string;
  profilePhoto?: string;
}

export default function DiscoverScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((s) => s.user);
  const friends = useFriendStore((s) => s.friends);
  const friendRequests = useFriendStore((s) => s.friendRequests);
  const sendFriendRequest = useFriendStore((s) => s.sendFriendRequest);
  const getUserById = useFriendStore((s) => s.getUserById);

  const addComment = useMemoryStore((s) => s.addComment);
  const deleteComment = useMemoryStore((s) => s.deleteComment);
  const likeComment = useMemoryStore((s) => s.likeComment);
  const unlikeComment = useMemoryStore((s) => s.unlikeComment);
  const refreshMemory = useMemoryStore((s) => s.refreshMemory);
  const memories = useMemoryStore((s) => s.memories);

  const addNotification = useNotificationStore((s) => s.addNotification);

  const [discoverMemories, setDiscoverMemories] = useState<Memory[]>([]);
  const [userCache, setUserCache] = useState<Record<string, DiscoverUser>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingFriendIds, setAddingFriendIds] = useState<Set<string>>(new Set());
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionsModalMemoryId, setReactionsModalMemoryId] = useState<string | null>(null);

  const friendIds = friends.map((f) => f.id);

  const loadDiscover = useCallback(async (isRefresh = false) => {
    if (!user) return;
    try {
      // Exclude self + all friends
      const excludeIds = [user.id, ...friendIds];
      const results = await getDiscoverMemories(excludeIds, 8);

      // Filter out hidden test accounts
      const filtered = results.filter((m) => {
        // We'll resolve usernames as we fetch user data
        return true;
      });

      setDiscoverMemories(filtered);

      // Fetch user data for all unique userIds in results
      const uniqueUserIds = [...new Set(filtered.map((m) => m.userId))];
      // On refresh, clear cache so we always re-fetch fresh user data
      const newCache: Record<string, DiscoverUser> = isRefresh ? {} : { ...userCache };
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          if (!newCache[uid]) {
            try {
              const userData = await getUserById(uid);
              if (userData) {
                // Filter hidden accounts
                if (!HIDDEN_USERNAMES.includes(userData.username?.toLowerCase() || "")) {
                  newCache[uid] = userData as DiscoverUser;
                }
              }
            } catch {
              // ignore
            }
          }
        })
      );
      setUserCache(newCache);

      // Filter out memories from hidden users
      setDiscoverMemories(
        filtered.filter((m) => newCache[m.userId] !== undefined)
      );
    } catch (error) {
      console.error("❌ Error loading discover feed:", error);
    }
  }, [user?.id, JSON.stringify(friendIds)]);

  useEffect(() => {
    setLoading(true);
    loadDiscover().finally(() => setLoading(false));
  }, [loadDiscover]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDiscover(true);
    setRefreshing(false);
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!user || addingFriendIds.has(targetUserId)) return;
    const alreadyFriend = friends.some((f) => f.id === targetUserId);
    const hasPending = friendRequests.some(
      (r) => r.fromUserId === user.id && r.toUserId === targetUserId && r.status === "pending"
    );
    if (alreadyFriend || hasPending) return;

    setAddingFriendIds((prev) => new Set(prev).add(targetUserId));
    try {
      await sendFriendRequest(user.id, targetUserId);
    } catch (e) {
      console.error("❌ sendFriendRequest error:", e);
    } finally {
      setAddingFriendIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleReaction = async (memoryId: string, reactionType: ReactionType) => {
    if (!user) return;
    const memory = discoverMemories.find((m) => m.id === memoryId);
    if (!memory || memory.userId === user.id) return;

    const userReaction = memory.reactions?.find((r) => r.userId === user.id);

    const isToggleOff = userReaction?.type === reactionType;

    // Optimistic local update
    setDiscoverMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memoryId) return m;
        const filtered = (m.reactions || []).filter((r) => r.userId !== user.id);
        return {
          ...m,
          reactions: isToggleOff
            ? filtered
            : [...filtered, { userId: user.id, type: reactionType, createdAt: new Date().toISOString() }],
          likes: (m.likes || []).filter((id) => id !== user.id),
        };
      })
    );

    setShowReactionPicker(null);

    // Persist to Firebase directly (bypasses store lookup)
    if (isToggleOff) {
      await removeMemoryReaction(memoryId, user.id);
    } else {
      await setMemoryReaction(memoryId, user.id, reactionType);

      // Send push notification to memory owner
      const reactionEmojiMap: Record<ReactionType, string> = {
        heart: "❤️",
        fire: "🔥",
        celebrate: "🎉",
        love: "😍",
      };
      const emoji = reactionEmojiMap[reactionType] || "❤️";
      const senderName = user.displayName || user.username || "Someone";
      const memoryTitle = memory.title || "your memory";

      await addNotification({
        userId: memory.userId,
        type: "memory_liked",
        title: `${senderName} reacted to your memory`,
        message: `${senderName} reacted ${emoji} to "${memoryTitle}"`,
        data: {
          memoryId,
          senderId: user.id,
          senderName,
          reactionType,
        },
        read: false,
      });
    }
  };

  const handleOpenComments = async (memoryId: string) => {
    setSelectedMemoryId(memoryId);
    setShowCommentsModal(true);
    await refreshMemory(memoryId);
  };

  const handleSubmitComment = async (text: string, parentId?: string) => {
    if (!user || !selectedMemoryId) return;
    await addComment(selectedMemoryId, user.id, user.displayName, user.profilePhoto, text, parentId);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !selectedMemoryId) return;
    await deleteComment(selectedMemoryId, commentId, user.id);
  };

  const reactionEmojis: { type: ReactionType; emoji: string }[] = [
    { type: "heart", emoji: "❤️" },
    { type: "fire", emoji: "🔥" },
    { type: "celebrate", emoji: "🎉" },
    { type: "love", emoji: "😍" },
  ];

  const getTimestamp = (createdAt: any): number => {
    if (!createdAt) return 0;
    if (typeof createdAt === "object" && "seconds" in createdAt) return createdAt.seconds * 1000;
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const renderItem = ({ item: memory }: { item: Memory }) => {
    const memoryUser = userCache[memory.userId];
    if (!memoryUser) return null;

    const isOwnMemory = memory.userId === user?.id;
    const isAlreadyFriend = friends.some((f) => f.id === memory.userId);
    const hasPendingRequest = friendRequests.some(
      (r) =>
        r.fromUserId === user?.id &&
        r.toUserId === memory.userId &&
        r.status === "pending"
    );
    const isAdding = addingFriendIds.has(memory.userId);

    const userReaction = user ? memory.reactions?.find((r) => r.userId === user.id) : null;
    const hasLegacyLike = user ? memory.likes?.includes(user.id) || false : false;
    const hasAnyReaction = userReaction || hasLegacyLike;

    const reactorUserIds = new Set<string>();
    (memory.reactions || []).forEach((r) => reactorUserIds.add(r.userId));
    (memory.likes || []).forEach((uid) => reactorUserIds.add(uid));
    const totalReactions = reactorUserIds.size;

    const getUserReactionEmoji = () => {
      if (!userReaction) return null;
      return reactionEmojis.find((r) => r.type === userReaction.type)?.emoji || "❤️";
    };

    // Get latest comment snapshot from the main store if available
    const liveMemory = memories.find((m) => m.id === memory.id);
    const commentCount = (liveMemory || memory).comments?.length || 0;

    return (
      <TickBoxCard style={{ marginBottom: 16 }}>
        {/* User header */}
        <View className="flex-row items-center mb-3">
          <Pressable
            onPress={() => navigation.navigate("UserProfile", { userId: memory.userId })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {memoryUser.profilePhoto ? (
              <Image
                source={memoryUser.profilePhoto}
                style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 12,
                  backgroundColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={20} color={colors.textMuted} />
              </View>
            )}
          </Pressable>

          <Pressable
            className="flex-1"
            onPress={() => navigation.navigate("UserProfile", { userId: memory.userId })}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {memoryUser.displayName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              @{memoryUser.username}
            </Text>
          </Pressable>

          {/* Add Friend / Pending / Friends badge */}
          {!isOwnMemory && (
            isAlreadyFriend ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: colors.success + "20",
                }}
              >
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>
                  Friends
                </Text>
              </View>
            ) : hasPendingRequest ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "500" }}>
                  Requested
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => handleAddFriend(memory.userId)}
                disabled={isAdding}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isAdding ? colors.primary + "70" : colors.primary,
                }}
              >
                <Ionicons name="person-add-outline" size={13} color="white" style={{ marginRight: 4 }} />
                <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                  {isAdding ? "..." : "Add"}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* Tappable memory content */}
        <Pressable onPress={() => navigation.navigate("MemoryDetail", { memoryId: memory.id })}>
          {memory.coverPhoto && (
            <View style={{ height: 180, marginBottom: 12, borderRadius: 10, overflow: "hidden" }}>
              <Image
                source={memory.coverPhoto}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            </View>
          )}

          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
            {memory.title}
          </Text>

          <View className="flex-row items-center mb-1">
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 4 }}>
              {memory.location}
            </Text>
          </View>

          <View className="flex-row items-center mb-3">
            <Ionicons name="pricetag-outline" size={13} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 4 }}>
              {memory.category}
            </Text>
          </View>
        </Pressable>

        {/* Reactions row */}
        <View className="flex-row items-center justify-between mb-3">
          {!isOwnMemory ? (
            <View style={{ position: "relative", flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={() =>
                  setShowReactionPicker(showReactionPicker === memory.id ? null : memory.id)
                }
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
                  onPress={() => {
                    setReactionsModalMemoryId(memory.id);
                    setShowReactionsModal(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={{
                      color: hasAnyReaction ? colors.primary : colors.textSecondary,
                      marginLeft: 6,
                      fontWeight: "500",
                    }}
                  >
                    {totalReactions}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ color: colors.textSecondary, marginLeft: 6, fontWeight: "500" }}>
                  React
                </Text>
              )}

              {/* Reaction picker popup */}
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
                        backgroundColor:
                          userReaction?.type === reaction.type
                            ? colors.primary + "30"
                            : "transparent",
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
              <Text style={{ color: colors.textMuted, marginLeft: 6, fontWeight: "500" }}>
                {totalReactions > 0 ? `${totalReactions} reaction${totalReactions > 1 ? "s" : ""}` : "Your memory"}
              </Text>
            </View>
          )}

          {memory.price ? (
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              £{memory.price.toFixed(2)}
            </Text>
          ) : null}
        </View>

        {/* Comment button */}
        <Pressable
          onPress={() => handleOpenComments(memory.id)}
          style={{
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 6 }}>💬</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "500" }}>
            {commentCount > 0
              ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
              : "Add a comment"}
          </Text>
        </Pressable>
      </TickBoxCard>
    );
  };

  if (!user) return null;

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              Finding memories to explore...
            </Text>
          </View>
        ) : discoverMemories.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="compass-outline" size={56} color={colors.textMuted} />
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 }}
            >
              Nothing to discover yet
            </Text>
            <Text
              style={{ color: colors.textSecondary, textAlign: "center", lineHeight: 22 }}
            >
              As more people join and share memories, they'll appear here. Check back soon!
            </Text>
            <Pressable
              onPress={handleRefresh}
              style={{
                marginTop: 24,
                backgroundColor: colors.primary,
                paddingHorizontal: 28,
                paddingVertical: 12,
                borderRadius: 24,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Refresh</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={discoverMemories}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              <View className="mb-4">
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
                  Discover
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
                  Explore memories from the TickBox community
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Comments Modal */}
      {selectedMemoryId && (
        <CommentsModal
          visible={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedMemoryId(null);
          }}
          comments={
            (memories.find((m) => m.id === selectedMemoryId) ||
              discoverMemories.find((m) => m.id === selectedMemoryId))?.comments || []
          }
          onAddComment={handleSubmitComment}
          onDeleteComment={handleDeleteComment}
          onLikeComment={(commentId) =>
            user && selectedMemoryId && likeComment(selectedMemoryId, commentId, user.id, user.displayName)
          }
          onUnlikeComment={(commentId) =>
            user && selectedMemoryId && unlikeComment(selectedMemoryId, commentId, user.id)
          }
          onUserPress={(userId) => navigation.navigate("UserProfile", { userId })}
          currentUserId={user?.id}
          memoryTitle={
            (memories.find((m) => m.id === selectedMemoryId) ||
              discoverMemories.find((m) => m.id === selectedMemoryId))?.title || ""
          }
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
          reactions={
            (memories.find((m) => m.id === reactionsModalMemoryId) ||
              discoverMemories.find((m) => m.id === reactionsModalMemoryId))?.reactions || []
          }
          legacyLikes={
            (memories.find((m) => m.id === reactionsModalMemoryId) ||
              discoverMemories.find((m) => m.id === reactionsModalMemoryId))?.likes || []
          }
        />
      )}
    </>
  );
}
