import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MessagesScreen from "../screens/dashboard/Messages/Index";
import ConversationScreen from "../screens/dashboard/Messages/Conversation";
import JoinVideoCallScreen from "../screens/dashboard/Messages/JoinVideoCall";
import VideoCallScreen from "../screens/dashboard/Messages/VideoCallScreen";

const Stack = createNativeStackNavigator();

const STACK_ANIMATION = {
  animation: "slide_from_right",
  animationDuration: 280,
};

export default function MessagesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...STACK_ANIMATION }}>
      <Stack.Screen name="MessagesList" component={MessagesScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="JoinVideoCall" component={JoinVideoCallScreen} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
