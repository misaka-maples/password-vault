import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent, Dimensions } from 'react-native';

export function useKeyboardOffset() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [windowHeight, setWindowHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    const dimSub = Dimensions.addEventListener('change', (event: any) => {
      setWindowHeight(event.window.height);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      dimSub.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
    windowHeight,
    dismissKeyboard: Keyboard.dismiss,
  };
}
