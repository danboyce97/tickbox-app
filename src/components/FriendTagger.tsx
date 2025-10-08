import React, { useState } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendStore } from "../state/friendStore";
import TickBoxCard from "./TickBoxCard";

interface FriendTaggerProps {
  selectedFriends: string[];
  onFriendsChange: (friendIds: string[]) => void;
}

export default function FriendTagger({ selectedFriends, onFriendsChange }: FriendTaggerProps) {
  const { colors } = useTheme();
  const friends = useFriendStore(state => state.friends);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    const isSelected = selectedFriends.includes(friendId);
    let newSelectedFriends;
    
    if (isSelected) {
      newSelectedFriends = selectedFriends.filter(id => id !== friendId);
    } else {
      newSelectedFriends = [...selectedFriends, friendId];
    }
    
    onFriendsChange(newSelectedFriends);
  };

  const renderFriend = ({ item: friend }: any) => {
    const isSelected = selectedFriends.includes(friend.id);
    
    return (
      <Pressable
        onPress={() => toggleFriend(friend.id)}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: isSelected ? colors.primary : colors.border,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* Profile Picture Placeholder */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isSelected ? colors.primary : colors.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {friend.profilePhoto ? (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.textMuted }} />
          ) : (
            <Ionicons
              name="person"
              size={20}
              color={isSelected ? "white" : colors.textMuted}
            />
          )}
        </View>
        
        {/* Friend Info */}
        <View className="flex-1">
          <Text
            style={{
              color: isSelected ? colors.primary : colors.text,
              fontWeight: isSelected ? "600" : "normal",
            }}
          >
            {friend.displayName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            @{friend.username}
          </Text>
        </View>
        
        {/* Selection Indicator */}
        {isSelected && (
          <View
            style={{
              backgroundColor: colors.primary,
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </Pressable>
    );
  };

  const renderSelectedFriends = () => {
    const selectedFriendObjects = friends.filter(friend => 
      selectedFriends.includes(friend.id)
    );

    if (selectedFriendObjects.length === 0) return null;

    return (
      <View className="mb-4">
        <Text style={{ color: colors.text }} className="font-medium mb-3">
          Tagged Friends ({selectedFriendObjects.length})
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {selectedFriendObjects.map(friend => (
            <View
              key={friend.id}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginRight: 8,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text className="text-white text-sm font-medium mr-1">
                {friend.displayName}
              </Text>
              <Pressable
                onPress={() => toggleFriend(friend.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color="white" />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <TickBoxCard>
      <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
        Tag Friends
      </Text>
      
      {renderSelectedFriends()}
      
      {friends.length === 0 ? (
        <View className="items-center py-8">
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
            No Friends Yet
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-center">
            Add friends to tag them in your memories.
          </Text>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View
            className="flex-row items-center mb-4"
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search friends..."
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, marginLeft: 12, color: colors.text }}
            />
          </View>

          {/* Friends List */}
          <View style={{ maxHeight: 300 }}>
            <FlatList
              data={filteredFriends}
              renderItem={renderFriend}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="items-center py-4">
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary }} className="mt-2">
                    No friends found matching "{searchQuery}"
                  </Text>
                </View>
              }
            />
          </View>
        </>
      )}
    </TickBoxCard>
  );
}