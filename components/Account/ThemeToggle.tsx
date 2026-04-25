import Fontisto from "@expo/vector-icons/Fontisto";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const ThemeToggle = () => {
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">("light");

  return (
    <View style={styles.container}>
      {/* Light Account Button */}
      <View style={styles.themeContainer}>
        <TouchableOpacity
          style={[
            styles.circleButton,
            selectedTheme === "light" ? styles.activeButton : styles.inactiveButton,
          ]}
          onPress={() => setSelectedTheme("light")}
        >
          <Fontisto name="day-sunny" size={24} color="black" />
        </TouchableOpacity>
        <Text style={[styles.label, selectedTheme === "light" && styles.activeLabel]}>Light</Text>
      </View>

      {/* Dark Account Button */}
      <View style={styles.themeContainer}>
        <TouchableOpacity
          style={[
            styles.circleButton,
            selectedTheme === "dark" ? styles.activeButton : styles.inactiveButton,
          ]}
          onPress={() => setSelectedTheme("dark")}
        >
          <Ionicons name="moon-sharp" size={24} color="black" />
        </TouchableOpacity>
        <Text style={[styles.label, selectedTheme === "dark" && styles.activeLabel]}>Dark</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  themeContainer: {
    alignItems: "center",
    marginHorizontal: 5,
  },
  circleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  activeButton: {
    backgroundColor: "#FFA500", // Active button background (orange)
    borderColor: "#FFA500",
  },
  inactiveButton: {
    backgroundColor: "#E0E0E0", // Inactive button background (gray)
    borderColor: "#CCCCCC",
  },
  label: {
    marginTop: 5,
    fontSize: 14,
    color: "#000000", // Default label color
  },
  activeLabel: {
    color: "#FFA500", // Label color when active
  },
});

export default ThemeToggle;
