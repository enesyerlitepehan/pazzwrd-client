import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SceneMap, TabBar, TabView } from "react-native-tab-view";

import { apiPostSupportMessage } from "../api/api";
import Button from "../components/Button";
import Header from "../components/Header";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, icons } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";

interface TabRoute {
  key: string;
  title: string;
}

interface RenderLabelProps {
  route: TabRoute;
  focused: boolean;
}

const FaqsRoute = () => {
  const [expanded, setExpanded] = useState(-1);
  const { colors } = useTheme();
  const { t } = useTranslation();

  const faqs = [
    {
      question: t("settings.faq.whatIsCloudTitle"),
      answer: t("settings.faq.whatIsCloudDesc"),
    },
    {
      question: t("settings.faq.whatIsLocalTitle"),
      answer: t("settings.faq.whatIsLocalDesc"),
    },
    {
      question: t("settings.faq.howDataStoredTitle"),
      answer: t("settings.faq.howDataStoredDesc"),
    },
    {
      question: t("settings.faq.whatIsMPTitle"),
      answer: t("settings.faq.whatIsMPDesc"),
    },
    {
      question: t("settings.faq.trashRulesTitle"),
      answer: t("settings.faq.trashRulesDesc"),
    },
    {
      question: t("settings.faq.howToDeleteTitle"),
      answer: t("settings.faq.howToDeleteDesc"),
    },
    {
      question: t("settings.faq.howToRestoreTitle"),
      answer: t("settings.faq.howToRestoreDesc"),
    },
    {
      question: t("settings.faq.howToShareTitle"),
      answer: t("settings.faq.howToShareDesc"),
    },
  ];

  const toggleExpand = (index: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prevExpanded) => (prevExpanded === index ? -1 : index));
  };

  return (
    <View style={[styles.routeContainer, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {faqs.map((faq, index) => (
          <View
            key={index}
            style={[
              styles.faqContainer,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <TouchableOpacity style={styles.questionContainer} onPress={() => toggleExpand(index)}>
              <Text style={[styles.question, { color: colors.text }]}>{faq.question}</Text>
              <Text style={styles.icon}>{expanded === index ? "-" : "+"}</Text>
            </TouchableOpacity>
            {expanded === index && (
              <Text style={[styles.answer, { color: colors.textSecondary }]}>{faq.answer}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const ContactUsRoute = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const authCtx = useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isResult, setIsResult] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setModalMessage(t("auth.invalidInputMessage"));
      setIsResult(true);
      setModalVisible(true);
      return;
    }

    setLoading(true);
    setModalMessage(t("loading.default"));
    setIsResult(false);
    setModalVisible(true);

    try {
      const response = await apiPostSupportMessage(title, message);
      if (response.status === 201) {
        setModalMessage(t("settings.contactUs.success"));
        setIsResult(true);
        setTitle("");
        setMessage("");
      } else {
        setModalMessage(response.message || t("password.someThingWentWrong"));
        setIsResult(true);
      }
    } catch (error) {
      setModalMessage(t("password.someThingWentWrong"));
      setIsResult(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[
        styles.routeContainer,
        {
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
    >
      <LoadingModal
        visible={modalVisible}
        message={modalMessage}
        resultMode={isResult}
        showActionButton={isResult}
        onAction={() => setModalVisible(false)}
      />
      <Text style={[styles.inputLabel, { color: colors.text }]}>
        {t("settings.contactUs.title")}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.divider,
          },
        ]}
        placeholder={t("settings.contactUs.titlePlaceholder")}
        placeholderTextColor={colors.inputPlaceholderSubtle}
        value={title}
        onChangeText={setTitle}
        editable={!loading}
      />

      <Text
        style={[
          styles.inputLabel,
          {
            color: colors.text,
            marginTop: 20,
          },
        ]}
      >
        {t("settings.contactUs.message")}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.divider,
          },
        ]}
        placeholder={t("settings.contactUs.messagePlaceholder")}
        placeholderTextColor={colors.inputPlaceholderSubtle}
        multiline
        numberOfLines={6}
        value={message}
        onChangeText={setMessage}
        textAlignVertical="top"
        editable={!loading}
      />

      <Button
        title={t("settings.contactUs.send")}
        filled
        onPress={handleSend}
        style={{ marginTop: 30 }}
        isLoading={loading}
      />
    </ScrollView>
  );
};
const renderScene = SceneMap({
  first: FaqsRoute,
  second: ContactUsRoute,
});

const HelpCenter = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const { t } = useTranslation();

  const [index, setIndex] = React.useState(0);
  const routes = [
    { key: "first", title: t("settings.faqTitle") },
    { key: "second", title: t("settings.contactUsTitle") },
  ];

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{
        backgroundColor: colors.textPrimary,
      }}
      style={{
        backgroundColor: colors.background,
      }}
      activeColor={colors.textPrimary}
      inactiveColor={colors.text}
      renderLabel={({ route, focused }: RenderLabelProps) => (
        <Text
          style={{
            color: focused ? colors.textPrimary : "gray",
            fontSize: 16,
            fontFamily: "bold",
          }}
        >
          {route.title}
        </Text>
      )}
    />
  );
  /**
   * Render header
   */
  const renderHeader = () => {
    return <Header title="Help Center" />;
  };
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.black,
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
  },
  routeContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 22,
  },
  faqContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  questionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontFamily: "semiBold",
    color: "#333",
  },
  icon: {
    fontSize: 18,
    color: COLORS.gray2,
  },
  answer: {
    fontSize: 14,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    fontFamily: "regular",
    color: COLORS.gray2,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "bold",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    fontFamily: "regular",
    fontSize: 14,
  },
  textArea: {
    height: 150,
    paddingVertical: 12,
  },
});

export default HelpCenter;
