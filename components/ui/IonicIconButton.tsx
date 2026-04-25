import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

interface IconButtonProps {
  icon: "exit" | "link" | "search" | "add-outline" | "book";
  color: string | undefined;
  size: number;
  onPress(): void;
}

const IonicIconButton: React.FC<IconButtonProps> = ({ icon, color, size, onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} color={color} size={size} />
    </Pressable>
  );
};

export default IonicIconButton;

const styles = StyleSheet.create({
  button: {
    margin: 8,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
