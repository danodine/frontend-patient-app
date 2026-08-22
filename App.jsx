import React, { useEffect } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider } from "react-redux";
import store from "./src/redux/store";
import StackNavigator from "./src/navigation/StackNavigator";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

const Stack = createNativeStackNavigator();

// M15: shareable doctor deep link (holadoc://doctor/:doctorId). Only resolves
// while the authenticated app tree (Dashboard > Home > DoctorProfile) is
// mounted — i.e. the user is already logged in. If logged out, StackNavigator
// renders AuthStack instead (no matching path there), so the link silently
// no-ops and the app just opens to the login screen as normal. That's an
// accepted limitation of the "custom scheme only" scope (see HANDOFF.md).
const linking = {
  prefixes: ["holadoc://"],
  config: {
    screens: {
      Dashboard: {
        screens: {
          Home: {
            screens: {
              DoctorProfile: "doctor/:doctorId",
            },
          },
        },
      },
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      Text.defaultProps = Text.defaultProps || {};
      Text.defaultProps.style = [{ fontFamily: "Nunito_400Regular" }];
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ActionSheetProvider>
      <Provider store={store}>
        <NavigationContainer linking={linking}>
          <StackNavigator />
        </NavigationContainer>
      </Provider>
    </ActionSheetProvider>
  );
}
