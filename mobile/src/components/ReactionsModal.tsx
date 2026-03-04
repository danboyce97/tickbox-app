import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendStore } from "../state/friendStore";
import { useUserStore } from "../state/userStore";
import { ReactionType, Reaction } from "../state/memoryStore";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ReactionsModalProps {
  visible: boolean;
  onClose: () => void;
  reactions: Reaction[];
  legacyLikes: string[]; // Array of user IDs from old likes system
}

interface UserReaction {
  userId: string;
  userName: string;
  userPhoto?: string;
  reactionType: ReactionType | "like";
  reactionEmoji: string;
}

const reactionEmojiMap: Record<ReactionType | "like", string> = {
  heart: "❤️",
  fire: "🔥",
  celebrate: "🎉",
  love: "😍",
  like: "❤️", // Legacy likes shown as heart
};

export default function ReactionsModal({
  visible,
  onClose,
  reactions,
  legacyLikes,
}: ReactionsModalProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const friends = useFriendStore((state) => state.friends);
  const getUserById = useFriendStore((state) => state.getUserById);
  const currentUser = useUserStore((state) => state.user);

  const [userReactions, setUserReactions] = useState<UserReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<ReactionType | "like" | "all">("all");

  // Fetch user details for all reactions
  useEffect(() => {
    if (!visible) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      const reactionsList: UserReaction[] = [];

      // Process new reactions
      for (const reaction of reactions) {
        let userName = "Unknown User";
        let userPhoto: string | undefined;

        // Check if it's the current user
        if (currentUser && reaction.userId === currentUser.id) {
          userName = "You";
          userPhoto = currentUser.profilePhoto;
        } else {
          // Check friends first
          const friend = friends.find((f) => f.id === reaction.userId);
          if (friend) {
            userName = friend.displayName;
            userPhoto = friend.profilePhoto;
          } else {
            // Fetch from Firebase
            const userData = await getUserById(reaction.userId);
            if (userData) {
              userName = userData.displayName;
              userPhoto = userData.profilePhoto;
            }
          }
        }

        reactionsList.push({
          userId: reaction.userId,
          userName,
          userPhoto,
          reactionType: reaction.type,
          reactionEmoji: reactionEmojiMap[reaction.type],
        });
      }

      // Process legacy likes (users not in reactions)
      const reactedUserIds = new Set(reactions.map((r) => r.userId));
      for (const likeUserId of legacyLikes) {
        if (reactedUserIds.has(likeUserId)) continue; // Skip if already in reactions

        let userName = "Unknown User";
        let userPhoto: string | undefined;

        if (currentUser && likeUserId === currentUser.id) {
          userName = "You";
          userPhoto = currentUser.profilePhoto;
        } else {
          const friend = friends.find((f) => f.id === likeUserId);
          if (friend) {
            userName = friend.displayName;
            userPhoto = friend.profilePhoto;
          } else {
            const userData = await getUserById(likeUserId);
            if (userData) {
              userName = userData.displayName;
              userPhoto = userData.profilePhoto;
            }
          }
        }

        reactionsList.push({
          userId: likeUserId,
          userName,
          userPhoto,
          reactionType: "like",
          reactionEmoji: reactionEmojiMap.like,
        });
      }

      setUserReactions(reactionsList);
      setIsLoading(false);
    };

    fetchUsers();
  }, [visible, reactions, legacyLikes, friends, currentUser]);

  // Get unique reaction types for filter tabs
  const getReactionCounts = () => {
    const counts: Record<string, number> = { all: userReactions.length };
    userReactions.forEach((r) => {
      const key = r.reactionType;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  };

  const reactionCounts = getReactionCounts();

  // Filter reactions based on selected filter
  const filteredReactions =
    selectedFilter === "all"
      ? userReactions
      : userReactions.filter((r) => r.reactionType === selectedFilter);

  const handleUserPress = (userId: string) => {
    onClose();
    // Small delay to allow modal to close smoothly
    setTimeout(() => {
      navigation.navigate("UserProfile", { userId });
    }, 200);
  };

  // Get filter options (only show reactions that exist)
  const filterOptions: Array<{ key: ReactionType | "like" | "all"; emoji: string; label: string }> = [
    { key: "all", emoji: "", label: "All" },
  ];

  if (reactionCounts.heart) {
    filterOptions.push({ key: "heart", emoji: "❤️", label: "" });
  }
  if (reactionCounts.fire) {
    filterOptions.push({ key: "fire", emoji: "🔥", label: "" });
  }
  if (reactionCounts.celebrate) {
    filterOptions.push({ key: "celebrate", emoji: "🎉", label: "" });
  }
  if (reactionCounts.love) {
    filterOptions.push({ key: "love", emoji: "😍", label: "" });
  }
  if (reactionCounts.like) {
    filterOptions.push({ key: "like", emoji: "❤️", label: "" });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "70%",
            minHeight: 300,
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
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Reactions
            </Text>
          </View>

          {/* Filter Tabs */}
          {filterOptions.length > 2 && (
            <View
              style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 8,
                gap: 16,
              }}
            >
              {filterOptions.map((option) => {
                const isSelected = selectedFilter === option.key;
                const count = reactionCounts[option.key] || 0;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setSelectedFilter(option.key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingBottom: 4,
                      borderBottomWidth: isSelected ? 2 : 0,
                      borderBottomColor: colors.primary,
                    }}
                  >
                    {option.emoji ? (
                      <Text style={{ fontSize: 14 }}>
                        {option.emoji}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        color: isSelected ? colors.text : colors.textSecondary,
                        fontWeight: isSelected ? "600" : "400",
                        fontSize: 14,
                        marginLeft: option.emoji ? 4 : 0,
                      }}
                    >
                      {option.label || ""}{count > 0 ? (option.label ? ` ${count}` : count) : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Reactions List */}
          {isLoading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                Loading reactions...
              </Text>
            </View>
          ) : filteredReactions.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
              }}
            >
              <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "500",
                  marginTop: 12,
                }}
              >
                No reactions yet
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredReactions.map((reaction, index) => (
                <Pressable
                  key={`${reaction.userId}-${index}`}
                  onPress={() => handleUserPress(reaction.userId)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  {/* Profile Photo */}
                  <View style={{ position: "relative" }}>
                    {reaction.userPhoto ? (
                      <Image
                        source={reaction.userPhoto}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="person" size={20} color={colors.textMuted} />
                      </View>
                    )}
                    {/* Reaction Emoji Badge */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -4,
                        backgroundColor: colors.cardBackground,
                        borderRadius: 10,
                        padding: 1,
                        borderWidth: 1.5,
                        borderColor: colors.cardBackground,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{reaction.reactionEmoji}</Text>
                    </View>
                  </View>

                  {/* User Name */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      {reaction.userName}
                    </Text>
                  </View>

                  {/* Arrow indicator */}
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Bottom Safe Area */}
          <View style={{ height: 34 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
