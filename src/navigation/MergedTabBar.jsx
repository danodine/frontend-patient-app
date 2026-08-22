import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBottomBarSearch } from "../contexts/BottomBarSearchContext";
import { COLORS, FONT_FAMILY, getShadowStyle } from "../styles/theme";

const TAB_BAR_RADIUS = 28;
const TAB_BAR_HEIGHT = 56;
const SEARCH_BAR_HEIGHT = 48;

const getTabIcon = (routeName, focused) => {
  if (routeName === "Home") return focused ? "home" : "home-outline";
  if (routeName === "Appointments") return focused ? "calendar" : "calendar-outline";
  if (routeName === "Messages") return focused ? "chatbubbles" : "chatbubbles-outline";
  if (routeName === "Notifications") return focused ? "notifications" : "notifications-outline";
  if (routeName === "Profile") return focused ? "person" : "person-outline";
  return "ellipse-outline";
};

export default function MergedTabBar({ state, descriptors, navigation, hasUnreadMessages = false, unreadNotifications = 0 }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 16);
  const topInset = Math.max(insets.top, 12);
  const { searchConfig } = useBottomBarSearch();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const messagesRoute = state.routes.find((r) => r.name === "Messages");
  const messagesState = messagesRoute?.state;
  const messagesTopScreen = messagesState?.routes?.[messagesState?.index ?? 0]?.name;
  // The Home and Appointments tabs share the same inner screens (FindAndBook,
  // DoctorProfile, …), so base the hide rules on whichever tab is focused.
  const focusedRoute = state.routes[state.index];
  const focusedStackState = focusedRoute?.state;
  const focusedTopScreen =
    focusedStackState?.routes?.[focusedStackState?.index ?? 0]?.name;
  const hideBar =
    ["Conversation", "VideoCall", "JoinVideoCall"].includes(messagesTopScreen) ||
    focusedTopScreen === "BookAppointment" ||
    focusedTopScreen === "FindAndBook" ||
    focusedTopScreen === "DoctorProfile" ||
    focusedTopScreen === "AppointmentConfirmed";

  const hideSearch = focusedTopScreen === "DoctorProfile";
  const showSearchBar = searchConfig.visible && !hideSearch;

  if (hideBar) return null;

  const searchBarMarginBottom = 10;
  const searchBarBottom = bottomInset + TAB_BAR_HEIGHT + searchBarMarginBottom;
  const keyboardOpen = keyboardHeight > 0;

  return (
    <>
      {showSearchBar && (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            ...(keyboardOpen
              ? { top: topInset }
              : { bottom: searchBarBottom }),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.white,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: SEARCH_BAR_HEIGHT,
              borderWidth: 1,
              borderColor: COLORS.tagColor,
              ...getShadowStyle({ y: 2, blur: 8, opacity: 0.06, elevation: 4 }),
            }}
          >
            <Ionicons name="search" size={20} color={COLORS.greyText} style={{ marginRight: 10 }} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                color: COLORS.blackText,
                paddingVertical: 0,
                fontFamily: FONT_FAMILY.regular,
                ...(Platform.OS === "web" ? {} : { padding: 0 }),
              }}
              placeholder={searchConfig.placeholder}
              placeholderTextColor={COLORS.ligthGreyText}
              value={searchConfig.value}
              onChangeText={searchConfig.onChange}
              returnKeyType="search"
            />
            {searchConfig.onFilter && (
              <TouchableOpacity
                onPress={searchConfig.onFilter}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginLeft: 8 }}
              >
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={searchConfig.filtersActive ? COLORS.secondary : COLORS.greyText}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: bottomInset,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            height: TAB_BAR_HEIGHT,
            backgroundColor: COLORS.tabBarBackground,
            borderRadius: TAB_BAR_RADIUS,
            paddingTop: 6,
            paddingBottom: 6,
            ...getShadowStyle({ y: 4, blur: 12, opacity: 0.08, elevation: 8 }),
          }}
        >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.tabBarLabel ?? route.name;
          const showBadge =
            (route.name === "Messages" && hasUnreadMessages) ||
            (route.name === "Notifications" && unreadNotifications > 0);

          const onPress = () => {
            if (route.name === "Messages" || route.name === "Profile" || route.name === "Appointments") {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            } else {
              navigation.navigate(route.name);
            }
          };

          const color = focused ? COLORS.secondary : COLORS.greyText;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={{ paddingHorizontal: 14, paddingVertical: 8, alignItems: "center", justifyContent: "center" }}
              activeOpacity={0.7}
            >
              <View style={{ position: "relative" }}>
                <Ionicons name={getTabIcon(route.name, focused)} size={26} color={color} />
                {showBadge && (
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: COLORS.error,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 10,
                  color,
                  marginTop: 2,
                  fontFamily: FONT_FAMILY.regular,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
      </View>
    </>
  );
}
