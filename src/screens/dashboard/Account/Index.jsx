import React, { useState } from "react";
import PropTypes from "prop-types";
import { View } from "react-native";
import AccountElement from "../components/AccountElement/Index";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../../redux/authSlice";
import { clearCurrentUser } from "../../../redux/userSlice";
import STRINGS from "../../../constants/strings";
import { ICONS, SIZES, TYPES } from "../../../styles/theme";
import { setLanguageTo } from "../../../utils/helpers";
import { languages } from "../../../constants/vars";
import ModalComponent from "../components/AccountModal/Index";
import styles from "./styles";

const AccountScreen = ({ navigation }) => {
  const language = useSelector((state) => state.language.language);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalType, setModalType] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const dispatch = useDispatch();

  const handleLogOutModal = () => {
    setModalVisible(true);
    setModalData([{ code: "logout", label: STRINGS[language].account.logOut }]);
    setModalType(TYPES.button);
    setModalTitle(STRINGS[language].account.confirmLogOut);
  };

  const handleLogOut = async () => {
    await dispatch(logoutUser());
    dispatch(clearCurrentUser());
    // Root StackNavigator shows Auth stack when token is null; no need to reset
  };

  const handleProfile = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MyProfile");
    }
  };

  const handleLanguage = () => {
    setModalVisible(true);
    setModalData(languages);
    setModalType(TYPES.listSelector);
    setModalTitle(STRINGS[language].account.languageSelect);
  };

  const handleSelect = (code) => {
    if (code === "logout") {
      handleLogOut();
    } else {
      setLanguageTo(code);
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ModalComponent
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        handleSelect={handleSelect}
        data={modalData}
        title={modalTitle}
        type={modalType}
      />
      <View style={styles.elementContainer}>
        <AccountElement
          icon={ICONS.personCircle}
          iconSize={SIZES.icon50}
          title={STRINGS[language].account.myProfile}
          subtitle={STRINGS[language].account.editProfile}
          subtitle2={STRINGS[language].account.resetPassword}
          handleClick={handleProfile}
        />
        <AccountElement
          icon={ICONS.globe}
          iconSize={SIZES.icon50}
          title={STRINGS[language].account.language}
          subtitle={STRINGS[language].account.selectedLanguage}
          handleClick={handleLanguage}
        />
        <AccountElement
          icon={ICONS.closeIcon}
          iconSize={SIZES.icon50}
          title={STRINGS[language].account.logOut}
          handleClick={handleLogOutModal}
        />
      </View>
    </View>
  );
};

AccountScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired,
  }).isRequired,
};

export default AccountScreen;
