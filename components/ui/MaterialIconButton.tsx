import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

interface IconButtonProps {
  icon: "account-circle";
  color: string | undefined;
  size: number;
  onPress(): void;
}

const MaterialIconButton: React.FC<IconButtonProps> = ({ icon, color, size, onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} color={color} size={size} />
    </Pressable>
  );
};

export default MaterialIconButton;

const styles = StyleSheet.create({
  button: {
    margin: 8,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
