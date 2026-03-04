import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUserStore } from "../state/userStore";
import { useMemoryStore } from "../state/memoryStore";
import { useTheme } from "../contexts/ThemeContext";
import TickBoxCard from "../components/TickBoxCard";
import { getCurrencySymbol } from "../utils/currencies";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: screenWidth } = Dimensions.get("window");

export default function DetailedStatsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const memories = useMemoryStore((state) => state.memories);
  const filterMemories = useMemoryStore((state) => state.filterMemories);

  const userMemories = useMemo(() => {
    if (!user) return [];
    return filterMemories({ userId: user.id, sortBy: "date" });
  }, [user, filterMemories, memories]);

  // Calculate category breakdown
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; totalSpent: number }> = {};

    userMemories.forEach((memory) => {
      if (!stats[memory.category]) {
        stats[memory.category] = { count: 0, totalSpent: 0 };
      }
      stats[memory.category].count += 1;
      stats[memory.category].totalSpent += memory.price || 0;
    });

    return Object.entries(stats)
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalSpent: data.totalSpent,
        percentage: userMemories.length > 0 ? (data.count / userMemories.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [userMemories]);

  // Calculate monthly spending
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { count: number; totalSpent: number }> = {};
    const now = new Date();

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      stats[key] = { count: 0, totalSpent: 0 };
    }

    userMemories.forEach((memory) => {
      const memoryDate = new Date(memory.date);
      const key = memoryDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (stats[key]) {
        stats[key].count += 1;
        stats[key].totalSpent += memory.price || 0;
      }
    });

    return Object.entries(stats).map(([month, data]) => ({
      month,
      count: data.count,
      totalSpent: data.totalSpent,
    }));
  }, [userMemories]);

  // Calculate year-over-year stats
  const yearlyStats = useMemo(() => {
    const stats: Record<number, { count: number; totalSpent: number }> = {};

    userMemories.forEach((memory) => {
      const year = new Date(memory.date).getFullYear();
      if (!stats[year]) {
        stats[year] = { count: 0, totalSpent: 0 };
      }
      stats[year].count += 1;
      stats[year].totalSpent += memory.price || 0;
    });

    return Object.entries(stats)
      .map(([year, data]) => ({
        year: parseInt(year),
        count: data.count,
        totalSpent: data.totalSpent,
      }))
      .sort((a, b) => b.year - a.year);
  }, [userMemories]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalSpent = userMemories.reduce((sum, m) => sum + (m.price || 0), 0);
    const avgTicketPrice = userMemories.length > 0 ? totalSpent / userMemories.length : 0;
    const mostExpensive = userMemories.reduce(
      (max, m) => (m.price || 0) > (max?.price || 0) ? m : max,
      userMemories[0]
    );
    const uniqueLocations = new Set(userMemories.map(m => m.location)).size;

    return {
      totalTickets: userMemories.length,
      totalSpent,
      avgTicketPrice,
      mostExpensive,
      uniqueLocations,
    };
  }, [userMemories]);

  if (!user) return null;

  const maxMonthlySpent = Math.max(...monthlyStats.map(m => m.totalSpent), 1);
  const maxCategoryCount = Math.max(...categoryStats.map(c => c.count), 1);

  // Category colors
  const getCategoryColor = (index: number) => {
    const categoryColors = [
      colors.primary,
      colors.success,
      colors.warning,
      colors.error,
      colors.accent,
      "#9B59B6",
      "#1ABC9C",
      "#E67E22",
    ];
    return categoryColors[index % categoryColors.length];
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
        {/* Overview Cards */}
        <View className="flex-row flex-wrap justify-between mb-6">
          <TickBoxCard style={{ width: "48%", marginBottom: 12 }}>
            <View className="items-center">
              <View
                style={{
                  backgroundColor: colors.primary + "20",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="ticket" size={22} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold" }}>
                {overallStats.totalTickets}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Memories
              </Text>
            </View>
          </TickBoxCard>

          <TickBoxCard style={{ width: "48%", marginBottom: 12 }}>
            <View className="items-center">
              <View
                style={{
                  backgroundColor: colors.success + "20",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="wallet" size={22} color={colors.success} />
              </View>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold" }}>
                {getCurrencySymbol(user.preferredCurrency)}{overallStats.totalSpent.toFixed(0)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Spent
              </Text>
            </View>
          </TickBoxCard>

          <TickBoxCard style={{ width: "48%", marginBottom: 12 }}>
            <View className="items-center">
              <View
                style={{
                  backgroundColor: colors.warning + "20",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="calculator" size={22} color={colors.warning} />
              </View>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold" }}>
                {getCurrencySymbol(user.preferredCurrency)}{overallStats.avgTicketPrice.toFixed(0)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Avg. Ticket Price
              </Text>
            </View>
          </TickBoxCard>

          <TickBoxCard style={{ width: "48%", marginBottom: 12 }}>
            <View className="items-center">
              <View
                style={{
                  backgroundColor: colors.accent + "20",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="location" size={22} color={colors.accent} />
              </View>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold" }}>
                {overallStats.uniqueLocations}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Unique Venues
              </Text>
            </View>
          </TickBoxCard>
        </View>

        {/* Category Breakdown */}
        <TickBoxCard style={{ marginBottom: 16 }}>
          <View className="flex-row items-center mb-4">
            <Ionicons name="pie-chart" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
              Category Breakdown
            </Text>
          </View>

          {categoryStats.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }}>
              No memories yet
            </Text>
          ) : (
            categoryStats.map((cat, index) => (
              <View key={cat.category} className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <View className="flex-row items-center">
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: getCategoryColor(index),
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ color: colors.text, fontWeight: "500" }}>
                      {cat.category}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary }}>
                    {cat.count} ({cat.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.border,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${(cat.count / maxCategoryCount) * 100}%`,
                      backgroundColor: getCategoryColor(index),
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  {getCurrencySymbol(user.preferredCurrency)}{cat.totalSpent.toFixed(2)} spent
                </Text>
              </View>
            ))
          )}
        </TickBoxCard>

        {/* Monthly Spending Chart */}
        <TickBoxCard style={{ marginBottom: 16 }}>
          <View className="flex-row items-center mb-4">
            <Ionicons name="bar-chart" size={20} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
              Monthly Spending
            </Text>
          </View>

          <View className="flex-row justify-between items-end" style={{ height: 120 }}>
            {monthlyStats.map((month, index) => (
              <View key={month.month} className="items-center" style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 4 }}>
                  {getCurrencySymbol(user.preferredCurrency)}{month.totalSpent.toFixed(0)}
                </Text>
                <View
                  style={{
                    width: 24,
                    height: Math.max((month.totalSpent / maxMonthlySpent) * 80, 4),
                    backgroundColor: month.totalSpent > 0 ? colors.success : colors.border,
                    borderRadius: 4,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>
                  {month.month.split(" ")[0]}
                </Text>
              </View>
            ))}
          </View>
        </TickBoxCard>

        {/* Yearly Comparison */}
        {yearlyStats.length > 0 && (
          <TickBoxCard style={{ marginBottom: 16 }}>
            <View className="flex-row items-center mb-4">
              <Ionicons name="calendar" size={20} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
                Year by Year
              </Text>
            </View>

            {yearlyStats.map((year, index) => (
              <View
                key={year.year}
                className="flex-row items-center justify-between py-3"
                style={{
                  borderBottomWidth: index < yearlyStats.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                  {year.year}
                </Text>
                <View className="items-end">
                  <Text style={{ color: colors.text, fontWeight: "500" }}>
                    {year.count} {year.count === 1 ? "memory" : "memories"}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {getCurrencySymbol(user.preferredCurrency)}{year.totalSpent.toFixed(2)} spent
                  </Text>
                </View>
              </View>
            ))}
          </TickBoxCard>
        )}

        {/* Most Expensive Memory */}
        {overallStats.mostExpensive && overallStats.mostExpensive.price && (
          <TickBoxCard style={{ marginBottom: 32 }}>
            <View className="flex-row items-center mb-4">
              <Ionicons name="trophy" size={20} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
                Most Expensive Memory
              </Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate("MemoryDetail", { memoryId: overallStats.mostExpensive!.id })}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
                {overallStats.mostExpensive.title}
              </Text>
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {new Date(overallStats.mostExpensive.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "bold" }}>
                  {getCurrencySymbol(user.preferredCurrency)}{overallStats.mostExpensive.price?.toFixed(2)}
                </Text>
              </View>
            </Pressable>
          </TickBoxCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
