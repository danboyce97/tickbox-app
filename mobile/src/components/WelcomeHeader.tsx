import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GradientBackground from "./GradientBackground";
interface WelcomeHeaderProps {
  userName: string;
  greeting: string;
  memoryCount: number;
}

export default function WelcomeHeader({ userName, greeting, memoryCount }: WelcomeHeaderProps) {

  return (
    <GradientBackground 
      style={{ 
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <View className="items-center">
        <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-4">
          <Ionicons name="ticket" size={32} color="white" />
        </View>
        
        <Text className="text-white text-2xl font-bold mb-2 text-center">
          {greeting}, {userName}!
        </Text>
        
        <Text className="text-white/90 text-center text-lg mb-4">
          {memoryCount === 0 
            ? "Ready to capture your first memory?" 
            : `You have ${memoryCount} amazing ${memoryCount === 1 ? 'memory' : 'memories'}`
          }
        </Text>

        {memoryCount > 0 && (
          <View className="flex-row items-center bg-white/20 rounded-full px-4 py-2">
            <Ionicons name="star" size={16} color="white" />
            <Text className="text-white font-medium ml-2">
              Your Memory Collection
            </Text>
          </View>
        )}
      </View>
    </GradientBackground>
  );
}