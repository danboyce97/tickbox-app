import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useFriendStore } from "../state/friendStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import ImageViewerModal from "../components/ImageViewerModal";
import { RootStackParamList } from "../navigation/AppNavigator";
import * as FirebaseService from "../services/firebase";
import { Memory } from "../state/memoryStore";
import { getCurrencySymbol } from "../utils/currencies";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserProfileRouteProp = RouteProp<RootStackParamList, "UserProfile">;

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
  bio?: string;
  location?: string;
  joinDate: string;
  isPrivate?: boolean;
  showLocation?: boolean;
  preferredCurrency?: string;
}

export default function UserProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<UserProfileRouteProp>();
  const { colors } = useTheme();
  const currentUser = useUserStore((state) => state.user);
  const friends = useFriendStore((state) => state.friends);
  const sendFriendRequest = useFriendStore((state) => state.sendFriendRequest);
  const friendRequests = useFriendStore((state) => state.friendRequests);
  const removeFriend = useFriendStore((state) => state.removeFriend);

  const { userId } = route.params;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // Check friendship status
  const isFriend = friends.some(f => f.id === userId);
  const hasPendingRequest = friendRequests.some(
    req => req.fromUserId === currentUser?.id && req.toUserId === userId && req.status === "pending"
  );

  // Check if profile is private and not a friend
  const isPrivateAndNotFriend = userProfile?.isPrivate && !isFriend && currentUser?.id !== userId;

  // Load user profile and memories
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Load user profile
        const userData = await FirebaseService.getUserDocument(userId);
        if (userData) {
          setUserProfile({
            id: userData.id,
            username: userData.username,
            displayName: userData.displayName,
            profilePhoto: userData.profilePhoto,
            bio: userData.bio,
            location: userData.location,
            joinDate: userData.joinDate,
            isPrivate: userData.isPrivate,
            showLocation: userData.showLocation,
            preferredCurrency: userData.preferredCurrency,
          });

          // Only load memories if not private or if user is a friend
          const shouldLoadMemories = !userData.isPrivate || friends.some(f => f.id === userId) || currentUser?.id === userId;
          if (shouldLoadMemories) {
            // Load user's public memories
            const userMemories = await FirebaseService.getUserPublicMemories(userId);
            // Store unsorted memories - sorting will be done in useMemo
            setMemories(userMemories);
          } else {
            setMemories([]);
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [userId, isFriend]);

  // Get unique categories from memories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(memories.map(m => m.category)));
    return ["All", ...uniqueCategories];
  }, [memories]);

  // Filter and sort memories
  const filteredMemories = useMemo(() => {
    let result = selectedCategory === "All"
      ? [...memories]
      : memories.filter(m => m.category === selectedCategory);

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [memories, selectedCategory, sortOrder]);

  // Calculate stats
  const totalMemories = memories.length;
  const totalSpent = useMemo(() => {
    return memories.reduce((sum, memory) => sum + (memory.price || 0), 0);
  }, [memories]);
  const topCategory = useMemo(() => {
    if (memories.length === 0) return "None";
    const categoryCount = memories.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0]?.[0] || "None";
  }, [memories]);

  const handleAddFriend = async () => {
    console.log('🔵 UserProfile: Add Friend button pressed for userId:', userId);
    console.log('   - currentUser:', currentUser?.id);
    console.log('   - isAddingFriend:', isAddingFriend);
    console.log('   - isFriend:', isFriend);
    console.log('   - hasPendingRequest:', hasPendingRequest);

    if (!currentUser || isAddingFriend) {
      console.log('⚠️ Blocked: no currentUser or already adding');
      return;
    }
    setIsAddingFriend(true);
    try {
      console.log('📤 Calling sendFriendRequest with:', currentUser.id, userId);
      await sendFriendRequest(currentUser.id, userId);
      console.log('✅ sendFriendRequest completed');
    } catch (error) {
      console.error('❌ sendFriendRequest error:', error);
    } finally {
      setIsAddingFriend(false);
      console.log('🔄 Loading state cleared');
    }
  };

  const handleRemoveFriend = () => {
    removeFriend(userId);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="person-outline" size={64} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "600", marginTop: 16 }}>
            User Not Found
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
            This user may have deleted their account or doesn't exist.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
              marginTop: 24,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center py-8 px-6">
          {/* Profile Photo */}
          <Pressable
            onPress={() => userProfile.profilePhoto && setShowProfilePhotoModal(true)}
            className="mb-4"
          >
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.border, overflow: "hidden" }}>
              {userProfile.profilePhoto ? (
                <Image
                  source={userProfile.profilePhoto}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="person" size={48} color={colors.textMuted} />
                </View>
              )}
            </View>
          </Pressable>

          {/* Name and Username */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "bold" }}>
              {userProfile.displayName}
            </Text>
            {userProfile.isPrivate && (
              <View style={{ marginLeft: 8, backgroundColor: colors.border, borderRadius: 12, padding: 4 }}>
                <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
              </View>
            )}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 12 }}>
            @{userProfile.username}
          </Text>

          {/* Bio - only show for public accounts or friends */}
          {userProfile.bio && (!userProfile.isPrivate || isFriend || currentUser?.id === userId) && (
            <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: "center", marginBottom: 16, paddingHorizontal: 20 }}>
              {userProfile.bio}
            </Text>
          )}

          {/* Location and Join Date */}
          <View className="flex-row items-center justify-center mb-6">
            {userProfile.location && (userProfile.showLocation !== false) && (!userProfile.isPrivate || isFriend || currentUser?.id === userId) && (
              <>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginLeft: 6 }}>
                  {userProfile.location}
                </Text>
                <View style={{ width: 32 }} />
              </>
            )}
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginLeft: 6 }}>
              Joined {new Date(userProfile.joinDate).toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit"
              })}
            </Text>
          </View>

          {/* Friend Action Button */}
          {currentUser?.id !== userId && (
            <View className="flex-row">
              {isFriend ? (
                <Pressable
                  onPress={handleRemoveFriend}
                  style={{
                    backgroundColor: colors.surface,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 25,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={{ color: colors.text, marginLeft: 8, fontWeight: "500" }}>
                    Friends
                  </Text>
                </Pressable>
              ) : hasPendingRequest ? (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 25,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginLeft: 8, fontWeight: "500" }}>
                    Request Sent
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleAddFriend}
                  disabled={isAddingFriend}
                  style={{
                    backgroundColor: isAddingFriend ? colors.primary + '80' : colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 25,
                    flexDirection: "row",
                    alignItems: "center",
                    opacity: isAddingFriend ? 0.7 : 1,
                  }}
                >
                  {isAddingFriend ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="person-add" size={18} color="white" />
                  )}
                  <Text style={{ color: "white", marginLeft: 8, fontWeight: "600" }}>
                    {isAddingFriend ? "Adding..." : "Add Friend"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Private Profile Placeholder - shown when viewing private profile without being friends */}
        {isPrivateAndNotFriend ? (
          <View className="px-6 py-12">
            <TickBoxCard>
              <View className="items-center py-8">
                <View
                  style={{
                    backgroundColor: colors.border,
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="lock-closed" size={40} color={colors.textMuted} />
                </View>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}>
                  This Account is Private
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: "center", marginBottom: 20, paddingHorizontal: 16 }}>
                  Add {userProfile.displayName} as a friend to see their memories and activity.
                </Text>
                {!hasPendingRequest && (
                  <Pressable
                    onPress={handleAddFriend}
                    disabled={isAddingFriend}
                    style={{
                      backgroundColor: isAddingFriend ? colors.primary + '80' : colors.primary,
                      paddingHorizontal: 32,
                      paddingVertical: 14,
                      borderRadius: 25,
                      flexDirection: "row",
                      alignItems: "center",
                      opacity: isAddingFriend ? 0.7 : 1,
                    }}
                  >
                    {isAddingFriend ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="person-add" size={18} color="white" />
                    )}
                    <Text style={{ color: "white", marginLeft: 8, fontWeight: "600" }}>
                      {isAddingFriend ? "Sending..." : "Send Friend Request"}
                    </Text>
                  </Pressable>
                )}
                {hasPendingRequest && (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 25,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginLeft: 8, fontWeight: "500" }}>
                      Friend Request Sent
                    </Text>
                  </View>
                )}
              </View>
            </TickBoxCard>
          </View>
        ) : (
          <>
            {/* Stats Section */}
            <View className="px-6 mb-6">
              <TickBoxCard>
                <View className="flex-row justify-between">
                  {/* Total Tickets */}
                  <View className="items-center flex-1">
                    <View
                      style={{
                        backgroundColor: colors.primary + "20",
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name="ticket" size={28} color={colors.primary} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center" }}>
                      {totalMemories}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                      Total Tickets
                    </Text>
                  </View>

                  {/* Total Spent */}
                  <View className="items-center flex-1">
                    <View
                      style={{
                        backgroundColor: colors.success + "20",
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name="wallet" size={28} color={colors.success} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center" }}>
                      {getCurrencySymbol(userProfile.preferredCurrency || "GBP")}{totalSpent.toFixed(0)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                      Total Spent
                    </Text>
                  </View>

                  {/* Top Category */}
                  <View className="items-center flex-1">
                    <View
                      style={{
                        backgroundColor: colors.warning + "20",
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name="pricetag" size={28} color={colors.warning} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold", textAlign: "center" }} numberOfLines={1}>
                      {topCategory}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                      Top Category
                    </Text>
                  </View>
                </View>
              </TickBoxCard>
            </View>

            {/* Memories Section */}
            <View className="px-6 pb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>
                  Memories {filteredMemories.length > 0 && `(${filteredMemories.length})`}
                </Text>
                <Pressable
                  onPress={() => setShowFilterModal(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.surface,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="filter" size={16} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginLeft: 6, fontSize: 14 }}>
                    {sortOrder === "newest" ? "Newest" : "Oldest"}{selectedCategory !== "All" ? ` · ${selectedCategory}` : ""}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>

              {filteredMemories.length === 0 ? (
                <View className="items-center py-16">
                  <Ionicons name="images-outline" size={64} color={colors.textMuted} />
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600", marginTop: 16 }}>
                    No Memories Yet
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
                    {userProfile.displayName} hasn't shared any public memories yet.
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap justify-between">
                  {filteredMemories.map((memory) => (
                    <Pressable
                      key={memory.id}
                      onPress={() => navigation.navigate("MemoryDetail", { memoryId: memory.id })}
                      style={{
                        width: "48%",
                        marginBottom: 16,
                        backgroundColor: colors.cardBackground,
                        borderRadius: 12,
                        overflow: "hidden",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      {/* Cover Photo */}
                      <View style={{ height: 120, backgroundColor: colors.border }}>
                        {memory.coverPhoto ? (
                          <Image
                            source={memory.coverPhoto}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={0}
                          />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View style={{ padding: 12 }}>
                        <Text
                          style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 4 }}
                          numberOfLines={1}
                        >
                          {memory.title}
                        </Text>

                        {/* Date */}
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                            {new Date(memory.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric"
                            })}
                          </Text>
                        </View>

                        {/* Location */}
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                          <Text
                            style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}
                            numberOfLines={1}
                          >
                            {memory.location}
                          </Text>
                        </View>

                        {/* Category */}
                        <View className="flex-row items-center mb-3">
                          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                            {memory.category}
                          </Text>
                        </View>

                        {/* Social stats */}
                        <View className="flex-row items-center justify-between">
                          {/* Likes count */}
                          {memory.likes && memory.likes.length > 0 && (
                            <View className="flex-row items-center">
                              <Ionicons name="heart" size={12} color={colors.primary} />
                              <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: 2 }}>
                                {memory.likes.length}
                              </Text>
                            </View>
                          )}

                          {/* Comments count */}
                          {memory.comments && memory.comments.length > 0 && (
                            <View className="flex-row items-center">
                              <Ionicons name="chatbubble" size={12} color={colors.textMuted} />
                              <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: 2 }}>
                                {memory.comments.length}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 50 }}>
            <View className="flex-row justify-between items-center p-6 border-b" style={{ borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Filter & Sort</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              {/* Sort Order Section */}
              <View className="p-6 border-b" style={{ borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
                  Sort By Date
                </Text>
                {[
                  { key: "newest", label: "Newest First" },
                  { key: "oldest", label: "Oldest First" },
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setSortOrder(option.key as "newest" | "oldest")}
                    className="flex-row items-center justify-between py-3"
                  >
                    <Text style={{ color: colors.text, fontSize: 16 }}>
                      {option.label}
                    </Text>
                    {sortOrder === option.key && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Category Section */}
              <View className="p-6">
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
                  Category
                </Text>
                {categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    className="flex-row items-center justify-between py-3"
                  >
                    <Text style={{ color: colors.text, fontSize: 16 }}>
                      {category}
                    </Text>
                    {selectedCategory === category && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View className="px-6 pb-4">
              <Pressable
                onPress={() => setShowFilterModal(false)}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                  Apply Filters
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Photo Viewer Modal */}
      {userProfile.profilePhoto && (
        <ImageViewerModal
          visible={showProfilePhotoModal}
          images={[userProfile.profilePhoto]}
          onClose={() => setShowProfilePhotoModal(false)}
          title={userProfile.displayName}
        />
      )}
    </SafeAreaView>
  );
}
