import React, { useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp as NavigationRouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemoryStore } from "../state/memoryStore";
import { useUserStore } from "../state/userStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useTheme } from "../contexts/ThemeContext";
import TabView from "../components/TabView";
import TickBoxCard from "../components/TickBoxCard";
import DigitalTicket from "../components/DigitalTicket";
import ImageViewerModal from "../components/ImageViewerModal";

type RouteParamProp = NavigationRouteProp<RootStackParamList, "MemoryDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MemoryDetail">;

export default function MemoryDetailScreen() {
  const route = useRoute<RouteParamProp>();
  const navigation = useNavigation<NavigationProp>();
  const { memoryId } = route.params;
  const { colors } = useTheme();
  
  const memories = useMemoryStore((state) => state.memories);
  const likeMemory = useMemoryStore((state) => state.likeMemory);
  const unlikeMemory = useMemoryStore((state) => state.unlikeMemory);
  const deleteMemory = useMemoryStore((state) => state.deleteMemory);
  const user = useUserStore((state) => state.user);
  
  const memory = memories.find((m) => m.id === memoryId);

  if (!memory) {
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

  const isLiked = user ? memory.likes.includes(user.id) : false;
  const likeCount = memory.likes.length;
  const isOwner = user && memory.userId === user.id;
  
  // Image viewer state
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerTitle, setViewerTitle] = useState("");

  const handleLike = () => {
    if (!user) return;
    
    if (isLiked) {
      unlikeMemory(memory.id, user.id);
    } else {
      likeMemory(memory.id, user.id);
    }
  };

  const openImageViewer = (images: string[], initialIndex: number = 0, title: string = "Image Viewer") => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setViewerTitle(title);
    setIsImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setIsImageViewerVisible(false);
    setViewerImages([]);
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
          onPress: () => {
            deleteMemory(memory.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  // Set header title and buttons dynamically
  useLayoutEffect(() => {
    if (memory && user) {
      const isOwner = memory.userId === user.id;
      
      navigation.setOptions({
        title: memory.title,
        headerRight: () => (
          <View className="flex-row items-center">
            {/* Share button - always visible */}
            <Pressable 
              onPress={() => {
                // Share functionality - implement later
              }}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="share-outline" size={24} color="#dc808b" />
            </Pressable>
            
            {/* Edit button - only for owner */}
            {isOwner && (
              <Pressable 
                onPress={() => navigation.navigate("CreateMemory", { mode: "edit", memoryId })}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="create-outline" size={24} color="#dc808b" />
              </Pressable>
            )}
            
            {/* Delete button - only for owner */}
            {isOwner && (
              <Pressable onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#dc808b" />
              </Pressable>
            )}
          </View>
        )
      });
    }
  }, [navigation, memory, user, memoryId, handleDelete]);

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
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
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

        {/* Memory Photos */}
        {memory.memoryPhotos && memory.memoryPhotos.length > 0 && (
          <View className="bg-white rounded-2xl p-6 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="images" size={20} color={colors.textSecondary} />
              <Text style={{ color: colors.text }} className="text-lg font-semibold ml-2">
                Memory Photos
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {memory.memoryPhotos.map((photo, index) => (
                  <Pressable 
                    key={index} 
                    className="mr-3"
                    onPress={() => openImageViewer(memory.memoryPhotos, index, `${memory.title} - Memory Photos`)}
                  >
                    <Image 
                      source={{ uri: photo }}
                      style={{ width: 120, height: 120, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
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
            resizeMode="contain"
          />
        </Pressable>
      ) : (
        // Show digital ticket
        <DigitalTicket memory={memory} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TabView
        tabs={[
          { key: "event", title: "Event", icon: "calendar", content: eventTabContent },
          { key: "ticket", title: "Ticket", icon: "ticket", content: ticketTabContent },
        ]}
        initialTab="event"
      />
      
      <ImageViewerModal
        visible={isImageViewerVisible}
        onClose={closeImageViewer}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        title={viewerTitle}
      />
    </SafeAreaView>
  );
}