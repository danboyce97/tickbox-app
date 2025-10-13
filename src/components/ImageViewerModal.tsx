import React, { useState } from "react";
import { View, Text, Pressable, Modal, Dimensions, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function ImageViewerModal({
  visible,
  onClose,
  images,
  initialIndex = 0,
  title = "Image Viewer",
}: ImageViewerModalProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const currentIdx = Math.round(contentOffset.x / screenWidth);
    setCurrentIndex(currentIdx);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1">
              <Text style={{ color: "white" }} className="text-lg font-semibold">
                {title}
              </Text>
              {images.length > 1 && (
                <Text style={{ color: "rgba(255,255,255,0.7)" }} className="text-sm">
                  {currentIndex + 1} of {images.length}
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

          {/* Image Gallery */}
          <View className="flex-1 justify-center">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScrollEnd}
              contentOffset={{ x: initialIndex * screenWidth, y: 0 }}
            >
              {images.map((imageUri, index) => (
                <View
                  key={index}
                  style={{ width: screenWidth, height: screenHeight - 120 }}
                  className="justify-center items-center px-4"
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: screenWidth - 32,
                      height: "100%",
                    }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Page Indicators */}
          {images.length > 1 && (
            <View className="flex-row justify-center items-center py-4">
              {images.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentIndex ? "white" : "rgba(255,255,255,0.4)",
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
