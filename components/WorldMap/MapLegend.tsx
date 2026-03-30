import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ITEMS = [
  { color: '#286020', label: 'Your fields' },
  { color: '#6a1818', label: 'Hacienda Rivera' },
  { color: '#281858', label: 'Granja del Norte' },
  { color: '#906010', label: 'For sale' },
  { color: '#264818', label: 'Unplanted' },
];

export default function MapLegend() {
  return (
    <View style={styles.box}>
      {ITEMS.map(({ color, label }) => (
        <View key={label} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: color }]}/>
          <Text style={styles.lbl}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box:    { backgroundColor: 'rgba(3,5,10,0.85)', borderRadius: 5, padding: 8, borderWidth: 1, borderColor: '#1a2838' },
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  swatch: { width: 10, height: 7, borderRadius: 1, marginRight: 6 },
  lbl:    { color: '#7a8a80', fontSize: 10 },
});
