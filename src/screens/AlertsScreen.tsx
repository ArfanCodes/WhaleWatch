import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import AlertCard from '../components/AlertCard';
import { seedAlerts } from '../data/seedAlerts';
import { colors, space } from '../theme';

// Phase 4: this becomes the signed-in user's saved alert history from Supabase.
export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={seedAlerts}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AlertCard alert={item} />}
        ListHeaderComponent={
          <ScreenHeader title="Alerts" subtitle="Your past whale alerts" />
        }
        contentContainerStyle={{ paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
