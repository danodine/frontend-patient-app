import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppointmentsScreen from "../screens/dashboard/Appointments/Index";
import FindAndBookScreen from "../screens/dashboard/FindAndBook/Index";
import ChooseSpecialtyScreen from "../screens/dashboard/ChooseSpecialty/Index";
import DoctorListScreen from "../screens/dashboard/DoctorList/Index";
import DoctorProfileScreen from "../screens/dashboard/DoctorProfile/Index";
import MyProfileScreen from "../screens/dashboard/MyProfile/Index";
import AppointmentConfirmedScreen from "../screens/dashboard/AppointmentConfirmed/Index";
import PropTypes from "prop-types";

const Stack = createNativeStackNavigator();

const STACK_ANIMATION = {
  animation: "slide_from_right",
  animationDuration: 280,
};

const AppointmentsStackNavigator = ({ route }) => {
  const type = route?.params?.type ?? route?.params?.role;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...STACK_ANIMATION }}>
      <Stack.Screen name="AppointmentsMain">
        {(props) => <AppointmentsScreen {...props} type={type} />}
      </Stack.Screen>
      <Stack.Screen name="FindAndBook" component={FindAndBookScreen} />
      <Stack.Screen name="ChooseSpecialty" component={ChooseSpecialtyScreen} />
      <Stack.Screen name="DoctorList" component={DoctorListScreen} />
      <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} />
      <Stack.Screen
        name="AppointmentConfirmed"
        component={AppointmentConfirmedScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
};

AppointmentsStackNavigator.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      type: PropTypes.string,
      role: PropTypes.string,
    }),
  }),
};

export default AppointmentsStackNavigator;
