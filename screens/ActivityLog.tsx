import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Share } from "react-native";

import { logger, LogEvent } from "../utils/logger";

const TAGS = [
  { key: "all", tag: null as string | null },
  { key: "network", tag: "network" },
  { key: "auth", tag: "auth" },
  { key: "password", tag: "password" },
  { key: "card", tag: "card" },
  { key: "sync", tag: "sync" },
  { key: "ui", tag: "ui" },
  { key: "error", tag: "error" },
];

export default function ActivityLogScreen() {
  const { t } = useTranslation("common");
  const [items, setItems] = useState<LogEvent[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    await logger.load();
    setItems(logger.getAll());
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    const arr = filter ? items.filter((i) => i.tag === filter) : items;
    return arr;
  }, [items, filter]);

  const onClear = useCallback(async () => {
    await logger.clear();
    setItems([]);
  }, []);

  const onExport = useCallback(async () => {
    await logger.load();
    const data = logger.getAll();
    const text = JSON.stringify(data, null, 2);
    try {
      await Share.share({ message: text });
    } catch {}
  }, []);

  const renderItem = ({ item }: { item: LogEvent }) => (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={[styles.level, styles[item.level]]}>{item.level.toUpperCase()}</Text>
        <Text style={styles.tag}>{item.tag}</Text>
        <Text style={styles.time}>{new Date(item.ts).toLocaleString()}</Text>
      </View>
      <Text style={styles.msg}>{item.message}</Text>
      {item.meta ? (
        <Text style={styles.meta} numberOfLines={6}>
          {JSON.stringify(item.meta)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <FlatList
          data={TAGS}
          keyExtractor={(i) => i.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, filter === item.tag && styles.chipActive]}
              onPress={() => setFilter(item.tag)}
            >
              <Text style={styles.chipText}>
                {item.key === "all" ? t("activityLog.filterAll") : item.tag}
              </Text>
            </TouchableOpacity>
          )}
        />
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={onClear} style={styles.button}>
            <Text style={styles.buttonText}>{t("activityLog.clear")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExport} style={styles.button}>
            <Text style={styles.buttonText}>{t("activityLog.export")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4FB", padding: 12 },
  actions: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#ddd",
  },
  chipActive: { backgroundColor: "#bc2929" },
  chipText: { color: "#000" },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: {
    backgroundColor: "#bc2929",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: { color: "#fff" },
  row: { backgroundColor: "#fff", borderRadius: 8, padding: 10, marginBottom: 10 },
  rowHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  level: { fontWeight: "700" },
  info: { color: "#2d7" },
  warn: { color: "#f90" },
  error: { color: "#e33" },
  tag: { marginLeft: 8, color: "#555" },
  time: { marginLeft: "auto", color: "#777", fontSize: 12 },
  msg: { color: "#222" },
  meta: { color: "#666", fontFamily: "Courier", fontSize: 12, marginTop: 4 },
});
