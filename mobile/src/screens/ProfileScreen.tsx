import React, { useState, useMemo } from "react";
import { Image } from "expo-image";
import { View, Text, Pressable, ScrollView, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useMemoryStore } from "../state/memoryStore";
import { useFriendStore } from "../state/friendStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import ImageViewerModal from "../components/ImageViewerModal";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getCurrencySymbol } from "../utils/currencies";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  
  const [statsFilter, setStatsFilter] = useState<"all" | "thisYear" | "thisMonth" | "last3Months">("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  const logout = useUserStore((state) => state.logout);

  // Subscribe to memories array to ensure re-render on changes
  const memories = useMemoryStore((state) => state.memories);
  const filterMemories = useMemoryStore((state) => state.filterMemories);
  const friends = useFriendStore((state) => state.friends);

  // Filter memories based on selected time period - must be before early return
  const filteredUserMemories = useMemo(() => {
    if (!user) return [];
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
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return memoryDate >= threeMonthsAgo;
        default:
          return true;
      }
    });
  }, [user, filterMemories, statsFilter, memories]);

  // Calculate friends with most shared events - must be before early return
  const sharedEventCounts = useMemo(() => {
    if (!user) return {};
    return friends.reduce((acc, friend) => {
      const allMemories = filterMemories({ userId: user.id, sortBy: "date" });
      const sharedEvents = allMemories.filter(memory =>
        memory.taggedFriends && memory.taggedFriends.includes(friend.id)
      ).length;
      acc[friend.id] = sharedEvents;
      return acc;
    }, {} as Record<string, number>);
  }, [friends, user, filterMemories, memories]);

  if (!user) return null;

  const userMemories = filteredUserMemories;
  const totalSpent = userMemories.reduce((sum, memory) => sum + (memory.price || 0), 0);

  // Calculate top category
  const categoryCount = userMemories.reduce((acc, memory) => {
    acc[memory.category] = (acc[memory.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

  const topFriends = friends
    .filter(friend => sharedEventCounts[friend.id] > 0)
    .sort((a, b) => sharedEventCounts[b.id] - sharedEventCounts[a.id])
    .slice(0, 5); // Top 5 friends

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };




  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center py-8 px-6">
          {/* Profile Photo */}
          <Pressable 
            onPress={() => user.profilePhoto && setShowProfilePhotoModal(true)} 
            className="mb-4"
          >
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.border, overflow: "hidden" }}>
              {user.profilePhoto ? (
                <Image
                  source={user.profilePhoto}
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
            {user.location && (user.showLocation ?? true) && (
              <>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginLeft: 6 }}>
                  {user.location}
                </Text>
                <View style={{ width: 32 }} />
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

          {/* Edit Profile Button */}
          <Pressable
            onPress={() => navigation.navigate("EditProfile")}
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
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.text, marginLeft: 8, fontWeight: "500" }}>
              Edit Profile
            </Text>
          </Pressable>
        </View>

        {/* My Stats Section */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>
              My Stats
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

          {/* Primary Stats Row - Clickable */}
          <Pressable onPress={() => navigation.navigate("DetailedStats")}>
            <TickBoxCard style={{ marginBottom: 16 }}>
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
                     {getCurrencySymbol(user.preferredCurrency)}{totalSpent.toFixed(0)}
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
            {/* Tap for more hint */}
            <View className="flex-row items-center justify-center mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <Ionicons name="bar-chart-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 6 }}>
                Tap for detailed stats
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TickBoxCard>
          </Pressable>


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
              {topFriends.length > 3 && (
                <Pressable>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>View All</Text>
                </Pressable>
              )}
            </View>

            {topFriends.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
                  Tag friends in memories to see them on your leaderboard
                </Text>
              </View>
            ) : (
              <View>
                {topFriends.slice(0, 5).map((friend, index) => {
                  const sharedEventCount = sharedEventCounts[friend.id];
                  const rankColors = [colors.warning, colors.textSecondary, colors.textMuted];
                  const rankColor = rankColors[index] || colors.textMuted;

                  return (
                    <Pressable
                      key={friend.id}
                      onPress={() => navigation.navigate("UserProfile", { userId: friend.id })}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View className="flex-row items-center py-3">
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

                        <View style={{ backgroundColor: colors.border, width: 40, height: 40, borderRadius: 20, marginRight: 12, overflow: "hidden" }}>
                          {friend.profilePhoto ? (
                            <Image
                              source={friend.profilePhoto}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={0}
                            />
                          ) : (
                            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="person" size={20} color={colors.textMuted} />
                            </View>
                          )}
                        </View>

                        <View className="flex-1">
                          <Text style={{ color: colors.text, fontWeight: "500" }}>
                            {friend.displayName}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            @{friend.username}
                          </Text>
                        </View>

                        <View className="items-end flex-row" style={{ alignItems: "center" }}>
                          <View className="items-end mr-2">
                            <Text style={{ color: colors.primary, fontWeight: "600" }}>
                              {sharedEventCount}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                              {sharedEventCount === 1 ? "event" : "events"}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </TickBoxCard>
        </View>

        {/* Account Section */}
        <View className="px-6 pb-8">
          <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">
            Account
          </Text>
          
          <View className="space-y-3">
            <TickBoxCard noPadding>
              <Pressable
                onPress={() => navigation.navigate("InviteFriends")}
                style={{ padding: 16, flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="person-add" size={20} color={colors.textSecondary} style={{ marginRight: 16 }} />
                <Text style={{ color: colors.text, flex: 1 }}>Invite Friends</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            </TickBoxCard>
            
            <TickBoxCard noPadding>
              <Pressable
                onPress={() => navigation.navigate("SettingsPrivacy")}
                style={{ padding: 16, flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="settings" size={20} color={colors.textSecondary} style={{ marginRight: 16 }} />
                <Text style={{ color: colors.text, flex: 1 }}>Settings & Privacy</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            </TickBoxCard>
            
            <TickBoxCard noPadding>
              <Pressable
                onPress={() => navigation.navigate("SupportFeedback")}
                style={{ padding: 16, flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="help-circle" size={20} color={colors.textSecondary} style={{ marginRight: 16 }} />
                <Text style={{ color: colors.text, flex: 1 }}>Support & Feedback</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            </TickBoxCard>

            <TickBoxCard noPadding>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Sign Out",
                    "Are you sure you want to sign out?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign Out", style: "destructive", onPress: logout },
                    ]
                  );
                }}
                style={{ padding: 16, flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="log-out" size={20} color={colors.error} style={{ marginRight: 16 }} />
                <Text style={{ color: colors.error, flex: 1 }}>Sign Out</Text>
              </Pressable>
            </TickBoxCard>
          </View>
        </View>
      </ScrollView>

      {/* Stats Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
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

    </SafeAreaView>
  );
}

