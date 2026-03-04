import React, { useLayoutEffect, useState, useRef, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, Modal, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp as NavigationRouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useMemoryStore } from "../state/memoryStore";
import { useUserStore } from "../state/userStore";
import { useFriendStore } from "../state/friendStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useTheme } from "../contexts/ThemeContext";
import TabView from "../components/TabView";
import DigitalTicket from "../components/DigitalTicket";
import ImageViewerModal from "../components/ImageViewerModal";
import ShareableMemoryCard from "../components/ShareableMemoryCard";
import CommentsModal from "../components/CommentsModal";
import UserProfilePopup from "../components/UserProfilePopup";
import ReactionsModal from "../components/ReactionsModal";

type RouteParamProp = NavigationRouteProp<RootStackParamList, "MemoryDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MemoryDetail">;

// Video Player Component for individual videos
function VideoPlayerItem({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
  });

  return (
    <View style={{ width: 120, height: 120, borderRadius: 8, overflow: "hidden" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

export default function MemoryDetailScreen() {
  const route = useRoute<RouteParamProp>();
  const navigation = useNavigation<NavigationProp>();
  const { memoryId } = route.params;
  const { colors } = useTheme();

  // Image viewer state - must be before any early returns
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<Array<{ uri: string; type: "image" | "video" }>>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerTitle, setViewerTitle] = useState("");

  // Share modal state
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const shareCardRef = useRef<View>(null);

  const memories = useMemoryStore((state) => state.memories);
  const addReaction = useMemoryStore((state) => state.addReaction);
  const removeReaction = useMemoryStore((state) => state.removeReaction);
  const unlikeMemory = useMemoryStore((state) => state.unlikeMemory);
  const deleteMemory = useMemoryStore((state) => state.deleteMemory);
  const addComment = useMemoryStore((state) => state.addComment);
  const deleteComment = useMemoryStore((state) => state.deleteComment);
  const likeComment = useMemoryStore((state) => state.likeComment);
  const unlikeComment = useMemoryStore((state) => state.unlikeComment);
  const refreshMemory = useMemoryStore((state) => state.refreshMemory);
  const subscribeToMemory = useMemoryStore((state) => state.subscribeToMemory);
  const unsubscribeFromMemory = useMemoryStore((state) => state.unsubscribeFromMemory);
  const user = useUserStore((state) => state.user);
  const friends = useFriendStore((state) => state.friends);

  const memory = memories.find((m) => m.id === memoryId);

  // Comments modal state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  // User profile popup state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [selectedUserPhoto, setSelectedUserPhoto] = useState<string | undefined>(undefined);
  const [showUserPopup, setShowUserPopup] = useState(false);
  // Loading state for when memory needs to be fetched from Firebase
  const [isLoading, setIsLoading] = useState(!memory);
  // Reactions modal state
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  // Subscribe to real-time updates for this memory
  useEffect(() => {
    if (memoryId) {
      // Initial load
      setIsLoading(true);
      refreshMemory(memoryId).finally(() => {
        setIsLoading(false);
      });

      // Set up real-time subscription for likes/reactions updates
      const unsubscribe = subscribeToMemory(memoryId);

      // Cleanup on unmount
      return () => {
        unsubscribeFromMemory(memoryId);
      };
    }
  }, [memoryId]);

  // Share functionality
  const handleShare = useCallback(() => {
    setIsShareModalVisible(true);
  }, []);

  const generateAndShareImage = useCallback(async () => {
    if (!shareCardRef.current || !memory) return;

    setIsGeneratingShare(true);

    try {
      // Capture the shareable card as an image
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `Share ${memory.title}`,
          UTI: "public.png",
        });
      } else {
        Alert.alert("Sharing not available", "Sharing is not available on this device");
      }

      setIsShareModalVisible(false);
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Failed to generate shareable image");
    } finally {
      setIsGeneratingShare(false);
    }
  }, [memory]);

  // Set header title and buttons dynamically - must be before early return
  useLayoutEffect(() => {
    if (memory && user) {
      const isOwner = memory.userId === user.id;

      navigation.setOptions({
        title: memory.title,
        headerRight: () => (
          <View className="flex-row items-center">
            {/* Share button - always visible */}
            <Pressable
              onPress={handleShare}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="share-outline" size={24} color="#dc808b" />
            </Pressable>

            {/* Edit button - only for owner */}
            {isOwner && (
              <Pressable
                onPress={() => {
                  navigation.navigate("CreateMemory", {
                    mode: "edit",
                    memoryId: memory.id
                  });
                }}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="create-outline" size={24} color="#dc808b" />
              </Pressable>
            )}

            {/* Delete button - only for owner */}
            {isOwner && (
              <Pressable
                onPress={handleDelete}
                style={{ marginRight: 8 }}
              >
                <Ionicons name="trash-outline" size={24} color="#dc808b" />
              </Pressable>
            )}
          </View>
        ),
      });
    }
  }, [memory, user, navigation]);

  if (!memory) {
    // Show loading state if we're still fetching from Firebase
    if (isLoading) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#dc808b" />
            <Text style={{ color: colors.textSecondary, marginTop: 16 }} className="text-base">
              Loading memory...
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }} className="text-xl">
            Memory not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if user has reacted (either via likes array or reactions array)
  const hasLiked = user ? memory.likes.includes(user.id) : false;
  const userReaction = user ? memory.reactions?.find(r => r.userId === user.id) : null;
  const hasReacted = hasLiked || !!userReaction;

  // Use store state directly - real-time subscription keeps this in sync
  const isLiked = hasReacted;

  // Count unique users who have interacted (either legacy like OR reaction, not both)
  // This prevents double counting when a user has both a legacy like and a reaction
  const reactorUserIds = new Set<string>();
  (memory.reactions || []).forEach((r: { userId: string }) => {
    reactorUserIds.add(r.userId);
  });
  (memory.likes || []).forEach((userId: string) => {
    reactorUserIds.add(userId);
  });
  const likeCount = reactorUserIds.size;

  const isOwner = user && memory.userId === user.id;
  const commentCount = memory.comments?.length || 0;

  const handleLike = () => {
    if (!user) return;
    // Don't allow liking own memory
    if (memory.userId === user.id) return;

    if (isLiked) {
      // Remove both legacy like and reaction if they exist
      if (hasLiked) {
        unlikeMemory(memory.id, user.id);
      }
      if (userReaction) {
        removeReaction(memory.id, user.id);
      }
    } else {
      addReaction(memory.id, user.id, "heart");
    }
  };

  const handleOpenComments = async () => {
    setShowCommentsModal(true);
    // Refresh memory to get latest comments
    await refreshMemory(memoryId);
  };

  const handleSubmitComment = async (text: string, parentId?: string) => {
    if (!user || !memory) return;
    await addComment(
      memory.id,
      user.id,
      user.displayName,
      user.profilePhoto,
      text,
      parentId
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !memory) return;
    await deleteComment(memory.id, commentId, user.id);
  };

  const handleLikeComment = (commentId: string) => {
    if (!user || !memory) return;
    likeComment(memory.id, commentId, user.id, user.displayName);
  };

  const handleUnlikeComment = (commentId: string) => {
    if (!user || !memory) return;
    unlikeComment(memory.id, commentId, user.id);
  };

  const handleUserPress = (userId: string, userName: string, userPhoto?: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSelectedUserPhoto(userPhoto);
    setShowUserPopup(true);
  };

  const openImageViewer = (images: string[], initialIndex: number = 0, title: string = "Image Viewer") => {
    setViewerMedia(images.map(uri => ({ uri, type: "image" as const })));
    setViewerInitialIndex(initialIndex);
    setViewerTitle(title);
    setIsImageViewerVisible(true);
  };

  const openMediaViewer = (media: Array<{ uri: string; type: "image" | "video" }>, initialIndex: number = 0, title: string = "Media") => {
    setViewerMedia(media);
    setViewerInitialIndex(initialIndex);
    setViewerTitle(title);
    setIsImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setIsImageViewerVisible(false);
    setViewerMedia([]);
    setViewerInitialIndex(0);
    setViewerTitle("");
  };

  const handleDelete = () => {
    if (!isOwner) return;
    
    Alert.alert(
      "Delete Memory",
      "Are you sure you want to delete this memory? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteMemory(memory.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  // Event Details Tab Content
  const eventTabContent = (
    <ScrollView className="flex-1">
      {/* Cover Photo */}
      {memory.coverPhoto ? (
        <Pressable
          onPress={() => openImageViewer([memory.coverPhoto!], 0, `${memory.title} - Cover Photo`)}
          style={{ height: 280, backgroundColor: colors.border }}
        >
          <Image
            source={{ uri: memory.coverPhoto }}
            style={{ width: "100%", height: "100%", backgroundColor: colors.border }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
            onError={(e) => console.log('❌ Cover photo load error:', memory.coverPhoto, e)}
          />
        </Pressable>
      ) : (
        <View style={{ height: 280, backgroundColor: colors.border }} className="items-center justify-center">
          <Ionicons name="image-outline" size={64} color={colors.textMuted} />
        </View>
      )}

      <View className="px-6 pt-6">
        {/* Event Title and Location */}
        <View className="bg-white rounded-2xl p-6 mb-4" style={{ backgroundColor: colors.surface }}>
          <Text style={{ color: colors.text }} className="text-2xl font-bold text-center mb-4">
            {memory.title}
          </Text>
          <View className="flex-row items-center justify-center mb-4">
            <Ionicons name="location" size={20} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }} className="ml-2 text-center text-lg">
              {memory.location}
            </Text>
          </View>

          {/* Date, Time, and Price Row */}
          <View className="flex-row justify-around pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <View className="items-center flex-1">
              <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1">
                DATE
              </Text>
              <Text style={{ color: colors.text }} className="text-lg font-bold">
                {new Date(memory.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </Text>
            </View>
            
            {memory.time && (
              <View className="items-center flex-1">
                <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1">
                  TIME
                </Text>
                <Text style={{ color: colors.text }} className="text-lg font-bold">
                  {memory.time}
                </Text>
              </View>
            )}

            {/* Price */}
            {memory.price && (
              <View className="items-center flex-1">
                <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mb-1">
                  PRICE
                </Text>
                <Text style={{ color: "#dc808b" }} className="text-lg font-bold">
                  {memory.currency === "GBP" ? "£" : memory.currency === "USD" ? "$" : "€"}{memory.price.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {memory.description && (
          <View className="bg-white rounded-2xl p-6 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
              <Text style={{ color: colors.text }} className="text-lg font-semibold ml-2">
                Description
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary }} className="leading-6">
              {memory.description}
            </Text>
          </View>
        )}

        {/* Memory Media (Photos & Videos Combined) */}
        {((memory.memoryPhotos && memory.memoryPhotos.length > 0) || (memory.memoryVideos && memory.memoryVideos.length > 0)) && (() => {
          // Combine photos and videos into a single media array
          const allMedia: Array<{ uri: string; type: "image" | "video" }> = [
            ...(memory.memoryPhotos?.map(uri => ({ uri, type: "image" as const })) || []),
            ...(memory.memoryVideos?.map(uri => ({ uri, type: "video" as const })) || [])
          ];

          // Debug logging
          console.log('📸 MemoryDetail - memoryPhotos:', memory.memoryPhotos);
          console.log('🎬 MemoryDetail - memoryVideos:', memory.memoryVideos);
          console.log('📷 MemoryDetail - coverPhoto:', memory.coverPhoto);

          return (
            <View className="bg-white rounded-2xl p-6 mb-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center mb-3">
                <Ionicons name="images" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.text }} className="text-lg font-semibold ml-2">
                  Media
                </Text>
                <Text style={{ color: colors.textMuted, marginLeft: 8 }} className="text-sm">
                  {allMedia.length} items
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {/* Photos */}
                  {memory.memoryPhotos?.map((photo, index) => (
                    <Pressable
                      key={`photo-${index}`}
                      className="mr-3"
                      onPress={() => openMediaViewer(allMedia, index, `${memory.title} - Media`)}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={{ width: 120, height: 120, borderRadius: 8, backgroundColor: colors.border }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={300}
                        onError={(e) => console.log('❌ Image load error:', photo, e)}
                      />
                    </Pressable>
                  ))}
                  {/* Videos */}
                  {memory.memoryVideos?.map((videoUri, index) => {
                    const mediaIndex = (memory.memoryPhotos?.length || 0) + index;
                    return (
                      <Pressable
                        key={`video-${index}`}
                        className="mr-3"
                        onPress={() => openMediaViewer(allMedia, mediaIndex, `${memory.title} - Media`)}
                      >
                        <View style={{ width: 120, height: 120, borderRadius: 8, overflow: "hidden", position: "relative" }}>
                          <VideoPlayerItem videoUri={videoUri} />
                          {/* Video indicator overlay */}
                          <View style={{
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2
                          }}>
                            <Ionicons name="play" size={14} color="white" />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          );
        })()}

        {/* Likes and Comments Section */}
        <View className="bg-white rounded-2xl p-6 mb-4" style={{ backgroundColor: colors.surface }}>
          {/* Like Button Row */}
          <View className="flex-row items-center justify-between mb-4">
            {memory.userId !== user?.id ? (
              <View className="flex-row items-center">
                <Pressable
                  onPress={handleLike}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={isLiked ? "#FF3B30" : colors.textSecondary}
                  />
                </Pressable>
                {likeCount > 0 ? (
                  <Pressable
                    onPress={() => setShowReactionsModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{
                      color: isLiked ? "#FF3B30" : colors.textSecondary,
                      marginLeft: 8,
                      fontWeight: "600",
                      fontSize: 16
                    }}>
                      {`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{
                    color: colors.textSecondary,
                    marginLeft: 8,
                    fontWeight: "600",
                    fontSize: 16
                  }}>
                    Like
                  </Text>
                )}
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="heart-outline"
                  size={24}
                  color={colors.textMuted}
                />
                {likeCount > 0 ? (
                  <Pressable
                    onPress={() => setShowReactionsModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{
                      color: colors.textMuted,
                      marginLeft: 8,
                      fontWeight: "600",
                      fontSize: 16
                    }}>
                      {`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{
                    color: colors.textMuted,
                    marginLeft: 8,
                    fontWeight: "600",
                    fontSize: 16
                  }}>
                    No likes yet
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Comment Button */}
          <Pressable
            onPress={handleOpenComments}
            style={{
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ fontSize: 18, marginRight: 8 }}>💬</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: "500" }}>
              {commentCount > 0
                ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
                : "Add a comment"}
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  // Ticket Tab Content
  const ticketTabContent = (
    <View className="flex-1">
      {memory.type === "uploaded" && memory.uploadedImage ? (
        // Show uploaded ticket image
        <Pressable
          className="p-4"
          onPress={() => openImageViewer([memory.uploadedImage!], 0, `${memory.title} - Ticket`)}
        >
          <Image
            source={{ uri: memory.uploadedImage }}
            style={{ width: "100%", height: 500 }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
          />
        </Pressable>
      ) : (
        // Show digital ticket
        <DigitalTicket memory={memory} />
      )}
    </View>
  );

  // Only show ticket tab if user is the owner (privacy protection)
  const tabs: Array<{
    key: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    content: React.ReactNode;
  }> = [
    { key: "event", title: "Event", icon: "calendar", content: eventTabContent },
  ];

  if (isOwner) {
    tabs.push({ key: "ticket", title: "Ticket", icon: "ticket", content: ticketTabContent });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TabView
        tabs={tabs}
        initialTab="event"
      />

      <ImageViewerModal
        visible={isImageViewerVisible}
        onClose={closeImageViewer}
        media={viewerMedia}
        initialIndex={viewerInitialIndex}
        title={viewerTitle}
      />

      {/* Share Modal */}
      <Modal
        visible={isShareModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          {/* Close Button */}
          <Pressable
            onPress={() => setIsShareModalVisible(false)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>

          {/* Shareable Card Preview */}
          <View style={{ marginBottom: 24 }}>
            <ShareableMemoryCard ref={shareCardRef} memory={memory} />
          </View>

          {/* Share Button */}
          <Pressable
            onPress={generateAndShareImage}
            disabled={isGeneratingShare}
            style={{
              backgroundColor: "#dc808b",
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: 30,
              flexDirection: "row",
              alignItems: "center",
              opacity: isGeneratingShare ? 0.7 : 1,
            }}
          >
            {isGeneratingShare ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: "white", fontSize: 17, fontWeight: "600", marginLeft: 10 }}>
                  Generating...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="share-outline" size={22} color="white" />
                <Text style={{ color: "white", fontSize: 17, fontWeight: "600", marginLeft: 10 }}>
                  Share Memory
                </Text>
              </>
            )}
          </Pressable>

          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 16, textAlign: "center" }}>
            Share this beautiful card to Instagram, Messages, or anywhere else
          </Text>
        </View>
      </Modal>

      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        comments={memory?.comments || []}
        onAddComment={handleSubmitComment}
        onDeleteComment={handleDeleteComment}
        onLikeComment={handleLikeComment}
        onUnlikeComment={handleUnlikeComment}
        onUserPress={handleUserPress}
        currentUserId={user?.id}
        memoryTitle={memory?.title || ""}
      />

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

      {/* Reactions Modal */}
      <ReactionsModal
        visible={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        reactions={memory?.reactions || []}
        legacyLikes={memory?.likes || []}
      />
    </SafeAreaView>
  );
}
