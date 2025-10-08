import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, Image, Switch, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp as NavigationRouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useUserStore } from "../state/userStore";
import { useMemoryStore, Currency, EventCategory } from "../state/memoryStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import GradientBackground from "../components/GradientBackground";
import CategorySelector from "../components/CategorySelector";
import FriendTagger from "../components/FriendTagger";
import CustomDatePicker from "../components/CustomDatePicker";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "CreateMemory">;
type RouteParamProp = NavigationRouteProp<RootStackParamList, "CreateMemory">;

type FlowType = "upload" | "digital";
type CurrentStep = "select" | "upload" | "details" | "preview";
type DetailStep = 0 | 1 | 2 | 3; // 0: Event Details, 1: Photos, 2: Tag Friends, 3: Description

const DETAIL_STEPS = [
  { id: 0, title: "Event Details", icon: "information-circle" },
  { id: 1, title: "Photos", icon: "camera" },
  { id: 2, title: "Tag Friends", icon: "people" },
  { id: 3, title: "Details from the day!", icon: "document-text" },
];

const FREE_TICKET_LIMIT = 3; // Free users can only create 3 tickets

interface FormData {
  // Basic details
  title: string;
  location: string;
  date: Date;
  time: string;
  price: string;
  currency: Currency;
  category: string;
  
  // Photos
  uploadedImage?: string; // Initial ticket image
  coverPhoto?: string;    // Separate cover photo
  memoryPhotos: string[]; // Up to 10 additional photos
  
  // Social
  taggedFriends: string[];
  
  // Additional details
  description: string;
  showOnFeed: boolean;
  
  // Seating (for digital tickets)
  generalAdmission: boolean;
  entrance: string;
  block: string;
  row: string;
  seat: string;
}

