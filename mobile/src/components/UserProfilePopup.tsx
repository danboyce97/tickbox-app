import React, { useState } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendStore } from "../state/friendStore";
import { useUserStore } from "../state/userStore";
import ImageViewerModal from "./ImageViewerModal";

interface UserProfilePopupProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userPhoto?: string;
}

export default function UserProfilePopup({
  visible,
  onClose,
  userId,
  userName,
  userPhoto,
}: UserProfilePopupProps) {
  const { colors } = useTheme();
  const currentUser = useUserStore((state) => state.user);
  const friends = useFriendStore((state) => state.friends);
  const addFriend = useFriendStore((state) => state.addFriend);
  const sendFriendRequest = useFriendStore((state) => state.sendFriendRequest);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  const isFriend = friends.some((f) => f.id === userId);
  const isCurrentUser = currentUser?.id === userId;

  const handleAddFriend = async () => {
    if (!currentUser || isFriend || isCurrentUser || isAddingFriend) return;

    setIsAddingFriend(true);
    try {
      // Check if target user is public or private
      const targetUser = useUserStore.getState().registeredUsers.find(u => u.id === userId);

      if (targetUser) {
        if (!targetUser.isPrivate) {
          // Public profile - add as friend immediately
          const friendObject = {
            id: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.displayName,
            profilePhoto: targetUser.profilePhoto,
            bio: targetUser.bio,
            location: targetUser.location,
            isPublic: !targetUser.isPrivate,
            joinDate: targetUser.joinDate,
          };
          await addFriend(friendObject, currentUser.id, userId);
        } else {
          // Private profile - send friend request
          await sendFriendRequest(currentUser.id, userId);
        }
      }

      onClose();
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setIsAddingFriend(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            width: "85%",
            maxWidth: 320,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>

          {/* Profile Photo */}
          <View style={{ alignItems: "center", marginBottom: 16, marginTop: 8 }}>
            {userPhoto ? (
              <Pressable onPress={() => setShowPhotoViewer(true)}>
                <Image
                  source={userPhoto}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                {/* Small expand icon overlay */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="expand-outline" size={14} color="white" />
                </View>
              </Pressable>
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={36} color={colors.textMuted} />
              </View>
            )}
          </View>

          {/* User Name */}
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {userName}
          </Text>

          {/* Action Button */}
          {!isCurrentUser && (
            <Pressable
              onPress={isFriend ? undefined : handleAddFriend}
              disabled={isFriend || isAddingFriend}
              style={{
                backgroundColor: isFriend ? colors.border : isAddingFriend ? colors.primary + '80' : colors.primary,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: isAddingFriend ? 0.7 : 1,
              }}
            >
              {isAddingFriend ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={isFriend ? "checkmark-circle" : "person-add"}
                  size={20}
                  color={isFriend ? colors.textSecondary : "white"}
                />
              )}
              <Text
                style={{
                  color: isFriend ? colors.textSecondary : "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {isFriend ? "Friends" : isAddingFriend ? "Adding..." : "Add Friend"}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>

      {/* Photo Viewer Modal */}
      {userPhoto && (
        <ImageViewerModal
          visible={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
          images={[userPhoto]}
          title={`${userName}'s Photo`}
        />
      )}
    </Modal>
  );
}
