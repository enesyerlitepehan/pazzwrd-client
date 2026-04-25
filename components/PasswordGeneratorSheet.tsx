import { Ionicons } from "@expo/vector-icons";
import React, { useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

import Button from "./Button";

export type PasswordGeneratorSheetRef = {
  open: () => void;
  close: () => void;
};

type BottomSheetHandle = {
  open: () => void;
  close: () => void;
};

interface PasswordGeneratorSheetProps {
  onConfirm: (password: string) => void;
}

const MIN_LEN = 4;
const MAX_LEN = 64;

const similarChars = new Set([
  "0",
  "O",
  "o",
  "Q", // 0 ↔ O/o/Q
  "I",
  "i",
  "l",
  "L",
  "1", // 1 ↔ I/i/l/L
  "S",
  "s",
  "5", // 5 ↔ S/s
  "Z",
  "z",
  "2", // 2 ↔ Z/z
  "B",
  "b",
  "8", // 8 ↔ B/b
  "G",
  "g",
  "6", // 6 ↔ G/g
  "|",
  "!", // 1 ↔ | ↔ !
  "(",
  ")",
  "{",
  "}", // 0 ↔ ()
]);

function filterSimilar(str: string) {
  return str
    .split("")
    .filter((ch) => !similarChars.has(ch))
    .join("");
}

function getCharSets(opts: {
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
  removeSimilar: boolean;
}) {
  let lower = "abcdefghijklmnopqrstuvwxyz";
  let upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let numbers = "0123456789";
  let symbols = "!@#$%^&*()-_=+[]{};:,.?";

  if (opts.removeSimilar) {
    lower = filterSimilar(lower);
    upper = filterSimilar(upper);
    numbers = filterSimilar(numbers);
    // for symbols, remove ambiguous like '|' and similar if present
    symbols = symbols.replace("|", "");
  }
  return { lower, upper, numbers, symbols };
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generatePassword(
  length: number,
  opts: {
    upper: boolean;
    lower: boolean;
    number: boolean;
    symbol: boolean;
    removeSimilar: boolean;
  },
): string {
  const sets = getCharSets(opts);
  const pools: string[] = [];
  if (opts.lower) pools.push(sets.lower);
  if (opts.upper) pools.push(sets.upper);
  if (opts.number) pools.push(sets.numbers);
  if (opts.symbol) pools.push(sets.symbols);

  // Ensure at least one option selected
  if (pools.length === 0) {
    // default to lower if nothing selected
    pools.push(sets.lower);
  }

  // First ensure one character from each selected set
  const requiredChars: string[] = [];
  if (opts.lower) requiredChars.push(sets.lower[Math.floor(Math.random() * sets.lower.length)]);
  if (opts.upper) requiredChars.push(sets.upper[Math.floor(Math.random() * sets.upper.length)]);
  if (opts.number)
    requiredChars.push(sets.numbers[Math.floor(Math.random() * sets.numbers.length)]);
  if (opts.symbol)
    requiredChars.push(sets.symbols[Math.floor(Math.random() * sets.symbols.length)]);

  const all = pools.join("");
  const remaining: string[] = [];
  for (let i = requiredChars.length; i < length; i++) {
    remaining.push(all[Math.floor(Math.random() * all.length)]);
  }
  const full = shuffleArray([...requiredChars, ...remaining]);
  return full.join("");
}

const PasswordGeneratorSheet = forwardRef<PasswordGeneratorSheetRef, PasswordGeneratorSheetProps>(
  ({ onConfirm }, ref) => {
    const { dark } = useTheme();
    const sheetRef = useRef<BottomSheetHandle | null>(null);
    const { t } = useTranslation("common");
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const [length, setLength] = useState<number>(16);
    const [upper, setUpper] = useState<boolean>(true);
    const [lower, setLower] = useState<boolean>(true);
    const [number, setNumber] = useState<boolean>(true);
    const [symbol, setSymbol] = useState<boolean>(true);
    const [removeSimilar, setRemoveSimilar] = useState<boolean>(false);
    const [preview, setPreview] = useState<string>("");

    const sheetHeight = Math.min(Math.max(windowHeight * 0.82, 560), windowHeight - 24);

    useImperativeHandle(ref, () => ({
      open: () => {
        // Reset to defaults when opening
        const defaults = {
          length: 16,
          upper: true,
          lower: true,
          number: true,
          symbol: true,
          removeSimilar: false,
        };
        setLength(defaults.length);
        setUpper(defaults.upper);
        setLower(defaults.lower);
        setNumber(defaults.number);
        setSymbol(defaults.symbol);
        setRemoveSimilar(defaults.removeSimilar);
        const pwd = generatePassword(defaults.length, {
          upper: defaults.upper,
          lower: defaults.lower,
          number: defaults.number,
          symbol: defaults.symbol,
          removeSimilar: defaults.removeSimilar,
        });
        setPreview(pwd);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }));

    const changeLength = (delta: number) => {
      setLength((prev) => {
        const val = Math.min(MAX_LEN, Math.max(MIN_LEN, prev + delta));
        return val;
      });
    };

    const handleGenerate = () => {
      const pwd = generatePassword(length, {
        upper,
        lower,
        number,
        symbol,
        removeSimilar,
      });
      setPreview(pwd);
    };

    const handleUse = () => {
      const pwd =
        preview || generatePassword(length, { upper, lower, number, symbol, removeSimilar });
      onConfirm(pwd);
      sheetRef.current?.close();
    };

    return (
      <RBSheet
        ref={sheetRef}
        closeOnPressMask={true}
        height={sheetHeight}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: dark ? COLORS.dark3 : "#000" },
          container: {
            borderTopRightRadius: 32,
            borderTopLeftRadius: 32,
            height: sheetHeight,
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            alignItems: "center",
            paddingTop: 8,
          },
        }}
      >
        <Text style={[styles.bottomTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          {t("password.generator.title", { defaultValue: "Generate Password" })}
        </Text>
        <View style={styles.separateLine} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Length */}
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                {t("password.generator.length", { defaultValue: "Length" })}
              </Text>
              <View style={styles.lengthControls}>
                <TouchableOpacity
                  onPress={() => changeLength(-1)}
                  style={[
                    styles.circleBtn,
                    { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200 },
                  ]}
                >
                  <Ionicons
                    name="remove"
                    size={16}
                    color={dark ? COLORS.white : COLORS.greyscale900}
                  />
                </TouchableOpacity>
                <Text
                  style={[styles.lengthText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                >
                  {length}
                </Text>
                <TouchableOpacity
                  onPress={() => changeLength(1)}
                  style={[
                    styles.circleBtn,
                    { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200 },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={dark ? COLORS.white : COLORS.greyscale900}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Options */}
            <View style={styles.optionRow}>
              <Text
                style={[styles.optionLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("password.generator.uppercase", {
                  defaultValue: "Uppercase letters (A-Z)",
                })}
              </Text>
              <Switch
                value={upper}
                onValueChange={setUpper}
                style={{ transform: [{ scale: 0.85 }] }}
                trackColor={{
                  false: dark ? COLORS.dark3 : COLORS.greyscale300,
                  true: COLORS.primary,
                }}
                thumbColor={COLORS.white}
                ios_backgroundColor={dark ? COLORS.dark3 : COLORS.greyscale300}
              />
            </View>
            <View style={styles.optionRow}>
              <Text
                style={[styles.optionLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("password.generator.lowercase", {
                  defaultValue: "Lowercase letters (a-z)",
                })}
              </Text>
              <Switch
                value={lower}
                onValueChange={setLower}
                style={{ transform: [{ scale: 0.85 }] }}
                trackColor={{
                  false: dark ? COLORS.dark3 : COLORS.greyscale300,
                  true: COLORS.primary,
                }}
                thumbColor={COLORS.white}
                ios_backgroundColor={dark ? COLORS.dark3 : COLORS.greyscale300}
              />
            </View>
            <View style={styles.optionRow}>
              <Text
                style={[styles.optionLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("password.generator.numbers", { defaultValue: "Numbers (0-9)" })}
              </Text>
              <Switch
                value={number}
                onValueChange={setNumber}
                style={{ transform: [{ scale: 0.85 }] }}
                trackColor={{
                  false: dark ? COLORS.dark3 : COLORS.greyscale300,
                  true: COLORS.primary,
                }}
                thumbColor={COLORS.white}
                ios_backgroundColor={dark ? COLORS.dark3 : COLORS.greyscale300}
              />
            </View>
            <View style={styles.optionRow}>
              <Text
                style={[styles.optionLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("password.generator.symbols", {
                  defaultValue: "Symbols (!@#$...)",
                })}
              </Text>
              <Switch
                value={symbol}
                onValueChange={setSymbol}
                style={{ transform: [{ scale: 0.85 }] }}
                trackColor={{
                  false: dark ? COLORS.dark3 : COLORS.greyscale300,
                  true: COLORS.primary,
                }}
                thumbColor={COLORS.white}
                ios_backgroundColor={dark ? COLORS.dark3 : COLORS.greyscale300}
              />
            </View>
            <View style={styles.optionRow}>
              <Text
                style={[styles.optionLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("password.generator.removeSimilar", {
                  defaultValue: "Remove similar characters (0 O, I L 1 ...)",
                })}
              </Text>
              <Switch
                value={removeSimilar}
                onValueChange={setRemoveSimilar}
                style={{ transform: [{ scale: 0.85 }] }}
                trackColor={{
                  false: dark ? COLORS.dark3 : COLORS.greyscale300,
                  true: COLORS.primary,
                }}
                thumbColor={COLORS.white}
                ios_backgroundColor={dark ? COLORS.dark3 : COLORS.greyscale300}
              />
            </View>

            {/* Preview */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: dark ? COLORS.dark2 : "#F5F5F5",
                  borderColor: dark ? COLORS.dark3 : COLORS.greyscale300,
                },
              ]}
            >
              <Text
                selectable
                numberOfLines={1}
                ellipsizeMode="middle"
                style={[styles.previewText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {preview}
              </Text>
            </View>

            <View style={styles.buttonsRow}>
              <Button
                title={t("password.generator.generate", {
                  defaultValue: "Generate",
                })}
                filled
                style={styles.actionButton}
                onPress={handleGenerate}
              />
              <Button
                title={t("common.use", { defaultValue: "Use" })}
                filled
                style={styles.actionButton}
                onPress={handleUse}
              />
            </View>
          </View>
        </ScrollView>
      </RBSheet>
    );
  },
);

PasswordGeneratorSheet.displayName = "PasswordGeneratorSheet";

const styles = StyleSheet.create({
  bottomTitle: {
    fontSize: 24,
    fontFamily: "bold",
    marginTop: 12,
  },
  separateLine: {
    width: SIZES.width - 32,
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  scrollView: {
    width: "100%",
  },
  contentContainer: {
    alignItems: "center",
  },
  content: {
    width: SIZES.width - 32,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontFamily: "bold",
  },
  lengthControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  circleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lengthText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontFamily: "bold",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: "regular",
    width: "75%",
  },
  previewBox: {
    marginTop: 12,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 14,
    fontFamily: "regular",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  actionButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
    height: 44,
  },
});

export default PasswordGeneratorSheet;
