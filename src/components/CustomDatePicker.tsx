import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface CustomDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function CustomDatePicker({
  date,
  onDateChange,
  placeholder = "Select date",
  label,
  required = false,
}: CustomDatePickerProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(date);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(date);
    setShowPicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getRelativeDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return formatDate(date);
  };

  return (
    <View>
      {label && (
        <Text style={{ color: colors.text }} className="font-medium mb-2">
          {label} {required && <Text style={{ color: colors.error }}>*</Text>}
        </Text>
      )}

      <Pressable
        onPress={() => setShowPicker(true)}
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
        <View className="flex-1">
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
            }}
          >
            {getRelativeDate(date)}
          </Text>
          {!isToday(date) && !isYesterday(date) && !isTomorrow(date) && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{formatDate(date)}</Text>
          )}
        </View>

        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Date Picker Modal */}
      <Modal visible={showPicker} transparent={true} animationType="fade" onRequestClose={handleCancel}>
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
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4 text-center">
              Select Date
            </Text>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              textColor={colors.text}
              style={{ backgroundColor: colors.background }}
            />

            <View className="flex-row justify-end mt-6 space-x-3">
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
                <Text style={{ color: colors.textSecondary }} className="font-medium">
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
      </Modal>
    </View>
  );
}
