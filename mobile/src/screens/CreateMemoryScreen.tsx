import React, { useState, useEffect } from "react";
import { Image } from "expo-image";
import { View, Text, Pressable, ScrollView, TextInput, Alert, Switch, KeyboardAvoidingView, Platform, Modal, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp as NavigationRouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { v4 as uuidv4 } from "uuid";
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
import CustomTimePicker from "../components/CustomTimePicker";
import { scheduleMemoryNotifications } from "../utils/notificationScheduler";
import * as FirebaseService from "../services/firebase";

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

const FREE_TICKET_LIMIT = 8; // Free users can only create 8 tickets

interface FormData {
  // Basic details
  title: string;
  location: string;
  date: Date;
  time: string;
  price: string;
  currency: Currency;
  category: string;

  // Photos and Videos
  uploadedImage?: string; // Initial ticket image
  coverPhoto?: string;    // Separate cover photo
  memoryPhotos: string[]; // Up to 10 additional photos
  memoryVideos: string[]; // Up to 3 videos

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
        memoryVideos: existingMemory.memoryVideos || [],
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
      memoryVideos: [],
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
        "Upload Ticket",
        "Choose how you'd like to add your ticket:",
        [
          { text: "Take Photo", onPress: () => handleCameraLaunch(type) },
          { text: "Choose from Library", onPress: () => handleImagePicker(type) },
          { text: "Upload File", onPress: () => handleDocumentPicker() },
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
    console.log('📷 CreateMemory: Checking camera permission...');

    // First check current permission status
    const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
    console.log('📷 CreateMemory: Current camera permission status:', currentStatus);

    let finalStatus = currentStatus;

    // If not determined yet, request permission (this shows the iOS system prompt)
    if (currentStatus === 'undetermined') {
      console.log('📷 CreateMemory: Requesting camera permission (will show iOS prompt)...');
      const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
      finalStatus = newStatus;
      console.log('📷 CreateMemory: Camera permission request result:', finalStatus);
    }

    // If permission is denied, show alert directing to Settings
    if (finalStatus === 'denied') {
      console.log('❌ CreateMemory: Camera permission denied - showing settings alert');
      Alert.alert(
        "Camera Access Required",
        "To take photos, please enable camera access in your device Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }
          }
        ]
      );
      return;
    }

    // Only launch camera if permission is granted
    if (finalStatus === 'granted') {
      console.log('✅ CreateMemory: Camera permission granted - launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: type === "cover", // Enable cropping for cover photos by default
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageResult(type, result.assets[0].uri);
      }
    }
  };

  const handleImagePicker = async (type: "upload" | "cover" | "memory") => {
    console.log('📸 CreateMemory: Checking photo library permission...');

    // First check current permission status
    const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    console.log('📸 CreateMemory: Current permission status:', currentStatus);

    let finalStatus = currentStatus;

    // If not determined yet, request permission (this shows the iOS system prompt)
    if (currentStatus === 'undetermined') {
      console.log('📸 CreateMemory: Requesting permission (will show iOS prompt)...');
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = newStatus;
      console.log('📸 CreateMemory: Permission request result:', finalStatus);
    }

    // If permission is denied, show alert directing to Settings
    if (finalStatus === 'denied') {
      console.log('❌ CreateMemory: Permission denied - showing settings alert');
      Alert.alert(
        "Photo Access Required",
        "To add photos to your memories, please enable photo access in your device Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }
          }
        ]
      );
      return;
    }

    // Only launch picker if permission is granted
    if (finalStatus === 'granted') {
      console.log('✅ CreateMemory: Permission granted - launching picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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

  const handleDocumentPicker = async () => {
    console.log('📄 CreateMemory: Opening document picker...');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📄 CreateMemory: Document selected:', asset.name, asset.mimeType);

        // Check if it's a PDF
        if (asset.mimeType === 'application/pdf') {
          // For PDFs, we'll store the URI and show a PDF indicator
          // The user will need to manually enter details since we can't extract from PDF
          setFormData({ ...formData, uploadedImage: asset.uri });
          setCurrentStep("details");
          Alert.alert(
            "PDF Uploaded",
            "Your ticket file has been uploaded. Please fill in the event details manually.",
            [{ text: "OK" }]
          );
        } else {
          // It's an image file
          setFormData({ ...formData, uploadedImage: asset.uri });
          setCurrentStep("details");
        }
      }
    } catch (error) {
      console.error('❌ CreateMemory: Document picker error:', error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  // Unified media picker for both photos and videos
  const handleMediaPicker = async () => {
    console.log('📸🎬 CreateMemory: Opening unified media picker...');

    try {
      // First check current permission status
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('📸🎬 CreateMemory: Current permission status:', currentStatus);

      let finalStatus = currentStatus;

      // If not determined yet, request permission
      if (currentStatus === 'undetermined') {
        console.log('📸🎬 CreateMemory: Requesting permission...');
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = newStatus;
        console.log('📸🎬 CreateMemory: Permission request result:', finalStatus);
      }

      // If permission is denied, show alert directing to Settings
      if (finalStatus === 'denied') {
        console.log('❌ CreateMemory: Permission denied - showing settings alert');
        Alert.alert(
          "Photo Library Access Required",
          "To add media to your memories, please enable photo library access in your device Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                }
              }
            }
          ]
        );
        return;
      }

      // Only launch picker if permission is granted
      if (finalStatus === 'granted') {
        console.log('✅ CreateMemory: Permission granted - launching media picker...');

        // Calculate remaining slots
        const remainingPhotoSlots = 10 - formData.memoryPhotos.length;
        const remainingVideoSlots = 3 - formData.memoryVideos.length;

        if (remainingPhotoSlots <= 0 && remainingVideoSlots <= 0) {
          Alert.alert("Limit Reached", "You've reached the maximum media limits (10 photos and 3 videos).");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'], // Allow both photos and videos
          allowsMultipleSelection: true,
          quality: 0.7, // Reduced quality to help with memory on physical devices
          videoMaxDuration: 60, // 60 seconds max for videos
          selectionLimit: remainingPhotoSlots + remainingVideoSlots, // Allow up to 10 photos + 3 videos total
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const newPhotos: string[] = [];
          const newVideos: string[] = [];

          // Separate photos and videos
          for (const asset of result.assets) {
            // Validate asset has a valid URI
            if (!asset.uri) {
              console.warn('⚠️ CreateMemory: Skipping asset with no URI');
              continue;
            }

            if (asset.type === 'video') {
              if (formData.memoryVideos.length + newVideos.length < 3) {
                newVideos.push(asset.uri);
                console.log('✅ CreateMemory: Video selected:', asset.uri);
              }
            } else {
              // Treat as image (includes 'image' type and undefined)
              if (formData.memoryPhotos.length + newPhotos.length < 10) {
                newPhotos.push(asset.uri);
                console.log('✅ CreateMemory: Photo selected:', asset.uri);
              }
            }
          }

          // Show warnings if limits were hit
          const photosSkipped = result.assets.filter(a => a.type !== 'video').length - newPhotos.length;
          const videosSkipped = result.assets.filter(a => a.type === 'video').length - newVideos.length;

          if (photosSkipped > 0 || videosSkipped > 0) {
            let message = "";
            if (photosSkipped > 0) message += `${photosSkipped} photo(s) skipped (max 10). `;
            if (videosSkipped > 0) message += `${videosSkipped} video(s) skipped (max 3).`;
            Alert.alert("Some Media Skipped", message.trim());
          }

          // Update state with new media
          setFormData({
            ...formData,
            memoryPhotos: [...formData.memoryPhotos, ...newPhotos],
            memoryVideos: [...formData.memoryVideos, ...newVideos]
          });

          console.log(`✅ CreateMemory: Added ${newPhotos.length} photos and ${newVideos.length} videos`);
        }
      }
    } catch (error) {
      console.error('❌ CreateMemory: Media picker error:', error);
      Alert.alert(
        "Error",
        "There was a problem selecting media. Please try again with fewer items.",
        [{ text: "OK" }]
      );
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
      console.log('📸 handleSave - Starting image uploads...');

      // Upload images to Firebase Storage and get download URLs
      let coverPhotoUrl = formData.coverPhoto;
      let uploadedImageUrl = formData.uploadedImage;
      let memoryPhotoUrls = [...formData.memoryPhotos];

      // Helper function to check if a URI is a local file
      const isLocalUri = (uri?: string) => uri && (uri.startsWith('file://') || uri.startsWith('content://'));

      // Upload cover photo if it's a local URI
      if (isLocalUri(coverPhotoUrl)) {
        try {
          console.log('📸 Uploading cover photo...');
          const coverPhotoPath = `memories/${user.id}/${uuidv4()}_cover.jpg`;
          coverPhotoUrl = await FirebaseService.uploadImage(coverPhotoUrl!, coverPhotoPath);
          console.log('✅ Cover photo uploaded:', coverPhotoUrl);
        } catch (error: any) {
          console.error('❌ Failed to upload cover photo:', error);
          const errorMessage = error?.message || 'Unknown error occurred';
          Alert.alert(
            "Upload Failed",
            `Failed to upload cover photo: ${errorMessage}. Please try selecting the image again.`,
            [{ text: "OK" }]
          );
          setIsLoading(false);
          return;
        }
      }

      // Upload ticket image if it's a local URI
      if (isLocalUri(uploadedImageUrl)) {
        try {
          console.log('📸 Uploading ticket image...');
          const uploadedImagePath = `memories/${user.id}/${uuidv4()}_ticket.jpg`;
          uploadedImageUrl = await FirebaseService.uploadImage(uploadedImageUrl!, uploadedImagePath);
          console.log('✅ Ticket image uploaded:', uploadedImageUrl);
        } catch (error: any) {
          console.error('❌ Failed to upload ticket image:', error);
          const errorMessage = error?.message || 'Unknown error occurred';
          Alert.alert(
            "Upload Failed",
            `Failed to upload ticket image: ${errorMessage}. Please try selecting the image again.`,
            [{ text: "OK" }]
          );
          setIsLoading(false);
          return;
        }
      }

      // Upload memory photos if they are local URIs - process sequentially to manage memory
      // CRITICAL: Use longer delays to prevent memory crashes on physical devices
      const uploadedMemoryPhotos: string[] = [];
      for (let i = 0; i < memoryPhotoUrls.length; i++) {
        const photoUri = memoryPhotoUrls[i];
        if (isLocalUri(photoUri)) {
          try {
            console.log(`📸 Uploading memory photo ${i + 1}/${memoryPhotoUrls.length}...`);
            const memoryPhotoPath = `memories/${user.id}/${uuidv4()}_memory_${i}.jpg`;
            const uploadedUrl = await FirebaseService.uploadImage(photoUri, memoryPhotoPath);
            uploadedMemoryPhotos.push(uploadedUrl);
            console.log(`✅ Memory photo ${i + 1} uploaded:`, uploadedUrl);

            // Longer delay between uploads to allow memory cleanup on physical devices
            // This is critical for preventing crashes on older iPhones (XS, 11, etc.)
            if (i < memoryPhotoUrls.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error: any) {
            console.error(`❌ Failed to upload memory photo ${i + 1}:`, error);
            const errorMessage = error?.message || 'Unknown error occurred';

            // Check for memory-related errors
            if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
              Alert.alert(
                "Memory Issue",
                "Your device ran out of memory while uploading. Try uploading fewer photos at once.",
                [{ text: "OK" }]
              );
            } else {
              Alert.alert(
                "Upload Failed",
                `Failed to upload memory photo ${i + 1}: ${errorMessage}. Please try again.`,
                [{ text: "OK" }]
              );
            }
            setIsLoading(false);
            return;
          }
        } else {
          // Keep existing Firebase URL
          uploadedMemoryPhotos.push(photoUri);
        }
      }

      console.log('✅ All images uploaded successfully');

      // Upload videos if they are local URIs - process sequentially with even longer delays
      // Videos are much larger and more likely to cause memory issues
      const uploadedMemoryVideos: string[] = [];
      for (let i = 0; i < formData.memoryVideos.length; i++) {
        const videoUri = formData.memoryVideos[i];
        if (isLocalUri(videoUri)) {
          try {
            console.log(`🎬 Uploading video ${i + 1}/${formData.memoryVideos.length}...`);
            const videoPath = `memories/${user.id}/${uuidv4()}_video_${i}.mp4`;
            const uploadedUrl = await FirebaseService.uploadVideo(videoUri, videoPath);
            uploadedMemoryVideos.push(uploadedUrl);
            console.log(`✅ Video ${i + 1} uploaded:`, uploadedUrl);

            // Much longer delay between video uploads (500ms) to allow memory cleanup
            // Videos can be 50-200MB each and cause significant memory pressure
            if (i < formData.memoryVideos.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error: any) {
            console.error(`❌ Failed to upload video ${i + 1}:`, error);
            const errorMessage = error?.message || 'Unknown error occurred';

            // Check for memory-related errors
            if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
              Alert.alert(
                "Memory Issue",
                "Your device ran out of memory while uploading videos. Try uploading shorter or fewer videos.",
                [{ text: "OK" }]
              );
            } else {
              Alert.alert(
                "Upload Failed",
                `Failed to upload video ${i + 1}: ${errorMessage}. Please try again.`,
                [{ text: "OK" }]
              );
            }
            setIsLoading(false);
            return;
          }
        } else {
          // Keep existing Firebase URL
          uploadedMemoryVideos.push(videoUri);
        }
      }

      console.log('✅ All media uploaded successfully');

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
        coverPhoto: coverPhotoUrl,
        memoryPhotos: uploadedMemoryPhotos,
        memoryVideos: uploadedMemoryVideos,
        seatingInfo: (!formData.generalAdmission && (formData.entrance || formData.block || formData.row || formData.seat)) ? Object.fromEntries(
          Object.entries({
            entrance: formData.entrance.trim() || undefined,
            block: formData.block.trim() || undefined,
            row: formData.row.trim() || undefined,
            seat: formData.seat.trim() || undefined,
          }).filter(([_, v]) => v !== undefined)
        ) as { entrance?: string; block?: string; row?: string; seat?: string } : undefined,
        taggedFriends: formData.taggedFriends,
        isProtected: isQRProtectionActive(),
        type: (flowType === "upload" ? "uploaded" : "digital") as "uploaded" | "digital",
        showOnFeed: formData.showOnFeed,
        uploadedImage: uploadedImageUrl,
      };

      if (isEditMode && editMemoryId) {
        // Update existing memory
        const updateMemory = useMemoryStore.getState().updateMemory;
        await updateMemory(editMemoryId, memoryData);
      } else {
        // Create new memory
        await addMemory(memoryData);
      }

      // Navigate to MainTabs to avoid navigation crash on TestFlight
      // Using reset ensures clean navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('❌ Error saving memory:', error);
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
                Add a photo or screenshot of your ticket
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
              <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 13 }}>
                Don't have your ticket?
              </Text>
              <Text style={{ color: colors.text }} className="text-lg font-semibold mb-2">
                Manually Add Details
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                Create a ticket by entering event details manually
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
                    source={formData.uploadedImage}
                    style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 16 }}
                    contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
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
                   <CustomTimePicker
                     time={formData.time}
                     onTimeChange={(time) => setFormData({ ...formData, time })}
                     label="Event Time"
                     placeholder="Select time"
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
                        source={formData.coverPhoto}
                        style={{ width: "100%", height: 150, borderRadius: 8, marginBottom: 12 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
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

              {/* Memory Media (Photos & Videos Combined) */}
              <TickBoxCard>
                <View className="flex-row items-center justify-between mb-4">
                  <Text style={{ color: colors.text }} className="text-lg font-semibold">
                    Memory Media
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    {formData.memoryPhotos.length} photos · {formData.memoryVideos.length} videos
                  </Text>
                </View>

                {/* Combined Media Grid */}
                {(formData.memoryPhotos.length > 0 || formData.memoryVideos.length > 0) && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                  >
                    {/* Photos */}
                    {formData.memoryPhotos.map((photo, index) => (
                      <View key={`photo-${index}`} className="mr-3 relative">
                        <Image
                          source={photo}
                          style={{ width: 80, height: 80, borderRadius: 8 }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={0}
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
                    {/* Videos */}
                    {formData.memoryVideos.map((video, index) => (
                      <View key={`video-${index}`} className="mr-3 relative">
                        <View
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            backgroundColor: colors.border,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="play-circle" size={32} color={colors.primary} />
                        </View>
                        <Pressable
                          onPress={() => {
                            const newVideos = formData.memoryVideos.filter((_, i) => i !== index);
                            setFormData({ ...formData, memoryVideos: newVideos });
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

                {/* Add Media Button */}
                {(formData.memoryPhotos.length < 10 || formData.memoryVideos.length < 3) && (
                  <Pressable
                    onPress={handleMediaPicker}
                    style={{
                      borderWidth: 2,
                      borderStyle: "dashed",
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingVertical: 20,
                      alignItems: "center",
                      backgroundColor: colors.surface,
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    <Text style={{ color: colors.primary, marginLeft: 8 }} className="font-semibold text-base">
                      Upload Media
                    </Text>
                  </Pressable>
                )}

                {/* Limits Info */}
                <Text style={{ color: colors.textMuted, marginTop: 12 }} className="text-xs text-center">
                  Up to 10 photos and 3 videos (60s max each)
                </Text>
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
                source={formData.coverPhoto}
                style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 16 }}
                contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
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

