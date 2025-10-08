import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Image, Modal, TextInput, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useMemoryStore } from "../state/memoryStore";
import { useFriendStore } from "../state/friendStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import ImageViewerModal from "../components/ImageViewerModal";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getCurrencySymbol } from "../utils/currencies";
import GradientBackground from "../components/GradientBackground";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserProfileScreenProps = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export default function UserProfileScreen({ route }: UserProfileScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { userId } = route.params;
  const currentUser = useUserStore((state) => state.user);
  
  const [statsFilter, setStatsFilter] = useState<"all" | "thisYear" | "thisMonth" | "last3Months">("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  const filterMemories = useMemoryStore((state) => state.filterMemories);
  const friends = useFriendStore((state) => state.friends);
  const getFriendById = useFriendStore((state) => state.getFriendById);
  const removeFriend = useFriendStore((state) => state.removeFriend);
  const blockUser = useFriendStore((state) => state.blockUser);
  const isUserBlocked = useFriendStore((state) => state.isUserBlocked);

  // Get user data (either from friends list or from a user store if we had one)
  const user = getFriendById(userId);
  
  if (!user || !currentUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.text, fontSize: 18 }}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if current user is friends with this user
  const isFriend = friends.some(friend => friend.id === userId);

  // Filter memories based on selected time period for this user
  const filteredUserMemories = useMemo(() => {
    const allMemories = filterMemories({ userId: user.id, sortBy: "date" });
    
    if (statsFilter === "all") return allMemories;
    
    const now = new Date();
    return allMemories.filter(memory => {
      const memoryDate = new Date(memory.date);
      switch (statsFilter) {
        case "thisYear":
          return memoryDate.getFullYear() === now.getFullYear();
        case "thisMonth":
          return memoryDate.getFullYear() === now.getFullYear() && 
                 memoryDate.getMonth() === now.getMonth();
        case "last3Months":
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return memoryDate >= threeMonthsAgo;
        default:
          return true;
      }
    });
  }, [filterMemories, user.id, statsFilter]);

  const userMemories = filteredUserMemories;
  const totalSpent = userMemories.reduce((sum, memory) => sum + (memory.price || 0), 0);
  
  // Calculate top category
  const categoryCount = userMemories.reduce((acc, memory) => {
    acc[memory.category] = (acc[memory.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategory = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

  // Calculate friends with most shared events
  const sharedEventCounts = friends.reduce((acc, friend) => {
    const sharedEvents = userMemories.filter(memory => 
      memory.taggedFriends.includes(friend.id)
    ).length;
    acc[friend.id] = sharedEvents;
    return acc;
  }, {} as Record<string, number>);

  const topFriends = friends
    .filter(friend => sharedEventCounts[friend.id] > 0)
    .sort((a, b) => sharedEventCounts[b.id] - sharedEventCounts[a.id])
    .slice(0, 5);

  const handleRemoveFriend = () => {
    removeFriend(userId);
    navigation.goBack();
  };

  const handleBlockUser = () => {
    setShowMenuModal(false);
    setShowBlockModal(true);
  };

  const confirmBlockUser = () => {
    blockUser(userId);
    setShowBlockModal(false);
    navigation.goBack();
  };

  const handleReportUser = () => {
    setShowMenuModal(false);
    setShowReportModal(true);
  };

  const reportReasons = [
    "Inappropriate content",
    "Spam or fake account",
    "Harassment or bullying",
    "Impersonation",
    "Other"
  ];

  const submitReport = async () => {
    if (!selectedReportReason) return;

    const emailBody = `Report for User: ${user.displayName} (@${user.username})%0D%0AReason: ${selectedReportReason}%0D%0A%0D%0AAdditional details:%0D%0A${reportReason || "None provided"}`;
    const emailUrl = `mailto:support@tickboxapp.com?subject=User Report - ${user.username}&body=${emailBody}`;

    try {
      await Linking.openURL(emailUrl);
      setShowReportModal(false);
      setShowReportSuccess(true);
      setSelectedReportReason(null);
      setReportReason("");
    } catch (error) {
      console.error("Failed to open email app:", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center py-8 px-6">
          {/* Back Button */}
          <View className="absolute top-4 left-6">
            <Pressable onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Menu Button */}
          <View className="absolute top-4 right-6">
            <Pressable onPress={() => setShowMenuModal(true)} style={{ padding: 4 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Profile Photo */}
          <Pressable 
            onPress={() => user.profilePhoto && setShowProfilePhotoModal(true)}
            style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.border, overflow: "hidden", marginBottom: 16 }}
          >
            {user.profilePhoto ? (
              <Image 
                source={{ uri: user.profilePhoto }} 
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="person" size={48} color={colors.textMuted} />
              </View>
            )}
          </Pressable>

          {/* Name and Username */}
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "bold", marginBottom: 4 }}>
            {user.displayName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 12 }}>
            @{user.username}
          </Text>

          {/* Bio */}
          {user.bio && (
            <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: "center", marginBottom: 16 }}>
              {user.bio}
            </Text>
          )}

          {/* Location and Join Date */}
          <View className="flex-row items-center justify-center mb-6">
            {user.location && (
              <>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginLeft: 6 }}>
                  {user.location}
                </Text>
                <View style={{ width: 32 }} /> {/* Spacer */}
              </>
            )}
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginLeft: 6 }}>
              Joined {new Date(user.joinDate).toLocaleDateString("en-US", { 
                month: "short", 
                year: "2-digit" 
              })}
            </Text>
          </View>

          {/* Friend Actions */}
          {isFriend && (
            <Pressable
              onPress={handleRemoveFriend}
              style={{
                backgroundColor: colors.error + "20",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 25,
                borderWidth: 1,
                borderColor: colors.error,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="person-remove" size={16} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: 8, fontWeight: "500" }}>
                Remove Friend
              </Text>
            </Pressable>
          )}
        </View>

        {/* My Stats Section */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>
              {user.displayName}'s Stats
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
                {statsFilter === "all" ? "All Time" : 
                 statsFilter === "thisYear" ? "This Year" : 
                 statsFilter === "thisMonth" ? "This Month" : 
                 "Last 3 Months"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Primary Stats Row */}
          <TickBoxCard style={{ marginBottom: 16 }}>
            <View className="flex-row justify-between">
              {/* Total Tickets */}
              <View className="items-center flex-1">
                <View
                  style={{
                    backgroundColor: `${colors.primary}20`,
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
                  {userMemories.length}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                  Total Tickets
                </Text>
              </View>

              {/* Total Spent */}
              <View className="items-center flex-1">
                <View
                  style={{
                    backgroundColor: `${colors.success}20`,
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
                  {currentUser ? getCurrencySymbol(currentUser.preferredCurrency) : "£"}{totalSpent.toFixed(0)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                  Total Spent
                </Text>
              </View>

              {/* Top Category */}
              <View className="items-center flex-1">
                <View
                  style={{
                    backgroundColor: `${colors.warning}20`,
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

        {/* Top Friends Section */}
        <View className="px-6 pb-8">
          <TickBoxCard>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View style={{ backgroundColor: colors.warning, width: 24, height: 24, borderRadius: 4, justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                  <Ionicons name="trophy" size={14} color="white" />
                </View>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
                  Friends Leaderboard
                </Text>
              </View>
            </View>

            {topFriends.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
                  No shared events with friends yet
                </Text>
              </View>
            ) : (
              <View>
                {topFriends.slice(0, 5).map((friend, index) => {
                  const sharedEventCount = sharedEventCounts[friend.id];
                  const rankColors = [colors.warning, colors.textSecondary, colors.textMuted];
                  const rankColor = rankColors[index] || colors.textMuted;
                  
                  return (
                    <View key={friend.id} className="flex-row items-center py-3">
                      <View 
                        style={{ 
                          backgroundColor: index < 3 ? rankColor : colors.border,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12
                        }}
                      >
                        <Text 
                          style={{ 
                            color: index < 3 ? "white" : colors.textMuted,
                            fontSize: 12,
                            fontWeight: "bold"
                          }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      
                      <View style={{ backgroundColor: colors.border }} className="w-10 h-10 rounded-full mr-3" />
                      
                      <View className="flex-1">
                        <Text style={{ color: colors.text, fontWeight: "500" }}>
                          {friend.displayName}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          @{friend.username}
                        </Text>
                      </View>
                      
                      <View className="items-end">
                        <Text style={{ color: colors.primary, fontWeight: "600" }}>
                          {sharedEventCount}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {sharedEventCount === 1 ? "event" : "events"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </TickBoxCard>
        </View>
      </ScrollView>

      {/* Stats Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 50 }}>
            <View className="flex-row justify-between items-center p-6 border-b" style={{ borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Filter Stats</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            <View className="p-6 space-y-4">
              {[
                { key: "all", label: "All Time" },
                { key: "thisYear", label: "This Year" },
                { key: "last3Months", label: "Last 3 Months" },
                { key: "thisMonth", label: "This Month" }
              ].map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setStatsFilter(option.key as any);
                    setShowFilterModal(false);
                  }}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>
                    {option.label}
                  </Text>
                  {statsFilter === option.key && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Photo Viewer Modal */}
      {user.profilePhoto && (
        <ImageViewerModal
          visible={showProfilePhotoModal}
          images={[user.profilePhoto]}
          onClose={() => setShowProfilePhotoModal(false)}
          title={user.displayName}
        />
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <Pressable 
          className="flex-1 justify-end" 
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShowMenuModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 50 }}>
              <View className="flex-row justify-between items-center p-6 border-b" style={{ borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>User Options</Text>
                <Pressable onPress={() => setShowMenuModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>
              
              <View className="p-6">
                <Pressable
                  onPress={handleBlockUser}
                  className="flex-row items-center py-4"
                >
                  <View style={{ backgroundColor: colors.warning + "20", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                    <Ionicons name="ban" size={20} color={colors.warning} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}>Block User</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>You will not see their content</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={handleReportUser}
                  className="flex-row items-center py-4"
                >
                  <View style={{ backgroundColor: colors.error + "20", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                    <Ionicons name="flag" size={20} color={colors.error} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}>Report User</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Report inappropriate behavior</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        visible={showBlockModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 24, marginHorizontal: 32, width: "85%" }}>
            <View style={{ backgroundColor: colors.warning + "20", width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 16 }}>
              <Ionicons name="ban" size={32} color={colors.warning} />
            </View>

            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
              Block {user.displayName}?
            </Text>
            
            <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
              They will not be able to see your profile or memories, and you will not see theirs. This will also remove them from your friends list.
            </Text>

            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowBlockModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, textAlign: "center", fontWeight: "600", fontSize: 16 }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmBlockUser}
                style={{
                  flex: 1,
                  backgroundColor: colors.warning,
                  paddingVertical: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 }}>
                  Block
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: 50 }}>
            <View className="flex-row justify-between items-center p-6 border-b" style={{ borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Report User</Text>
              <Pressable onPress={() => {
                setShowReportModal(false);
                setSelectedReportReason(null);
                setReportReason("");
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500", marginBottom: 4 }}>
                Why are you reporting @{user.username}?
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 16 }}>
                Select a reason for this report. This information will be sent to our support team.
              </Text>

              {reportReasons.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReportReason(reason)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    backgroundColor: selectedReportReason === reason ? colors.primary + "10" : colors.surface,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: selectedReportReason === reason ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: selectedReportReason === reason ? colors.primary : colors.text, fontSize: 16, fontWeight: selectedReportReason === reason ? "600" : "400" }}>
                    {reason}
                  </Text>
                  {selectedReportReason === reason && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </Pressable>
              ))}

              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500", marginTop: 8, marginBottom: 12 }}>
                Additional Details (Optional)
              </Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="Provide more information about your report..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  color: colors.text,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  textAlignVertical: "top",
                  minHeight: 100,
                }}
              />
            </ScrollView>

            <View className="px-6 pb-6">
              <GradientBackground style={{ borderRadius: 12, opacity: selectedReportReason ? 1 : 0.5 }}>
                <Pressable
                  onPress={submitReport}
                  disabled={!selectedReportReason}
                  style={{ paddingVertical: 16 }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 }}>
                    Submit Report
                  </Text>
                </Pressable>
              </GradientBackground>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Success Modal */}
      <Modal
        visible={showReportSuccess}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowReportSuccess(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 24, marginHorizontal: 32, width: "85%" }}>
            <View style={{ backgroundColor: colors.success + "20", width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 16 }}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            </View>

            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
              Report Submitted
            </Text>
            
            <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
              Thank you for helping keep TickBox safe. Our support team will review your report.
            </Text>

            <GradientBackground style={{ borderRadius: 12 }}>
              <Pressable
                onPress={() => setShowReportSuccess(false)}
                style={{ paddingVertical: 14 }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 }}>
                  Done
                </Text>
              </Pressable>
            </GradientBackground>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}