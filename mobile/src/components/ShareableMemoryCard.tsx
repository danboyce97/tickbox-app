import React, { forwardRef } from "react";
import { View, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Memory } from "../state/memoryStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface ShareableMemoryCardProps {
  memory: Memory;
}

const ShareableMemoryCard = forwardRef<View, ShareableMemoryCardProps>(
  ({ memory }, ref) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const getCurrencySymbol = (currency: string) => {
      switch (currency) {
        case "GBP": return "£";
        case "USD": return "$";
        case "EUR": return "€";
        default: return "£";
      }
    };

    return (
      <View
        ref={ref}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: "#1a1a2e",
        }}
      >
        {/* Cover Image with Gradient Overlay */}
        <View style={{ flex: 1, position: "relative" }}>
          {memory.coverPhoto ? (
            <Image
              source={memory.coverPhoto}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#2a2a4a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="image-outline" size={80} color="#4a4a6a" />
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.9)"]}
            locations={[0, 0.5, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "70%",
            }}
          />

          {/* Category Badge */}
          <View
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              backgroundColor: "rgba(220, 128, 139, 0.9)",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "white", fontSize: 13, fontWeight: "600" }}>
              {memory.category}
            </Text>
          </View>

          {/* Content at Bottom */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 24,
            }}
          >
            {/* Title */}
            <Text
              style={{
                color: "white",
                fontSize: 26,
                fontWeight: "bold",
                marginBottom: 12,
                letterSpacing: -0.5,
              }}
              numberOfLines={2}
            >
              {memory.title}
            </Text>

            {/* Location */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="location" size={18} color="#dc808b" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 15,
                  marginLeft: 6,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {memory.location}
              </Text>
            </View>

            {/* Date & Time */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="calendar" size={18} color="#dc808b" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 15,
                  marginLeft: 6,
                }}
              >
                {formatDate(memory.date)}
                {memory.time && ` · ${memory.time}`}
              </Text>
            </View>

            {/* Price (if available) */}
            {memory.price && (
              <View
                style={{
                  backgroundColor: "rgba(220, 128, 139, 0.2)",
                  alignSelf: "flex-start",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(220, 128, 139, 0.4)",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "#dc808b",
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {getCurrencySymbol(memory.currency)}{memory.price.toFixed(2)}
                </Text>
              </View>
            )}

            {/* TickBox Branding */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.1)",
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: "#dc808b",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <Ionicons name="ticket" size={16} color="white" />
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Shared via TickBox
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

ShareableMemoryCard.displayName = "ShareableMemoryCard";

export default ShareableMemoryCard;
