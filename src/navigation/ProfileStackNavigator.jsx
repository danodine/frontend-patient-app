import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyProfileScreen from "../screens/dashboard/MyProfile/Index";
import EditProfileScreen from "../screens/dashboard/MyProfile/EditProfile";
import AccountScreen from "../screens/dashboard/Account/Index";
import ClinicalHistoryScreen from "../screens/dashboard/ClinicalHistory/Index";
import FavoritesScreen from "../screens/dashboard/Favorites/Index";
import WaitlistScreen from "../screens/dashboard/Waitlist/Index";

const Stack = createNativeStackNavigator();

const STACK_ANIMATION = {
  animation: "slide_from_right",
  animationDuration: 280,
};

const ProfileStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, ...STACK_ANIMATION }}>
    <Stack.Screen name="ProfileMain" component={MyProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Account" component={AccountScreen} />
    <Stack.Screen name="ClinicalHistory" component={ClinicalHistoryScreen} />
    <Stack.Screen name="Favorites" component={FavoritesScreen} />
    <Stack.Screen name="Waitlist" component={WaitlistScreen} />
  </Stack.Navigator>
);

export default ProfileStackNavigator;
