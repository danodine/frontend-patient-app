import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SEARCH_BAR_TOTAL_HEIGHT = 72; // minHeight 48 + padding 24

const BottomBarSearchContext = createContext(null);

export function BottomBarSearchProvider({ children }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets?.top ?? 0, 12);
  const [searchConfig, setSearchConfigState] = useState({
    visible: false,
    placeholder: "",
    value: "",
    onChange: () => {},
  });
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

  const setSearchConfig = useCallback((config) => {
    setSearchConfigState((prev) => ({
      ...prev,
      ...config,
    }));
  }, []);

  const keyboardOpen = keyboardHeight > 0;
  const searchBarAtTopHeight =
    keyboardOpen && searchConfig.visible ? topInset + SEARCH_BAR_TOTAL_HEIGHT : 0;

  return (
    <BottomBarSearchContext.Provider
      value={{ searchConfig, setSearchConfig, searchBarAtTopHeight }}
    >
      {children}
    </BottomBarSearchContext.Provider>
  );
}

export function useBottomBarSearch() {
  const ctx = useContext(BottomBarSearchContext);
  if (!ctx)
    return {
      searchConfig: { visible: false, placeholder: "", value: "", onChange: () => {} },
      setSearchConfig: () => {},
      searchBarAtTopHeight: 0,
    };
  return ctx;
}