export default function CreateMemoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParamProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const addMemory = useMemoryStore((state) => state.addMemory);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  // Flow state
  const isEditMode = route.params?.mode === "edit";
  const editMemoryId = route.params?.memoryId;
  const memories = useMemoryStore((state) => state.memories);
  const existingMemory = isEditMode && editMemoryId ? memories.find(m => m.id === editMemoryId) : null;
  
  // Check if user owns the memory they're trying to edit
  const canEdit = !isEditMode || (existingMemory && user && existingMemory.userId === user.id);

  // Check free ticket limit
  const userMemories = user ? memories.filter(m => m.userId === user.id) : [];
  const hasReachedFreeLimit = !isPremium && userMemories.length >= FREE_TICKET_LIMIT && !isEditMode;

  // Show paywall if user has reached free limit
  useEffect(() => {
    if (hasReachedFreeLimit) {
      Alert.alert(
        "Upgrade to Premium",
        `You have reached the free limit of ${FREE_TICKET_LIMIT} tickets. Upgrade to Premium for unlimited tickets!`,
        [
          {
            text: "Upgrade Now",
            onPress: () => {
              navigation.goBack();
              navigation.navigate("Subscription");
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [hasReachedFreeLimit, navigation]);

  const [flowType, setFlowType] = useState<FlowType | null>(
    route.params?.mode === "upload" ? "upload" : 
    route.params?.mode === "manual" ? "digital" :
    existingMemory ? (existingMemory.type === "uploaded" ? "upload" : "digital") : null
  );
  const [currentStep, setCurrentStep] = useState(isEditMode ? "details" : "select" as CurrentStep);
  const [detailStep, setDetailStep] = useState<DetailStep>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // Set initial step based on route params
  useEffect(() => {
    if (flowType && !isEditMode) {
      setCurrentStep(flowType === "upload" ? "upload" : "details");
    }
  }, [flowType, isEditMode]);

  // Form data
  const [formData, setFormData] = useState<FormData>(() => {
    if (existingMemory) {
      return {
        title: existingMemory.title,
        location: existingMemory.location,
        date: new Date(existingMemory.date),
        time: existingMemory.time || "",
        price: existingMemory.price?.toString() || "",
        currency: existingMemory.currency,
        category: existingMemory.category,
        uploadedImage: existingMemory.uploadedImage,
        coverPhoto: existingMemory.coverPhoto,
        memoryPhotos: existingMemory.memoryPhotos,
        taggedFriends: existingMemory.taggedFriends,
        description: existingMemory.description || "",
        showOnFeed: existingMemory.showOnFeed,
        generalAdmission: !existingMemory.seatingInfo,
        entrance: existingMemory.seatingInfo?.entrance || "",
        block: existingMemory.seatingInfo?.block || "",
        row: existingMemory.seatingInfo?.row || "",
        seat: existingMemory.seatingInfo?.seat || "",
      };
    }
    return {
      title: "",
      location: "",
      date: new Date(),
      time: "",
      price: "",
      currency: "GBP",
      category: "Concert",
      uploadedImage: undefined,
      coverPhoto: undefined,
      memoryPhotos: [],
      taggedFriends: [],
      description: "",
      showOnFeed: true,
      generalAdmission: false,
      entrance: "",
      block: "",
      row: "",
      seat: "",
    };
  });

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Image handling
  const showImagePickerOptions = (type: "upload" | "cover" | "memory") => {
    if (type === "upload") {
      Alert.alert(
        "Upload Ticket Photo",
        "Choose how you'd like to add your ticket photo:",
        [
          { text: "Take Photo", onPress: () => handleCameraLaunch(type) },
          { text: "Choose from Library", onPress: () => handleImagePicker(type) },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      Alert.alert(
        "Add Photo",
        "Choose how you'd like to add your photo:",
        [
          { text: "Take Photo", onPress: () => handleCameraLaunch(type) },
          { text: "Choose from Library", onPress: () => handleImagePicker(type) },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleCameraLaunch = async (type: "upload" | "cover" | "memory") => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert("Permission required", "Camera access is needed to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: type === "cover", // Enable cropping for cover photos by default
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageResult(type, result.assets[0].uri);
    }
  };

  const handleImagePicker = async (type: "upload" | "cover" | "memory") => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Photo library access is needed to select images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: type === "cover", // Enable cropping for cover photos only
      allowsMultipleSelection: type === "memory", // Enable multiple selection for memory photos
      quality: 0.9,
    });

    if (!result.canceled && result.assets) {
      if (type === "memory" && result.assets.length > 1) {
        // Handle multiple selections
        const newPhotos = result.assets.map(asset => asset.uri);
        const remainingSlots = 10 - formData.memoryPhotos.length;
        const photosToAdd = newPhotos.slice(0, remainingSlots);
        
        if (newPhotos.length > remainingSlots) {
          Alert.alert("Limit Reached", `You can only add ${remainingSlots} more photos. Only the first ${remainingSlots} photos were added.`);
        }
        
        setFormData({ 
          ...formData, 
          memoryPhotos: [...formData.memoryPhotos, ...photosToAdd] 
        });
      } else if (result.assets[0]) {
        handleImageResult(type, result.assets[0].uri);
      }
    }
  };

  const handleImageResult = (type: "upload" | "cover" | "memory", uri: string) => {
    switch (type) {
      case "upload":
        setFormData({ ...formData, uploadedImage: uri });
        setCurrentStep("details");
        break;
      case "cover":
        setFormData({ ...formData, coverPhoto: uri });
        break;
      case "memory":
        if (formData.memoryPhotos.length < 10) {
          setFormData({ 
            ...formData, 
            memoryPhotos: [...formData.memoryPhotos, uri] 
          });
        } else {
          Alert.alert("Limit Reached", "You can only add up to 10 memory photos.");
        }
        break;
    }
  };

  const removeMemoryPhoto = (index: number) => {
    const newPhotos = formData.memoryPhotos.filter((_, i) => i !== index);
    setFormData({ ...formData, memoryPhotos: newPhotos });
  };

  // Navigation helpers
  const handleNext = () => {
    if (currentStep === "details") {
      if (detailStep < 3) {
        setDetailStep((detailStep + 1) as DetailStep);
      } else {
        setCurrentStep("preview");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === "details") {
      if (detailStep > 0) {
        setDetailStep((detailStep - 1) as DetailStep);
      } else if (flowType === "upload") {
        setCurrentStep("upload");
      } else {
        setCurrentStep("select");
      }
    } else if (currentStep === "preview") {
      setCurrentStep("details");
      setDetailStep(3);
    } else if (currentStep === "upload") {
      setCurrentStep("select");
    }
  };

  const canProceed = () => {
    switch (detailStep) {
      case 0: // Event Details
        return formData.title.trim() && formData.date;
      case 1: // Photos
        return true; // Photos are optional
      case 2: // Tag Friends
        return true; // Tagging is optional
      case 3: // Description
        return true; // Description is optional
      default:
        return false;
    }
  };

  // QR Protection logic
  const isQRProtectionActive = () => {
    if (flowType !== "upload") return false;
    const eventDate = new Date(formData.date);
    const now = new Date();
    return eventDate > now; // Future events are QR protected
  };

  // Save functionality
  const handleSave = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in to save memories.");
      return;
    }
    
    // Check ownership for edit mode
    if (isEditMode && !canEdit) {
      Alert.alert("Error", "You can only edit your own memories.");
      navigation.goBack();
      return;
    }

    setIsLoading(true);
    try {
      const memoryData = {
        userId: user.id,
        title: formData.title.trim(),
        date: formData.date.toISOString(),
        time: formData.time.trim() || undefined,
        location: formData.location.trim(),
        price: formData.price ? parseFloat(formData.price) : undefined,
        currency: formData.currency,
        category: formData.category as EventCategory,
        description: formData.description.trim() || undefined,
        coverPhoto: formData.coverPhoto,
        memoryPhotos: formData.memoryPhotos,
        seatingInfo: (!formData.generalAdmission && (formData.entrance || formData.block || formData.row || formData.seat)) ? {
          entrance: formData.entrance.trim() || undefined,
          block: formData.block.trim() || undefined,
          row: formData.row.trim() || undefined,
          seat: formData.seat.trim() || undefined,
        } : undefined,
        taggedFriends: formData.taggedFriends,
        isProtected: isQRProtectionActive(),
        type: (flowType === "upload" ? "uploaded" : "digital") as "uploaded" | "digital",
        showOnFeed: formData.showOnFeed,
        uploadedImage: formData.uploadedImage,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isEditMode && editMemoryId) {
        // Update existing memory
        const updateMemory = useMemoryStore.getState().updateMemory;
        updateMemory(editMemoryId, memoryData);
      } else {
        // Create new memory
        addMemory(memoryData);
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", `Failed to ${isEditMode ? "update" : "save"} memory. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render different steps
  const renderFlowSelection = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="items-center mb-8">
          <View style={{ backgroundColor: `${colors.primary}20` }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
            <Ionicons name="ticket" size={32} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">
            {isEditMode ? "Edit Memory" : "Create Memory"}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-center text-base">
            {isEditMode ? "Update your memory details" : "How would you like to create your memory?"}
          </Text>
        </View>

        {/* Upload Ticket Option */}
        <TickBoxCard style={{ marginBottom: 16 }} noPadding>
          <Pressable
            onPress={() => {
              setFlowType("upload");
              setCurrentStep("upload");
            }}
            style={{ padding: 24 }}
          >
            <View className="items-center">
              <View style={{ backgroundColor: `${colors.primary}20` }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-2">
                Upload Ticket
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Take a photo of your ticket and let us extract the details
              </Text>
            </View>
          </Pressable>
        </TickBoxCard>

        {/* Create Digital Ticket Option */}
        <TickBoxCard noPadding>
          <Pressable
            onPress={() => {
              setFlowType("digital");
              setCurrentStep("details");
            }}
            style={{ padding: 24 }}
          >
            <View className="items-center">
              <View style={{ backgroundColor: `${colors.success}20` }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="create-outline" size={32} color={colors.success} />
              </View>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-2">
                Create Digital Ticket
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Manually enter event details and information
              </Text>
            </View>
          </Pressable>
        </TickBoxCard>
      </View>
    </SafeAreaView>
  );

  const renderUploadStep = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <View className="py-6">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <Pressable onPress={handlePrevious} className="mr-4">
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={{ color: colors.text }} className="text-xl font-bold">
              Upload Ticket Photo
            </Text>
          </View>

          {/* Upload Area */}
          <TickBoxCard style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
              Ticket Photo
            </Text>
            
            <Pressable
              onPress={() => showImagePickerOptions("upload")}
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: colors.border,
                borderRadius: 16,
                padding: 40,
                alignItems: "center",
                backgroundColor: colors.surface,
              }}
            >
              {formData.uploadedImage ? (
                <View className="items-center w-full">
                  <Image
                    source={{ uri: formData.uploadedImage }}
                    style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 16 }}
                    resizeMode="cover"
                  />
                  <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                  <Text style={{ color: colors.success }} className="font-medium mt-2">
                    Photo Uploaded
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm mt-1">
                    Tap to change photo
                  </Text>
                </View>
              ) : (
                <View className="items-center">
                  <Ionicons name="cloud-upload-outline" size={48} color={colors.textMuted} />
                  <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
                    Upload Your Ticket
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-center text-sm">
                    Take a photo or select from your library{"\n"}
                    We'll extract the details automatically
                  </Text>
                </View>
              )}
            </Pressable>
          </TickBoxCard>

          {formData.uploadedImage && (
            <GradientBackground style={{ borderRadius: 16 }}>
              <Pressable
                onPress={() => setCurrentStep("details")}
                style={{ paddingVertical: 16 }}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Continue to Details
                </Text>
              </Pressable>
            </GradientBackground>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Due to length constraints, I'll continue with the remaining render functions in the next part
  // For now, let me provide the basic structure and we can expand

  if (currentStep === "select") {
    return renderFlowSelection();
  }

  if (currentStep === "upload") {
    return renderUploadStep();
  }

  const renderDetailsStep = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
          <View className="py-6">
          {/* Header with Progress */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Pressable onPress={handlePrevious} className="mr-4">
                <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
              </Pressable>
              <Text style={{ color: colors.text }} className="text-xl font-bold flex-1">
                {isEditMode ? "Edit Memory" : DETAIL_STEPS[detailStep].title}
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View className="flex-row items-center mb-2">
              {DETAIL_STEPS.map((step, index) => (
                <View key={step.id} className="flex-1 flex-row items-center">
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: index <= detailStep ? colors.primary : colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: index < DETAIL_STEPS.length - 1 ? 8 : 0,
                    }}
                  >
                    <Ionicons
                      name={step.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={index <= detailStep ? "white" : colors.textMuted}
                    />
                  </View>
                  {index < DETAIL_STEPS.length - 1 && (
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        backgroundColor: index < detailStep ? colors.primary : colors.border,
                        marginHorizontal: 8,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Step Content */}
          {detailStep === 0 && (
            <View>
              {/* Event Details */}
              <TickBoxCard style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                  Event Information
                </Text>
                
                <View className="mb-4">
                  <Text style={{ color: colors.text }} className="font-medium mb-2">
                    Event Title *
                  </Text>
                  <TextInput
                    value={formData.title}
                    onChangeText={(value) => setFormData({ ...formData, title: value })}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      color: colors.text,
                      backgroundColor: colors.surface,
                    }}
                    placeholder="Enter event title"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View className="mb-4">
                  <CustomDatePicker
                    date={formData.date}
                    onDateChange={(date) => setFormData({ ...formData, date })}
                    label="Event Date"
                    required
                  />
                </View>

                 <View className="mb-4">
                   <Text style={{ color: colors.text }} className="font-medium mb-2">
                     Event Time
                   </Text>
                   <TextInput
                     value={formData.time}
                     onChangeText={(value) => setFormData({ ...formData, time: value })}
                     style={{
                       borderWidth: 1,
                       borderColor: colors.border,
                       borderRadius: 12,
                       paddingHorizontal: 16,
                       paddingVertical: 12,
                       color: colors.text,
                       backgroundColor: colors.surface,
                     }}
                     placeholder="e.g. 7:30 PM"
                     placeholderTextColor={colors.textMuted}
                   />
                 </View>

                 <View className="mb-4">
                   <Text style={{ color: colors.text }} className="font-medium mb-2">
                     Location
                   </Text>
                   <TextInput
                     value={formData.location}
                     onChangeText={(value) => setFormData({ ...formData, location: value })}
                     style={{
                       borderWidth: 1,
                       borderColor: colors.border,
                       borderRadius: 12,
                       paddingHorizontal: 16,
                       paddingVertical: 12,
                       color: colors.text,
                       backgroundColor: colors.surface,
                     }}
                     placeholder="Enter venue or location"
                     placeholderTextColor={colors.textMuted}
                   />
                 </View>

                  {/* Price Section */}
                  <View className="mb-4">
                    <Text style={{ color: colors.text }} className="font-medium mb-2">
                      Ticket Price
                    </Text>
                    <View className="flex-row space-x-3">
                      <View className="flex-1">
                        <TextInput
                          value={formData.price}
                          onChangeText={(value) => setFormData({ ...formData, price: value })}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            color: colors.text,
                            backgroundColor: colors.surface,
                          }}
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                      <Pressable 
                        onPress={() => setShowCurrencyModal(true)}
                        style={{ 
                          width: 100,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 12,
                          backgroundColor: colors.surface,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: "600" }}>
                          {formData.currency}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
              </TickBoxCard>

               <CategorySelector
                 selectedCategory={formData.category}
                 onCategorySelect={(category) => setFormData({ ...formData, category })}
               />

               {/* Seating Information - Only for digital creation */}
               {flowType === "digital" && (
                 <TickBoxCard style={{ marginTop: 16 }}>
                   <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                     Seating Information (Optional)
                   </Text>
                   
                   <View className="mb-4">
                     <View className="flex-row items-center justify-between mb-3">
                       <Text style={{ color: colors.text }} className="font-medium">
                         General Admission
                       </Text>
                       <Switch
                         value={formData.generalAdmission}
                         onValueChange={(value) => setFormData({ ...formData, generalAdmission: value })}
                         trackColor={{ false: colors.border, true: colors.primary }}
                         thumbColor="white"
                       />
                     </View>
                     {!formData.generalAdmission && (
                       <Text style={{ color: colors.textSecondary }} className="text-sm">
                         Fill in your specific seating details below
                       </Text>
                     )}
                   </View>

                   {!formData.generalAdmission && (
                     <View className="space-y-4">
                       {/* Entrance */}
                       <View>
                         <Text style={{ color: colors.text }} className="font-medium mb-2">
                           Entrance
                         </Text>
                         <TextInput
                           value={formData.entrance}
                           onChangeText={(value) => setFormData({ ...formData, entrance: value })}
                           style={{
                             borderWidth: 1,
                             borderColor: colors.border,
                             borderRadius: 12,
                             paddingHorizontal: 16,
                             paddingVertical: 12,
                             color: colors.text,
                             backgroundColor: colors.surface,
                           }}
                           placeholder="e.g. Main Stand, Gate A"
                           placeholderTextColor={colors.textMuted}
                         />
                       </View>

                       {/* Block */}
                       <View>
                         <Text style={{ color: colors.text }} className="font-medium mb-2">
                           Block/Section
                         </Text>
                         <TextInput
                           value={formData.block}
                           onChangeText={(value) => setFormData({ ...formData, block: value })}
                           style={{
                             borderWidth: 1,
                             borderColor: colors.border,
                             borderRadius: 12,
                             paddingHorizontal: 16,
                             paddingVertical: 12,
                             color: colors.text,
                             backgroundColor: colors.surface,
                           }}
                           placeholder="e.g. Block A, Section 101"
                           placeholderTextColor={colors.textMuted}
                         />
                       </View>

                       {/* Row and Seat */}
                       <View className="flex-row space-x-3">
                         <View className="flex-1">
                           <Text style={{ color: colors.text }} className="font-medium mb-2">
                             Row
                           </Text>
                           <TextInput
                             value={formData.row}
                             onChangeText={(value) => setFormData({ ...formData, row: value })}
                             style={{
                               borderWidth: 1,
                               borderColor: colors.border,
                               borderRadius: 12,
                               paddingHorizontal: 16,
                               paddingVertical: 12,
                               color: colors.text,
                               backgroundColor: colors.surface,
                             }}
                             placeholder="e.g. Row 5, J"
                             placeholderTextColor={colors.textMuted}
                           />
                         </View>
                         <View className="flex-1">
                           <Text style={{ color: colors.text }} className="font-medium mb-2">
                             Seat
                           </Text>
                           <TextInput
                             value={formData.seat}
                             onChangeText={(value) => setFormData({ ...formData, seat: value })}
                             style={{
                               borderWidth: 1,
                               borderColor: colors.border,
                               borderRadius: 12,
                               paddingHorizontal: 16,
                               paddingVertical: 12,
                               color: colors.text,
                               backgroundColor: colors.surface,
                             }}
                             placeholder="e.g. Seat 15, 12A"
                             placeholderTextColor={colors.textMuted}
                           />
                         </View>
                       </View>
                     </View>
                   )}
                 </TickBoxCard>
               )}
            </View>
          )}

          {detailStep === 1 && (
            <View>
              {/* Photos */}
              <TickBoxCard style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                  Cover Photo
                </Text>
                <Pressable
                  onPress={() => showImagePickerOptions("cover")}
                  style={{
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 24,
                    alignItems: "center",
                  }}
                >
                  {formData.coverPhoto ? (
                    <View className="items-center w-full">
                      <Image
                        source={{ uri: formData.coverPhoto }}
                        style={{ width: "100%", height: 150, borderRadius: 8, marginBottom: 12 }}
                        resizeMode="cover"
                      />
                      <Text style={{ color: colors.success }} className="font-medium">
                        Cover Photo Set
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        Tap to change
                      </Text>
                    </View>
                  ) : (
                    <View className="items-center">
                      <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                      <Text style={{ color: colors.text }} className="font-medium mt-2">
                        Add Cover Photo
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        Optional - will use ticket photo if not set
                      </Text>
                    </View>
                  )}
                </Pressable>
              </TickBoxCard>

              {/* Memory Photos */}
              <TickBoxCard>
                <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                  Memory Photos ({formData.memoryPhotos.length}/10)
                </Text>
                
                {formData.memoryPhotos.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                  >
                    {formData.memoryPhotos.map((photo, index) => (
                      <View key={index} className="mr-3 relative">
                        <Image
                          source={{ uri: photo }}
                          style={{ width: 80, height: 80, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                        <Pressable
                          onPress={() => {
                            const newPhotos = formData.memoryPhotos.filter((_, i) => i !== index);
                            setFormData({ ...formData, memoryPhotos: newPhotos });
                          }}
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            backgroundColor: colors.error,
                            borderRadius: 12,
                            width: 24,
                            height: 24,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="close" size={14} color="white" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {formData.memoryPhotos.length < 10 && (
                  <Pressable
                    onPress={() => showImagePickerOptions("memory")}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      padding: 16,
                      alignItems: "center",
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    <Text style={{ color: colors.primary }} className="font-medium mt-1">
                      Add Memory Photos
                    </Text>
                  </Pressable>
                )}
              </TickBoxCard>
            </View>
          )}

          {detailStep === 2 && (
            <FriendTagger
              selectedFriends={formData.taggedFriends}
              onFriendsChange={(friends) => setFormData({ ...formData, taggedFriends: friends })}
            />
          )}

          {detailStep === 3 && (
            <View>
              <TickBoxCard style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
                  Description
                </Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(value) => setFormData({ ...formData, description: value })}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    backgroundColor: colors.surface,
                    minHeight: 100,
                    textAlignVertical: "top",
                  }}
                  placeholder="Share details from the day..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                />
              </TickBoxCard>

              <TickBoxCard>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="font-medium">
                      Show on Friends' Feed
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm">
                      Let friends see this memory in their activity feed
                    </Text>
                  </View>
                  <Switch
                    value={formData.showOnFeed}
                    onValueChange={(value) => setFormData({ ...formData, showOnFeed: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="white"
                  />
                </View>
              </TickBoxCard>
            </View>
          )}

          {/* Navigation Buttons */}
          <View className="flex-row mt-6 space-x-3">
            <Pressable
              onPress={handlePrevious}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textSecondary }} className="font-medium">
                Previous
              </Text>
            </Pressable>
            
            <Pressable
              onPress={detailStep < 3 ? handleNext : () => setCurrentStep("preview")}
              disabled={!canProceed()}
              style={{
                flex: 2,
                backgroundColor: canProceed() ? colors.primary : colors.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{ 
                  color: canProceed() ? "white" : colors.textMuted,
                }}
                className="font-medium"
              >
                {detailStep < 3 ? "Next" : "Preview"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderPreviewStep = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <View className="py-6">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <Pressable onPress={handlePrevious} className="mr-4">
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={{ color: colors.text }} className="text-xl font-bold">
              Preview Memory
            </Text>
          </View>

          {/* QR Protection Info */}
          {isQRProtectionActive() && (
            <TickBoxCard style={{ marginBottom: 16, backgroundColor: `${colors.primary}20` }}>
              <View className="flex-row items-start">
                <Ionicons 
                  name="shield-checkmark" 
                  size={20} 
                  color={colors.primary} 
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text style={{ color: colors.primary }} className="font-semibold mb-2">
                    QR Protection Active
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    This memory will be temporarily private since the event is in the future. 
                    It will become visible to friends after the event date.
                  </Text>
                </View>
              </View>
            </TickBoxCard>
          )}

          {/* Memory Preview */}
          <TickBoxCard style={{ marginBottom: 24 }}>
            {/* Cover Image */}
            {formData.coverPhoto && (
              <Image
                source={{ uri: formData.coverPhoto }}
                style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 16 }}
                resizeMode="cover"
              />
            )}

            {/* Title and Details */}
            <Text style={{ color: colors.text }} className="text-2xl font-bold mb-2">
              {formData.title}
            </Text>
            
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="ml-2">
                {formData.date.toLocaleDateString("en-US", { 
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </Text>
            </View>

            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="ml-2">
                {formData.location}
              </Text>
            </View>

            <View className="flex-row items-center mb-4">
              <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="ml-2">
                {formData.category}
              </Text>
            </View>

            {formData.description && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
                <Text style={{ color: colors.text }} className="leading-6">
                  {formData.description}
                </Text>
              </>
            )}

            {formData.taggedFriends.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
                <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
                  Tagged {formData.taggedFriends.length} friend{formData.taggedFriends.length > 1 ? "s" : ""}
                </Text>
              </>
            )}
          </TickBoxCard>

          {/* Action Buttons */}
          <View className="flex-row space-x-3">
            <Pressable
              onPress={() => {
                setCurrentStep("details");
                setDetailStep(3);
              }}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textSecondary }} className="font-medium">
                Edit Details
              </Text>
            </Pressable>
            
            <GradientBackground style={{ flex: 2, borderRadius: 12 }}>
              <Pressable
                onPress={handleSave}
                disabled={isLoading}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                <Text className="text-white font-semibold text-lg">
                  {isLoading ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update Memory" : "Save Memory")}
                </Text>
              </Pressable>
            </GradientBackground>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Check authorization for edit mode
  if (isEditMode && !canEdit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
          <Text style={{ color: colors.text }} className="text-xl font-bold mt-4 mb-2 text-center">
            Access Denied
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-center mb-6">
            You can only edit your own memories.
          </Text>
          <Pressable 
            onPress={() => navigation.goBack()}
            className="bg-primary px-6 py-3 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-medium">
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currencies: { code: Currency; symbol: string; name: string }[] = [
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
  ];

  // Currency Modal Component
  const renderCurrencyModal = () => (
    <Modal
      visible={showCurrencyModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCurrencyModal(false)}
    >
      <Pressable 
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        onPress={() => setShowCurrencyModal(false)}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View 
            style={{ 
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              paddingBottom: 40,
            }}
          >
            {/* Handle Bar */}
            <View className="items-center py-3">
              <View 
                style={{ 
                  width: 40, 
                  height: 4, 
                  backgroundColor: colors.border, 
                  borderRadius: 2 
                }} 
              />
            </View>

            {/* Header */}
            <View className="px-6 mb-4">
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                Select Currency
              </Text>
            </View>

            {/* Currency Options */}
            <ScrollView style={{ maxHeight: 400 }}>
              {currencies.map((currency) => (
                <Pressable
                  key={currency.code}
                  onPress={() => {
                    setFormData({ ...formData, currency: currency.code });
                    setShowCurrencyModal(false);
                  }}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    backgroundColor: formData.currency === currency.code ? `${colors.primary}15` : "transparent",
                    borderLeftWidth: 4,
                    borderLeftColor: formData.currency === currency.code ? colors.primary : "transparent",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View 
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
                          {currency.symbol}
                        </Text>
                      </View>
                      <View>
                        <Text 
                          style={{ 
                            color: colors.text, 
                            fontSize: 16, 
                            fontWeight: formData.currency === currency.code ? "600" : "500" 
                          }}
                        >
                          {currency.code}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                          {currency.name}
                        </Text>
                      </View>
                    </View>
                    {formData.currency === currency.code && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // Main render logic
  if (currentStep === "preview") {
    return (
      <>
        {renderPreviewStep()}
        {renderCurrencyModal()}
      </>
    );
  }
  
  if (currentStep === "details") {
    return (
      <>
        {renderDetailsStep()}
        {renderCurrencyModal()}
      </>
    );
  }
  
  if (currentStep === "upload") {
    return (
      <>
        {renderUploadStep()}
        {renderCurrencyModal()}
      </>
    );
  }
  
  // Default to selection screen
  return renderFlowSelection();
}