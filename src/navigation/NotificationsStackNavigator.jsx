import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NotificationsScreen from "../screens/dashboard/Notifications/Index";

const Stack = createNativeStackNavigator();

const STACK_ANIMATION = {
  animation: "slide_from_right",
  animationDuration: 280,
};

export default function NotificationsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...STACK_ANIMATION }}>
      <Stack.Screen name="NotificationsList" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
