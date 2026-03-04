import React, { useState } from "react";
import { View, Text, Pressable, Modal, Dimensions, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface MediaItem {
  uri: string;
  type: "image" | "video";
}

interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  images?: string[]; // Legacy support for image-only arrays
  media?: MediaItem[]; // New support for mixed media
  initialIndex?: number;
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Video player component for the viewer
function FullScreenVideoPlayer({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
  });

  return (
    <View style={{ width: screenWidth - 32, height: "100%", justifyContent: "center", alignItems: "center" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: "80%" }}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

// Simple image display for gallery (no nested ScrollView to avoid gesture conflicts)
function GalleryImage({ uri }: { uri: string }) {
  return (
    <Image
      source={uri}
      style={{
        width: screenWidth - 32,
        height: screenHeight - 200,
      }}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={0}
    />
  );
}

export default function ImageViewerModal({
  visible,
  onClose,
  images,
  media,
  initialIndex = 0,
  title = "Media"
}: ImageViewerModalProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Convert images array to media array if media not provided (backwards compatibility)
  const mediaItems: MediaItem[] = media || (images?.map(uri => ({ uri, type: "image" as const })) || []);

  const handleScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const currentIdx = Math.round(contentOffset.x / screenWidth);
    setCurrentIndex(currentIdx);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)"
      }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1">
              <Text style={{ color: "white" }} className="text-lg font-semibold">
                {title}
              </Text>
              {mediaItems.length > 1 && (
                <Text style={{ color: "rgba(255,255,255,0.7)" }} className="text-sm">
                  {currentIndex + 1} of {mediaItems.length}
                </Text>
              )}
            </View>
          </View>

          {/* Close Button - Positioned lower for better accessibility */}
          <Pressable
            onPress={onClose}
            style={{
              position: "absolute",
              top: 100,
              right: 20,
              width: 44,
              height: 44,
              backgroundColor: "rgba(0,0,0,0.7)",
              borderRadius: 22,
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>

          {/* Media Gallery */}
          <View className="flex-1 justify-center">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScrollEnd}
              contentOffset={{ x: initialIndex * screenWidth, y: 0 }}
            >
              {mediaItems.map((item, index) => (
                <View
                  key={index}
                  style={{ width: screenWidth, height: screenHeight - 120 }}
                  className="justify-center items-center px-4"
                >
                  {item.type === "video" ? (
                    <FullScreenVideoPlayer videoUri={item.uri} />
                  ) : (
                    <GalleryImage uri={item.uri} />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Page Indicators */}
          {mediaItems.length > 1 && (
            <View className="flex-row justify-center items-center py-4">
              {mediaItems.map((item, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentIndex ? "white" : "rgba(255,255,255,0.4)",
                    marginHorizontal: 4,
                  }}
                >
                  {/* Show small video icon indicator for videos */}
                  {item.type === "video" && index === currentIndex && (
                    <View style={{ position: "absolute", top: -12, left: -4 }}>
                      <Ionicons name="videocam" size={12} color="white" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
