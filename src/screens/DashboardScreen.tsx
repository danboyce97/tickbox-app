import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Image, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useMemoryStore } from "../state/memoryStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();

  const user = useUserStore((state) => state.user);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const searchMemories = useMemoryStore((state) => state.searchMemories);
  const filterMemories = useMemoryStore((state) => state.filterMemories);
  const addMemory = useMemoryStore((state) => state.addMemory);
  const memories = useMemoryStore((state) => state.memories);

  // Add mock data for testing (only in development)
  useEffect(() => {
    if (user && memories.length === 0) {
      // Add a mock memory for testing the detail page
      addMemory({
        userId: user.id,
        title: "Orient v Man City",
        date: "2025-02-08",
        time: "12:15",
        location: "Brisbane Road",
        price: 30.0,
        currency: "GBP",
        category: "Sports",
        description: "Orient 1-2 Man City. Just.",
        coverPhoto:
          "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        memoryPhotos: [
          "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        ],
        seatingInfo: {
          entrance: "Main Stand",
          block: "Block B",
          row: "Row 12",
          seat: "Seat 15",
        },
        taggedFriends: [],
        type: "uploaded",
        showOnFeed: true,
        uploadedImage:
          "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      });
    }
  }, [user, memories.length, addMemory]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "thisWeek" | "upcoming" | "past">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<"dateNewest" | "dateOldest" | "priceHigh" | "priceLow">("dateNewest");
  const [showSortModal, setShowSortModal] = useState(false);

  // Map custom sort values to store sort values
  const getSortByValue = (): "date" | "title" | "priceHigh" | "priceLow" => {
    if (sortBy === "dateNewest" || sortBy === "dateOldest") return "date";
    return sortBy;
  };

  const userMemories = user
    ? filterMemories({
        userId: user.id,
        dateFilter: selectedFilter,
        category: selectedCategory,
        sortBy: getSortByValue(),
      })
    : [];

  // Apply custom oldest/newest sorting
  const sortedMemories = [...userMemories].sort((a, b) => {
    if (sortBy === "dateOldest") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return 0; // Default sorting already handled by filterMemories
  });

  const filteredMemories = searchQuery.trim() && user ? searchMemories(searchQuery, user.id) : sortedMemories;

  // Get only categories that user has actually used
  const userCategories = user
    ? Array.from(new Set(filterMemories({ userId: user.id, sortBy: "date" }).map((m) => m.category)))
    : [];
  const categories = ["All", ...userCategories];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Main Header - just logo space */}
        <View className="px-6 py-4">{/* TickBox Logo would go here */}</View>

        {/* Collapsible Search & Filter Card */}
        <View className="px-6 mb-6">
          <TickBoxCard noPadding>
            <Pressable onPress={() => setIsFilterExpanded(!isFilterExpanded)} style={{ padding: 20 }}>
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Search & Filter</Text>
                <Ionicons
                  name={isFilterExpanded ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {isFilterExpanded && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
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
                    placeholder="Search memories..."
                    placeholderTextColor={colors.textMuted}
                    style={{ flex: 1, marginLeft: 12, color: colors.text }}
                  />
                </View>

                {/* Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row space-x-2">
                    {["all", "thisWeek", "upcoming", "past"].map((filter) => (
                      <Pressable
                        key={filter}
                        onPress={() => setSelectedFilter(filter as any)}
                        className="rounded-full"
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          ...(selectedFilter === filter
                            ? { backgroundColor: colors.primary }
                            : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            ...(selectedFilter === filter ? { color: "white" } : { color: colors.text }),
                          }}
                        >
                          {filter === "all"
                            ? "All Tickets"
                            : filter === "thisWeek"
                              ? "This Week"
                              : filter === "upcoming"
                                ? "Upcoming"
                                : "Past"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Category Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row space-x-2">
                    {categories.map((category) => (
                      <Pressable
                        key={category}
                        onPress={() => setSelectedCategory(category)}
                        className="rounded-full"
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          ...(selectedCategory === category
                            ? { backgroundColor: colors.accent }
                            : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            ...(selectedCategory === category ? { color: "white" } : { color: colors.text }),
                          }}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Sort By Button */}
                <View className="mt-4">
                  <Pressable
                    onPress={() => setShowSortModal(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500", marginLeft: 8 }}>
                        Sort:{" "}
                        {sortBy === "dateNewest"
                          ? "Date (Newest)"
                          : sortBy === "dateOldest"
                            ? "Date (Oldest)"
                            : sortBy === "priceHigh"
                              ? "Price (High-Low)"
                              : "Price (Low-High)"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            )}
          </TickBoxCard>
        </View>

        {/* Your Memories Header with Add Ticket Button */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>
              Your Memories {filteredMemories.length > 0 && `(${filteredMemories.length})`}
            </Text>
            <View>
              <Pressable
                onPress={() => navigation.navigate("CreateMemory")}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 25,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Add Ticket</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Memory Cards Grid */}
        {filteredMemories.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View
              style={{ backgroundColor: colors.border }}
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
            >
              <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.text }} className="text-xl font-semibold mb-2">
              Start Your Memory Collection
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-center mb-8 leading-6">
              Upload a ticket photo or create a digital memory of your events and experiences.
            </Text>
          </View>
        ) : (
          <View className="px-6 pb-32">
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
                        source={{ uri: memory.coverPhoto }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
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
                          day: "numeric",
                        })}
                      </Text>
                    </View>

                    {/* Location */}
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }} numberOfLines={1}>
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

                    {/* Price */}
                    {memory.price && (
                      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>
                        £{memory.price.toFixed(2)}
                      </Text>
                    )}

                    {/* Social stats - Tagged friends and likes */}
                    <View className="flex-row items-center justify-between mt-2">
                      {/* Tagged friends count */}
                      {memory.taggedFriends && memory.taggedFriends.length > 0 && (
                        <View className="flex-row items-center">
                          <Ionicons name="person" size={12} color={colors.textMuted} />
                          <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: 2 }}>
                            {memory.taggedFriends.length}
                          </Text>
                        </View>
                      )}

                      {/* Likes count */}
                      {memory.likes && memory.likes.length > 0 && (
                        <View className="flex-row items-center">
                          <Ionicons name="heart" size={12} color={colors.textMuted} />
                          <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: 2 }}>
                            {memory.likes.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal visible={showSortModal} animationType="slide" presentationStyle="pageSheet" transparent={true}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 50,
            }}
          >
            <View
              className="flex-row justify-between items-center p-6 border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Sort By</Text>
              <Pressable onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View className="p-6 space-y-4">
              {[
                { key: "priceHigh", label: "Price (High-Low)" },
                { key: "priceLow", label: "Price (Low-High)" },
                { key: "dateOldest", label: "Date (Oldest-Newest)" },
                { key: "dateNewest", label: "Date (Newest-Oldest)" },
              ].map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setSortBy(option.key as any);
                    setShowSortModal(false);
                  }}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{option.label}</Text>
                  {sortBy === option.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
