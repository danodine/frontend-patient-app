import React, { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../utils/axiosInstance";
import ReConsentModal from "../components/ReConsentModal";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CommonActions, StackActions } from "@react-navigation/native";
import { fetchConversations, selectHasUnreadMessages, handleSocketNewMessage, socketMessageRead } from "../redux/chatSlice";
import { fetchNotifications, selectUnreadNotificationsCount } from "../redux/notificationsSlice";
import { chatSocket } from "../services/chatSocket";
import * as secureStorage from "../utils/secureStorage";
import HomeStackNavigator from "./HomeStackNavigator";
import AppointmentsStackNavigator from "./AppointmentsStackNavigator";
import MessagesStackNavigator from "./MessagesStackNavigator";
import NotificationsStackNavigator from "./NotificationsStackNavigator";
import ProfileStackNavigator from "./ProfileStackNavigator";
import PropTypes from "prop-types";
import MergedTabBar from "./MergedTabBar";
import { COLORS } from "../styles/theme";
import STRINGS from "../constants/strings";

const Tab = createBottomTabNavigator();

const NOTIFICATIONS_POLL_INTERVAL_MS = 35000;

const TabNavigator = () => {
  const dispatch = useDispatch();
  const language = useSelector((state) => state.language.language);
  const hasUnreadMessages = useSelector(selectHasUnreadMessages);
  const unreadNotifications = useSelector(selectUnreadNotificationsCount);
  const authUser = useSelector((state) => state.auth?.user);
  const pollIntervalRef = useRef(null);

  // Re-consent gate (GDPR Art. 7): accounts predating consent capture — or after
  // a policy version bump — must re-accept before continuing.
  const [consentRequired, setConsentRequired] = useState(false);
  useEffect(() => {
    axiosInstance
      .get("/api/patients/me")
      .then(({ data }) => setConsentRequired(Boolean(data?.data?.consentRequired)))
      .catch(() => setConsentRequired(false));
  }, [authUser?._id]);

  useEffect(() => {
    if (!authUser) {
      chatSocket.disconnect();
      chatSocket.off("chat:newMessage");
      chatSocket.off("chat:messageRead");
      return;
    }
    let mounted = true;
    (async () => {
      const token = await secureStorage.getItemAsync("token");
      if (!mounted || !token) return;
      chatSocket.connect(token);
      chatSocket.on("chat:newMessage", (payload) => {
        dispatch(handleSocketNewMessage(payload));
      });
      chatSocket.on("chat:messageRead", (payload) => {
        dispatch(socketMessageRead(payload));
      });
    })();
    return () => {
      mounted = false;
      chatSocket.off("chat:newMessage");
      chatSocket.off("chat:messageRead");
      chatSocket.disconnect();
    };
  }, [authUser, dispatch]);

  useEffect(() => {
    const schedulePoll = () => {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(() => {
        dispatch(fetchNotifications());
      }, NOTIFICATIONS_POLL_INTERVAL_MS);
    };
    const stopPoll = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    const handleAppStateChange = (nextState) => {
      if (nextState === "active") {
        dispatch(fetchConversations());
        dispatch(fetchNotifications());
        schedulePoll();
      } else {
        stopPoll();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    if (AppState.currentState === "active") {
      dispatch(fetchConversations());
      dispatch(fetchNotifications());
      schedulePoll();
    }
    return () => {
      subscription.remove();
      stopPoll();
    };
  }, [dispatch]);

  const getLabel = (routeName) => {
    switch (routeName) {
      case "Home":
        return language === "es" ? "Inicio" : "Home";
      case "Appointments":
        return language === "es" ? "Citas" : "Appointments";
      case "Messages":
        return language === "es" ? "Mensajes" : "Messages";
      case "Notifications":
        return STRINGS[language]?.notifications?.title ?? (language === "es" ? "Notificaciones" : "Notifications");
      case "Profile":
        return language === "es" ? "Perfil" : "Profile";
      default:
        return routeName;
    }
  };

  return (
    <>
    <ReConsentModal visible={consentRequired} onAccepted={() => setConsentRequired(false)} />
    <Tab.Navigator
      tabBar={(props) => <MergedTabBar {...props} hasUnreadMessages={hasUnreadMessages} unreadNotifications={unreadNotifications} />}
      screenOptions={({ route }) => ({
        tabBarLabel: getLabel(route.name),
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.greyText,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const root = navigation.getState();
            const tabIndex = root?.routes?.findIndex((r) => r.name === "Appointments") ?? 1;
            const tabRoute = root?.routes?.[tabIndex];
            const stackState = tabRoute?.state;
            const topScreen = stackState?.routes?.[stackState?.index ?? 0]?.name;

            // Tapping the tab from a deeper screen returns to the list first.
            if (topScreen && topScreen !== "AppointmentsMain") {
              const nextState = {
                ...root,
                routes: root.routes.map((r) =>
                  r.name === "Appointments"
                    ? { name: "Appointments", key: r.key, state: { routes: [{ name: "AppointmentsMain" }], index: 0 } }
                    : { ...r }
                ),
                index: tabIndex,
              };
              navigation.dispatch(CommonActions.reset(nextState));
              return;
            }
            navigation.navigate("Appointments");
          },
        })}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStackNavigator}
        options={() => ({ tabBarBadge: unreadNotifications > 0 ? "" : undefined })}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const root = navigation.getState();
            const messagesTabIndex = root?.routes?.findIndex((r) => r.name === "Messages") ?? 1;
            const messagesRoute = root?.routes?.[messagesTabIndex];
            const currentFocused = root?.routes?.[root?.index];
            const isMessagesFocused = currentFocused?.name === "Messages";
            const messagesStackState = messagesRoute?.state;
            const topScreen = messagesStackState?.routes?.[messagesStackState?.index ?? 0]?.name;

            if (isMessagesFocused && topScreen === "Conversation") {
              navigation.dispatch(StackActions.popToTop());
              return;
            }
            const nextState = {
              ...root,
              routes: root.routes.map((r) =>
                r.name === "Messages"
                  ? { name: "Messages", key: r.key, state: { routes: [{ name: "MessagesList" }], index: 0 } }
                  : { ...r }
              ),
              index: messagesTabIndex,
            };
            navigation.dispatch(CommonActions.reset(nextState));
          },
        })}
        options={() => ({ tabBarBadge: hasUnreadMessages ? "" : undefined })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const root = navigation.getState();
            const profileTabIndex = root?.routes?.findIndex((r) => r.name === "Profile") ?? 2;
            const profileRoute = root?.routes?.[profileTabIndex];
            const profileStackState = profileRoute?.state;
            const topScreen = profileStackState?.routes?.[profileStackState?.index ?? 0]?.name;

            if (topScreen && topScreen !== "ProfileMain") {
              const nextState = {
                ...root,
                routes: root.routes.map((r) =>
                  r.name === "Profile"
                    ? { name: "Profile", key: r.key, state: { routes: [{ name: "ProfileMain" }], index: 0 } }
                    : { ...r }
                ),
                index: profileTabIndex,
              };
              navigation.dispatch(CommonActions.reset(nextState));
              return;
            }
            navigation.navigate("Profile");
          },
        })}
      />
    </Tab.Navigator>
    </>
  );
};

TabNavigator.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      type: PropTypes.string,
      role: PropTypes.string,
    }),
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default TabNavigator;
