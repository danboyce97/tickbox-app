import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useUserStore } from "../state/userStore";
import { useMemoryStore } from "../state/memoryStore";
import TickBoxCard from "./TickBoxCard";

interface CategorySelectorProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const DEFAULT_CATEGORIES = [
  { id: "Concert", label: "Concert", icon: "musical-notes" },
  { id: "Sports", label: "Sports", icon: "basketball" },
  { id: "Theatre", label: "Theatre", icon: "library" },
  { id: "Movies", label: "Movies", icon: "film" },
  { id: "Travel", label: "Travel", icon: "airplane" },
  { id: "Food", label: "Food", icon: "restaurant" },
  { id: "Festival", label: "Festival", icon: "sunny" },
  { id: "Comedy", label: "Comedy", icon: "happy" },
  { id: "Art", label: "Art", icon: "color-palette" },
  { id: "Other", label: "Other", icon: "help-circle" },
];

export default function CategorySelector({ selectedCategory, onCategorySelect }: CategorySelectorProps) {
  const { colors } = useTheme();
  const user = useUserStore(state => state.user);
  const updateUser = useUserStore(state => state.updateUser);
  const deleteCustomCategory = useUserStore(state => state.deleteCustomCategory);
  const renameCategory = useUserStore(state => state.renameCategory);
  const renameCategoryInMemories = useMemoryStore(state => state.renameCategoryInMemories);
  const deleteCategoryFromMemories = useMemoryStore(state => state.deleteCategoryFromMemories);
  
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<{ name: string; isCustom: boolean } | null>(null);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const customCategories = user?.customCategories || [];
  const maxCustomCategories = 10;
  const canAddMore = customCategories.length < maxCustomCategories;

  const handleAddCustomCategory = () => {
    if (!customCategory.trim()) {
      Alert.alert("Invalid Category", "Please enter a category name.");
      return;
    }

    if (customCategory.length > 20) {
      Alert.alert("Too Long", "Category name must be 20 characters or less.");
      return;
    }

    const newCustomCategory = customCategory.trim();
    
    // Check if category already exists
    const allCategories = [...DEFAULT_CATEGORIES.map(c => c.id), ...customCategories];
    if (allCategories.some(cat => cat.toLowerCase() === newCustomCategory.toLowerCase())) {
      Alert.alert("Duplicate Category", "This category already exists.");
      return;
    }

    const updatedCustomCategories = [...customCategories, newCustomCategory];
    updateUser({ customCategories: updatedCustomCategories });
    
    setCustomCategory("");
    setShowCustomInput(false);
    onCategorySelect(newCustomCategory);
  };

  const handleLongPress = (categoryName: string, isCustom: boolean) => {
    setSelectedForEdit({ name: categoryName, isCustom });
    setShowOptionsModal(true);
  };

  const handleDeleteCategory = () => {
    if (!selectedForEdit || !user) return;

    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${selectedForEdit.name}"? All memories with this category will be moved to "Other".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteCustomCategory(selectedForEdit.name);
            deleteCategoryFromMemories(selectedForEdit.name, user.id, "Other");
            
            // If currently selected, switch to Other
            if (selectedCategory === selectedForEdit.name) {
              onCategorySelect("Other");
            }
            
            setShowOptionsModal(false);
            setSelectedForEdit(null);
          },
        },
      ]
    );
  };

  const handleRenameCategory = () => {
    if (!selectedForEdit) return;
    setRenameValue(selectedForEdit.name);
    setShowRenameInput(true);
  };

  const handleConfirmRename = () => {
    if (!selectedForEdit || !user) return;

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      Alert.alert("Invalid Name", "Category name cannot be empty.");
      return;
    }

    if (trimmedName.length > 20) {
      Alert.alert("Too Long", "Category name must be 20 characters or less.");
      return;
    }

    // Check for duplicates (excluding the current category being renamed)
    const allCategories = [
      ...DEFAULT_CATEGORIES.map(c => c.id),
      ...customCategories
    ].filter(cat => cat !== selectedForEdit.name);

    if (allCategories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert("Duplicate Category", "This category name already exists.");
      return;
    }

    // Update custom categories if it's a custom one
    if (selectedForEdit.isCustom) {
      renameCategory(selectedForEdit.name, trimmedName);
    }

    // Update all memories with this category
    renameCategoryInMemories(selectedForEdit.name, trimmedName, user.id);

    // Update selected category if this one was selected
    if (selectedCategory === selectedForEdit.name) {
      onCategorySelect(trimmedName);
    }

    setShowOptionsModal(false);
    setShowRenameInput(false);
    setSelectedForEdit(null);
    setRenameValue("");
  };

  const renderCategoryItem = (category: { id: string; label: string; icon: string }, isCustom = false) => {
    const isSelected = selectedCategory === category.id;
    
    return (
      <Pressable
        key={category.id}
        onPress={() => onCategorySelect(category.id)}
        onLongPress={() => handleLongPress(category.id, isCustom)}
        style={{
          backgroundColor: isSelected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: isSelected ? colors.primary : colors.border,
          borderRadius: 12,
          padding: 16,
          margin: 4,
          flex: 1,
          minWidth: "45%",
          alignItems: "center",
        }}
      >
        <Ionicons
          name={category.icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={isSelected ? "white" : colors.primary}
          style={{ marginBottom: 8 }}
        />
        <Text
          style={{
            color: isSelected ? "white" : colors.text,
            fontSize: 14,
            fontWeight: "500",
            textAlign: "center",
          }}
        >
          {category.label}
        </Text>
        {isCustom && !isSelected && (
          <Ionicons
            name="star"
            size={12}
            color={colors.warning}
            style={{ position: "absolute", top: 8, right: 8 }}
          />
        )}
      </Pressable>
    );
  };

  return (
    <TickBoxCard>
      <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
        Event Category
      </Text>
      
      <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
        {/* Default Categories */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
          {DEFAULT_CATEGORIES.map(category => renderCategoryItem(category))}
        </View>

        {/* Custom Categories */}
        {customCategories.length > 0 && (
          <>
            <Text style={{ color: colors.textSecondary }} className="font-medium mb-3">
              Your Custom Categories
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
              {customCategories.map((category: string) => 
                renderCategoryItem({ id: category, label: category, icon: "star" }, true)
              )}
            </View>
          </>
        )}

        {/* Add Custom Category */}
        {showCustomInput ? (
          <View className="mb-4">
            <View className="flex-row items-center">
              <TextInput
                value={customCategory}
                onChangeText={setCustomCategory}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: colors.text,
                  backgroundColor: colors.surface,
                  marginRight: 8,
                }}
                placeholder="Enter custom category"
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                autoFocus
              />
              <Pressable
                onPress={handleAddCustomCategory}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginRight: 4,
                }}
              >
                <Text className="text-white font-medium">Add</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomCategory("");
                }}
                style={{
                  backgroundColor: colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={{ color: colors.textMuted }} className="text-xs mt-1">
              {customCategory.length}/20 characters
            </Text>
          </View>
        ) : canAddMore && (
          <Pressable
            onPress={() => setShowCustomInput(true)}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.border,
              borderStyle: "dashed",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={{ color: colors.primary }} className="font-medium">
              Add Custom Category
            </Text>
            <Text style={{ color: colors.textMuted }} className="text-xs mt-1">
              {customCategories.length}/{maxCustomCategories} custom categories
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Category Options Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowOptionsModal(false);
          setShowRenameInput(false);
          setSelectedForEdit(null);
          setRenameValue("");
        }}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 50 }}>
            <View className="flex-row justify-between items-center p-6 border-b" style={{ borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
                Manage Category
              </Text>
              <Pressable onPress={() => {
                setShowOptionsModal(false);
                setShowRenameInput(false);
                setSelectedForEdit(null);
                setRenameValue("");
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View className="p-6">
              {selectedForEdit && (
                <View className="mb-4">
                  <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}>
                    Category: <Text style={{ color: colors.text, fontWeight: "600" }}>{selectedForEdit.name}</Text>
                  </Text>
                  {selectedForEdit.isCustom && (
                    <Text style={{ color: colors.warning, fontSize: 12 }}>
                      Custom Category
                    </Text>
                  )}
                </View>
              )}

              {showRenameInput ? (
                <View className="mb-4">
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500", marginBottom: 8 }}>
                    New Name
                  </Text>
                  <View className="flex-row items-center">
                    <TextInput
                      value={renameValue}
                      onChangeText={setRenameValue}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: colors.text,
                        backgroundColor: colors.surface,
                        marginRight: 8,
                      }}
                      placeholder="Enter new name"
                      placeholderTextColor={colors.textMuted}
                      maxLength={20}
                      autoFocus
                    />
                    <Pressable
                      onPress={handleConfirmRename}
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-white font-medium">Save</Text>
                    </Pressable>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    {renameValue.length}/20 characters
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  <Pressable
                    onPress={handleRenameCategory}
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.text, fontSize: 16, marginLeft: 12 }}>
                      Rename Category
                    </Text>
                  </Pressable>

                  {selectedForEdit?.isCustom && (
                    <Pressable
                      onPress={handleDeleteCategory}
                      style={{
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 12,
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                      <Text style={{ color: colors.error, fontSize: 16, marginLeft: 12 }}>
                        Delete Category
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </TickBoxCard>
  );
}