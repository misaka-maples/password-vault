import React, { useEffect } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';

interface Props {
  message: string | null;
  onHide: () => void;
}

export const Toast: React.FC<Props> = ({ message, onHide }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: '#2F2321',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F3E5DE',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
  },
  text: {
    color: '#FFF5F0',
    fontSize: 14,
    fontWeight: '700',
  },
});
