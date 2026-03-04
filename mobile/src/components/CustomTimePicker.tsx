import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface CustomTimePickerProps {
  time: string; // Format: "HH:MM" or empty
  onTimeChange: (time: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function CustomTimePicker({
  time,
  onTimeChange,
  placeholder = "Select time",
  label,
  required = false,
}: CustomTimePickerProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse time string to Date object for the picker
  const parseTimeToDate = (timeStr: string): Date => {
    const date = new Date();
    if (timeStr) {
      // Try to parse various time formats
      const cleanTime = timeStr.trim().toUpperCase();

      // Check for AM/PM format
      const isPM = cleanTime.includes("PM");
      const isAM = cleanTime.includes("AM");

      // Extract numbers
      const numbers = cleanTime.replace(/[^0-9:]/g, "");
      const parts = numbers.split(":");

      let hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;

      date.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 7:00 PM for events
      date.setHours(19, 0, 0, 0);
    }
    return date;
  };

  const [tempDate, setTempDate] = useState(parseTimeToDate(time));

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    const hours = tempDate.getHours();
    const minutes = tempDate.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    const formattedTime = `${displayHours}:${displayMinutes} ${period}`;
    onTimeChange(formattedTime);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(parseTimeToDate(time));
    setShowPicker(false);
  };

  const handleClear = () => {
    onTimeChange("");
    setShowPicker(false);
  };

  return (
    <View>
      {label && (
        <Text style={{ color: colors.text }} className="font-medium mb-2">
          {label} {required && <Text style={{ color: colors.error }}>*</Text>}
        </Text>
      )}

      <Pressable
        onPress={() => {
          setTempDate(parseTimeToDate(time));
          setShowPicker(true);
        }}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: time ? colors.text : colors.textMuted,
            fontSize: 16,
          }}
        >
          {time || placeholder}
        </Text>

        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Time Picker Modal */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 20,
              margin: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
              minWidth: 300,
            }}
          >
            <Text
              style={{ color: colors.text }}
              className="text-lg font-semibold mb-4 text-center"
            >
              Select Time
            </Text>

            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              textColor={colors.text}
              style={{ backgroundColor: colors.background }}
              minuteInterval={5}
            />

            <View className="flex-row justify-between mt-6">
              <Pressable
                onPress={handleClear}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: colors.textMuted }} className="font-medium">
                  Clear
                </Text>
              </Pressable>

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={handleCancel}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="font-medium"
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirm}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    marginLeft: 12,
                  }}
                >
                  <Text className="text-white font-medium">Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
