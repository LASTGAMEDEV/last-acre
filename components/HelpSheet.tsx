import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Pressable } from 'react-native';

interface HelpSheetProps {
  title: string;
  body: string;
  buttonSize?: number;
}

export default function HelpSheet({ title, body, buttonSize = 14 }: HelpSheetProps) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    }
  }, [visible, slideAnim]);

  const open = () => setVisible(true);

  const close = () => {
    Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
  };

  return (
    <>
      <TouchableOpacity
        onPress={open}
        style={[hs.btn, { width: buttonSize + 6, height: buttonSize + 6, borderRadius: (buttonSize + 6) / 2 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[hs.btnText, { fontSize: buttonSize - 2 }]}>?</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <View style={hs.container}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
          <Animated.View style={[hs.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={hs.handle} />
            <Text style={hs.title}>{title}</Text>
            <Text style={hs.body}>{body}</Text>
            <TouchableOpacity style={hs.closeBtn} onPress={close}>
              <Text style={hs.closeBtnText}>Got it</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const hs = StyleSheet.create({
  btn:          { backgroundColor: '#1a2744', borderWidth: 1, borderColor: '#2a4a7f', alignItems: 'center', justifyContent: 'center' },
  btnText:      { color: '#4fc3f7', fontWeight: 'bold' },
  container:    { flex: 1, justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#0d1117', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: '#1e2a3a', padding: 20, paddingBottom: 32, maxHeight: '75%' },
  handle:       { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:        { color: '#e8d5a3', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  body:         { color: '#aaa', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  closeBtn:     { backgroundColor: '#1a3a5c', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: '#4fc3f7', fontSize: 14, fontWeight: 'bold' },
});
