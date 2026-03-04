import React, { useState, useRef, useEffect } from "react";
import { View, Text, Modal, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { Comment } from "../state/memoryStore";

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (text: string, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onLikeComment: (commentId: string) => void;
  onUnlikeComment: (commentId: string) => void;
  onUserPress: (userId: string, userName: string, userPhoto?: string) => void;
  currentUserId?: string;
  memoryTitle: string;
}

export default function CommentsModal({
  visible,
  onClose,
  comments,
  onAddComment,
  onDeleteComment,
  onLikeComment,
  onUnlikeComment,
  onUserPress,
  currentUserId,
  memoryTitle,
}: CommentsModalProps) {
  const { colors } = useTheme();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSubmit = () => {
    if (!commentText.trim()) return;

    onAddComment(commentText.trim(), replyingTo?.id);
    setCommentText("");
    setReplyingTo(null);
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Optimistically hide the comment immediately
            setDeletingCommentIds(prev => new Set(prev).add(commentId));
            // Then actually delete it
            onDeleteComment(commentId);
          },
        },
      ]
    );
  };

  const handleToggleLike = (commentId: string, isCurrentlyLiked: boolean) => {
    // Call the actual like/unlike function - store handles optimistic updates
    if (isCurrentlyLiked) {
      onUnlikeComment(commentId);
    } else {
      onLikeComment(commentId);
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    // Don't render if this comment is being deleted
    if (deletingCommentIds.has(comment.id)) return null;

    // Use store state directly for like status
    const commentLikes = comment.likes || [];
    const isLiked = currentUserId ? commentLikes.includes(currentUserId) : false;
    const likeCount = commentLikes.length;

    return (
      <View key={comment.id} style={{ marginLeft: isReply ? 40 : 0, marginBottom: 16 }}>
      <View className="flex-row">
        <Pressable
          onPress={() => onUserPress(comment.userId, comment.userName, comment.userPhoto)}
        >
          {comment.userPhoto ? (
            <Image
              source={comment.userPhoto}
              style={{
                width: isReply ? 28 : 36,
                height: isReply ? 28 : 36,
                borderRadius: isReply ? 14 : 18,
                marginRight: 10,
              }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={{
                width: isReply ? 28 : 36,
                height: isReply ? 28 : 36,
                borderRadius: isReply ? 14 : 18,
                backgroundColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="person" size={isReply ? 14 : 18} color={colors.textMuted} />
            </View>
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => onUserPress(comment.userId, comment.userName, comment.userPhoto)}
            >
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14, marginBottom: 4 }}>
                {comment.userName}
              </Text>
            </Pressable>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 20 }}>
              {comment.text}
            </Text>
          </View>

          <View className="flex-row items-center" style={{ marginTop: 6, marginLeft: 12 }}>
            {/* Like button - available for all comments except your own */}
            {comment.userId !== currentUserId && (
              <>
                <Pressable
                  onPress={() => handleToggleLike(comment.id, isLiked)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 14 }}>{isLiked ? "👍" : "👍🏻"}</Text>
                  {likeCount > 0 && (
                    <Text style={{ color: isLiked ? colors.primary : colors.textMuted, fontSize: 12, marginLeft: 2, fontWeight: "500" }}>
                      {likeCount}
                    </Text>
                  )}
                </Pressable>
              </>
            )}
            {/* Show like count for own comments (non-interactive) */}
            {comment.userId === currentUserId && likeCount > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 14 }}>👍</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 2 }}>
                  {likeCount}
                </Text>
              </View>
            )}
            {!isReply && (
              <>
                <Text style={{ color: colors.textMuted, marginHorizontal: 8 }}>•</Text>
                <Pressable
                  onPress={() => setReplyingTo({ id: comment.id, name: comment.userName })}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                    Reply
                  </Text>
                </Pressable>
              </>
            )}
            {comment.userId === currentUserId && (
              <>
                <Text style={{ color: colors.textMuted, marginHorizontal: 8 }}>•</Text>
                <Pressable onPress={() => handleDeleteComment(comment.id)}>
                  <Text style={{ color: colors.error, fontSize: 13, fontWeight: "600" }}>
                    Delete
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Render replies */}
          {comment.replies && comment.replies.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {comment.replies.map((reply) => renderComment(reply, true))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
              Comments
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
              {memoryTitle}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Comments List */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {comments.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="chatbubble-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
                No comments yet
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                Be the first to comment!
              </Text>
            </View>
          ) : (
            <View>{comments.map((comment) => renderComment(comment))}</View>
          )}
        </ScrollView>

        {/* Input Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: Platform.OS === "ios" ? Math.max(34, keyboardHeight > 0 ? 12 : 34) : 12,
            marginBottom: Platform.OS === "ios" ? keyboardHeight : 0,
          }}
        >
          {replyingTo && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.background,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="arrow-undo" size={14} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 6 }}>
                  Replying to <Text style={{ fontWeight: "600", color: colors.text }}>{replyingTo.name}</Text>
                </Text>
              </View>
              <Pressable onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          <View className="flex-row items-center">
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 10,
                color: colors.text,
                fontSize: 15,
                marginRight: 10,
                maxHeight: 100,
              }}
              multiline
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={!commentText.trim()}
              style={{
                backgroundColor: commentText.trim() ? colors.primary : colors.border,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="send" size={18} color={commentText.trim() ? "white" : colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
