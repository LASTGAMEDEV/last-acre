import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import WorldMap from '../components/WorldMap';

export default function WorldMapScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {/* Back button */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <WorldMap />
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#050709' },
  back:     { position: 'absolute', top: 12, left: 12, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  backText: { color: '#9ab0c8', fontSize: 13, fontWeight: '600' },
});
