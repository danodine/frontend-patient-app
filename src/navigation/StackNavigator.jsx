import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, Animated } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import * as secureStorage from "../utils/secureStorage";
import { setAuthFromStorage } from "../redux/authSlice";
import { getCurrentUser, registerPushToken } from "../redux/userSlice";
import { getExpoPushTokenAsync } from "../utils/pushNotifications";
import LoginScreen from "../screens/auth/Login/Index";
import SingUpScreen from "../screens/auth/SingUp/Index";
import ForgotPasswordRequestScreen from "../screens/auth/ForgotPasswordRequest/Index";
import ForgotPasswordResetScreen from "../screens/auth/ForgotPasswordReset/Index";
import VerifyEmailScreen from "../screens/auth/VerifyEmail/Index";
import TabNavigator from "./TabNavigator";
import { BottomBarSearchProvider } from "../contexts/BottomBarSearchContext";
import { COLORS } from "../styles/theme";

const Stack = createNativeStackNavigator();

const STACK_ANIMATION = {
  animation: "slide_from_right",
  animationDuration: 280,
};

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false, ...STACK_ANIMATION }}
    initialRouteName="Login"
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SingUp" component={SingUpScreen} />
    <Stack.Screen name="ForgotPasswordRequest" component={ForgotPasswordRequestScreen} />
    <Stack.Screen name="ForgotPasswordReset" component={ForgotPasswordResetScreen} />
    <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false, ...STACK_ANIMATION }}
    initialRouteName="Dashboard"
  >
    <Stack.Screen name="Dashboard">
      {(props) => (
        <BottomBarSearchProvider>
          <TabNavigator {...props} />
        </BottomBarSearchProvider>
      )}
    </Stack.Screen>
  </Stack.Navigator>
);

const StackNavigator = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const [hydrated, setHydrated] = useState(false);
  const appOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await secureStorage.getItemAsync("token");
        const type = await secureStorage.getItemAsync("type");
        if (storedToken) {
          dispatch(setAuthFromStorage({ token: storedToken, type: type || "patient" }));
        }
      } finally {
        setHydrated(true);
      }
    };
    loadToken();
  }, [dispatch]);

  useEffect(() => {
    if (hydrated && token) {
      dispatch(getCurrentUser());
    }
  }, [hydrated, token, dispatch]);

  // M19: register this device for push (waitlist "a slot opened up" alerts,
  // and any future push use) once the patient is authenticated. Best-effort
  // — getExpoPushTokenAsync resolves to null if permission is denied.
  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    getExpoPushTokenAsync().then((expoPushToken) => {
      if (!cancelled && expoPushToken) {
        dispatch(registerPushToken(expoPushToken));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, dispatch]);

  useEffect(() => {
    if (token) {
      appOpacity.setValue(0);
      Animated.timing(appOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [token, appOpacity]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.screenBackground }}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  if (!token) {
    return <AuthStack />;
  }

  return (
    <Animated.View style={{ flex: 1, opacity: appOpacity }}>
      <AppStack />
    </Animated.View>
  );
};

export default StackNavigator;
