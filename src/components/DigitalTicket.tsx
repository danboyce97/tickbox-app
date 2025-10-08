import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { Memory } from "../state/memoryStore";

interface DigitalTicketProps {
  memory: Memory;
}

export default function DigitalTicket({ memory }: DigitalTicketProps) {
  const { colors } = useTheme();

  // Generate a fake QR code pattern
  const generateQRPattern = () => {
    const pattern = [];
    for (let i = 0; i < 10; i++) {
      const row = [];
      for (let j = 0; j < 10; j++) {
        row.push(Math.random() > 0.5);
      }
      pattern.push(row);
    }
    return pattern;
  };

  const qrPattern = generateQRPattern();

  return (
    <View 
      style={{ 
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: "dashed",
        margin: 16,
      }}
    >
      {/* Ticket Header */}
      <View className="items-center mb-6">
        <View 
          style={{ 
            backgroundColor: `${colors.primary}20`,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>
            DIGITAL TICKET
          </Text>
        </View>
        
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 4 }}>
          {memory.title}
        </Text>
        
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
          {memory.location}
        </Text>
      </View>

      {/* Ticket Details */}
      <View className="mb-6">
        <View className="flex-row justify-between mb-3">
          <View className="flex-1">
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
              DATE
            </Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
              {new Date(memory.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
          
          {memory.time && (
            <View className="flex-1">
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                TIME
              </Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                {memory.time}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row justify-between mb-3">
          <View className="flex-1">
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
              CATEGORY
            </Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
              {memory.category}
            </Text>
          </View>
          
          {memory.price && (
            <View className="flex-1">
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                PRICE
              </Text>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
                {memory.currency} {memory.price.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Seating Information */}
        {memory.seatingInfo && (
          <View className="flex-row justify-between">
            {memory.seatingInfo.entrance && (
              <View className="flex-1">
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                  ENTRANCE
                </Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {memory.seatingInfo.entrance}
                </Text>
              </View>
            )}
            
            {memory.seatingInfo.block && (
              <View className="flex-1">
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                  BLOCK
                </Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {memory.seatingInfo.block}
                </Text>
              </View>
            )}
            
            {memory.seatingInfo.row && (
              <View className="flex-1">
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                  ROW
                </Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {memory.seatingInfo.row}
                </Text>
              </View>
            )}
            
            {memory.seatingInfo.seat && (
              <View className="flex-1">
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                  SEAT
                </Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {memory.seatingInfo.seat}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Decorative Divider */}
      <View className="flex-row items-center mb-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <View 
            key={i}
            style={{ 
              width: 8,
              height: 1,
              backgroundColor: colors.border,
              marginRight: 4,
            }}
          />
        ))}
      </View>

      {/* QR Code Section */}
      <View className="items-center">
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500", marginBottom: 12 }}>
          ADMISSION BARCODE
        </Text>
        
        {/* Fake QR Code */}
        <View 
          style={{
            width: 120,
            height: 120,
            backgroundColor: colors.text,
            padding: 8,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, flexDirection: "column" }}>
            {qrPattern.map((row, i) => (
              <View key={i} style={{ flex: 1, flexDirection: "row" }}>
                {row.map((cell, j) => (
                  <View
                    key={j}
                    style={{
                      flex: 1,
                      backgroundColor: cell ? colors.text : colors.surface,
                      margin: 0.5,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Ticket ID */}
        <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: "monospace" }}>
          #{memory.id.slice(-8).toUpperCase()}
        </Text>
      </View>

      {/* Footer */}
      <View className="items-center mt-6 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <View className="flex-row items-center">
          <Ionicons name="shield-checkmark" size={12} color={colors.success} />
          <Text style={{ color: colors.success, fontSize: 11, marginLeft: 4, fontWeight: "500" }}>
            VERIFIED AUTHENTIC
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 4 }}>
          Generated by TickBox • {new Date(memory.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}