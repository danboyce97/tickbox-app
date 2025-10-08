import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useFriendStore } from "../state/friendStore";
import { useMemoryStore } from "../state/memoryStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
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
  const sendFriendRequest = useFriendStore((state) => state.sendFriendRequest);
  const respondToFriendRequest = useFriendStore((state) => state.respondToFriendRequest);
  const getFriendRequests = useFriendStore((state) => state.getFriendRequests);
  const getUserById = useFriendStore((state) => state.getUserById);
  const getMemoriesByFriend = useMemoryStore((state) => state.getMemoriesByFriend);
  const likeMemory = useMemoryStore((state) => state.likeMemory);
  const unlikeMemory = useMemoryStore((state) => state.unlikeMemory);

  const [activeTab, setActiveTab] = useState<"activity" | "friends" | "find">("activity");
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  const pendingRequests = getFriendRequests(user.id, "received").filter(req => req.status === "pending");
  const friendIds = friends.map(f => f.id);
  const friendMemoriesOnly = getMemoriesByFriend(friendIds);
  
  // Get user's own memories where showOnFeed is true
  const ownFeedMemories = useMemoryStore.getState().memories.filter(
    (memory) => memory.userId === user.id && memory.showOnFeed && !memory.isProtected
  );
  
  // Combine friend memories and own feed memories, then sort by date
  const allFeedMemories = [...friendMemoriesOnly, ...ownFeedMemories].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const friendMemories = allFeedMemories.slice(0, 10);
  const searchResults = searchQuery.trim() ? searchUsers(searchQuery, user?.id) : [];

  // Calculate unseen activity count
  const unseenCount = user.lastSeenActivityTimestamp
    ? allFeedMemories.filter(
        (memory) => new Date(memory.createdAt) > new Date(user.lastSeenActivityTimestamp!)
      ).length
    : allFeedMemories.length;

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
    
    if (memory.likes.includes(user.id)) {
      unlikeMemory(memoryId, user.id);
    } else {
      likeMemory(memoryId, user.id);
    }
  };

  const renderActivityItem = ({ item: memory }: any) => {
    // Check if this is the user's own memory or a friend's memory
    const isOwnMemory = memory.userId === user.id;
    const friend = isOwnMemory ? null : friends.find(f => f.id === memory.userId);
    
    // If it's not own memory and friend not found, don't render
    if (!isOwnMemory && !friend) return null;

    const isLiked = user ? memory.likes.includes(user.id) : false;
    const likeCount = memory.likes.length;
    const displayName = isOwnMemory ? "You" : friend?.displayName;

    return (
      <TickBoxCard style={{ marginBottom: 12 }}>
        {/* Friend/User Header */}
        <View className="flex-row items-center mb-3">
          <View style={{ backgroundColor: colors.border }} className="w-10 h-10 rounded-full mr-3" />
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="font-medium">
              {displayName}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              added a memory
            </Text>
          </View>
          <Text style={{ color: colors.textMuted }} className="text-xs">
            {new Date(memory.createdAt).toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric" 
            })}
          </Text>
        </View>

        {/* Memory Cover Photo */}
        {memory.coverPhoto && (
          <View style={{ height: 160, marginBottom: 12, borderRadius: 8, overflow: "hidden" }}>
            <Image 
              source={{ uri: memory.coverPhoto }} 
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
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

        {/* Like Button */}
        <View className="flex-row items-center justify-between">
          {memory.userId !== user?.id ? (
            <Pressable
              onPress={() => handleLike(memory.id)}
              className="flex-row items-center"
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? colors.primary : colors.textSecondary}
              />
              <Text style={{ 
                color: isLiked ? colors.primary : colors.textSecondary,
                marginLeft: 6,
                fontWeight: "500"
              }}>
                {likeCount > 0 ? likeCount : "Like"}
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center">
              <Ionicons
                name="heart-outline"
                size={20}
                color={colors.textMuted}
              />
              <Text style={{ 
                color: colors.textMuted,
                marginLeft: 6,
                fontWeight: "500"
              }}>
                {likeCount > 0 ? `${likeCount} like${likeCount > 1 ? 's' : ''}` : "Your memory"}
              </Text>
            </View>
          )}
          
          {memory.price && (
            <Text style={{ color: colors.primary }} className="font-semibold">
              £{memory.price.toFixed(2)}
            </Text>
          )}
        </View>
      </TickBoxCard>
    );
  };

  const renderFriendItem = ({ item: friend }: any) => (
    <TickBoxCard style={{ marginBottom: 12 }}>
      <View className="flex-row items-center">
        <View style={{ backgroundColor: colors.border }} className="w-12 h-12 rounded-full mr-3" />
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="font-medium">
            {friend.displayName}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm">
            @{friend.username}
          </Text>
        </View>
        <Pressable style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
          <Text className="text-white font-medium">View</Text>
        </Pressable>
      </View>
    </TickBoxCard>
  );

  const renderSearchResult = ({ item: searchUser }: any) => {
    const isAlreadyFriend = friends.some(f => f.id === searchUser.id);
    const hasPendingRequest = friendRequests.some(
      req => req.fromUserId === user.id && req.toUserId === searchUser.id && req.status === "pending"
    );

    return (
      <TickBoxCard style={{ marginBottom: 12 }}>
        <View className="flex-row items-center">
          <View style={{ backgroundColor: colors.border }} className="w-12 h-12 rounded-full mr-3" />
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="font-medium">
              {searchUser.displayName}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              @{searchUser.username}
            </Text>
          </View>
          {isAlreadyFriend ? (
            <Text style={{ color: colors.success }} className="font-medium">Friends</Text>
          ) : hasPendingRequest ? (
            <Text style={{ color: colors.textSecondary }}>Requested</Text>
          ) : (
            <Pressable 
              onPress={() => sendFriendRequest(user.id, searchUser.id)}
              style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text className="text-white font-medium">Add Friend</Text>
            </Pressable>
          )}
        </View>
      </TickBoxCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with Friend Requests */}
      {pendingRequests.length > 0 && (
        <View style={{ backgroundColor: `${colors.primary}20`, borderBottomWidth: 1, borderBottomColor: `${colors.primary}40`, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: colors.primary }} className="font-medium mb-2">
            {pendingRequests.length} Friend Request{pendingRequests.length > 1 ? "s" : ""}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-3">
              {pendingRequests.map((request) => {
                const fromUser = getUserById(request.fromUserId);
                if (!fromUser) return null;
                
                return (
                  <View key={request.id} style={{ backgroundColor: colors.cardBackground, borderRadius: 8, padding: 12, minWidth: 192 }}>
                    <Text style={{ color: colors.text }} className="font-medium mb-2">
                      {fromUser.displayName}
                    </Text>
                    <View className="flex-row space-x-2">
                      <Pressable
                        onPress={() => respondToFriendRequest(request.id, "accepted")}
                        style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 6 }}
                      >
                        <Text className="text-white text-center text-sm font-medium">Accept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => respondToFriendRequest(request.id, "declined")}
                        style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 8, borderRadius: 6 }}
                      >
                        <Text style={{ color: colors.textSecondary }} className="text-center text-sm font-medium">
                          Decline
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {[
          { key: "activity", label: "Activity", count: unseenCount },
          { key: "friends", label: "Friends", count: friends.length },
          { key: "find", label: "Find Friends", count: 0 },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => handleTabChange(tab.key as any)}
            className="flex-1 py-4"
            style={activeTab === tab.key ? { borderBottomWidth: 2, borderBottomColor: colors.primary } : {}}
          >
            <View className="items-center">
              <Text style={{ 
                fontWeight: "500",
                color: activeTab === tab.key ? colors.primary : colors.textSecondary 
              }}>
                {tab.label}
                {tab.count > 0 && ` (${tab.count})`}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeTab === "activity" && (
        <View className="flex-1 px-6 py-4">
          <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">
            Recent Activity
          </Text>
          {friendMemories.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
                No Activity Yet
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Add friends to see their memories and activities here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={friendMemories}
              renderItem={renderActivityItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {activeTab === "friends" && (
        <View className="flex-1 px-6 py-4">
          <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">My Friends</Text>
          {friends.length === 0 ? (
            <View className="flex-1 items-center justify-center">
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
          ) : (
            <FlatList
              data={friends}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
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
              placeholder="Search by username or name..."
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, marginLeft: 12, color: colors.text }}
            />
          </View>

          {searchResults.length === 0 && searchQuery.trim() ? (
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
  );
}