import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DashboardSection from '../../components/office/DashboardSection';
import AnnualPlanningSection from '../../components/office/AnnualPlanningSection';
import BankingSection from '../../components/office/BankingSection';
import InsuranceSection from '../../components/office/InsuranceSection';
import CoopSection from '../../components/office/CoopSection';
import CompetitorsSection from '../../components/office/CompetitorsSection';
import NeighborFarmsSection from '../../components/office/NeighborFarmsSection';
import ReputationSection from '../../components/office/ReputationSection';
import AchievementsSection from '../../components/office/AchievementsSection';
import SubsidiesSection from '../../components/office/SubsidiesSection';
import CertificationsSection from '../../components/office/CertificationsSection';
import LandManagementSection from '../../components/office/LandManagementSection';
import CSASection from '../../components/office/CSASection';
import Encyclopedia from '../../components/Encyclopedia';
import SettingsSection from '../../components/office/SettingsSection';
import FinancialReportSection from '../../components/office/FinancialReportSection';
import CropReportSection from '../../components/office/CropReportSection';
import AnimalReportSection from '../../components/office/AnimalReportSection';
import AnnualReportSection from '../../components/office/AnnualReportSection';
import SubTabBar from '../../components/SubTabBar';
import { C, F, S } from '../../constants/theme';

type OfficeTab =
  | 'dashboard'
  | 'planner'
  | 'reports'
  | 'banking'
  | 'insurance'
  | 'coop'
  | 'rivals'
  | 'neighbors'
  | 'reputation'
  | 'achievements'
  | 'subsidies'
  | 'certifications'
  | 'land'
  | 'csa'
  | 'guide'
  | 'settings';

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'dashboard',      label: 'Dashboard' },
  { id: 'planner',        label: 'Plan' },
  { id: 'reports',        label: 'Reports' },
  { id: 'banking',        label: 'Banking' },
  { id: 'insurance',      label: 'Insurance' },
  { id: 'coop',           label: 'Co-op' },
  { id: 'rivals',         label: 'Rivals' },
  { id: 'neighbors',      label: 'Neighbors' },
  { id: 'reputation',     label: 'Reputation' },
  { id: 'achievements',   label: 'Achievements' },
  { id: 'subsidies',      label: 'Subsidies' },
  { id: 'certifications', label: 'Organic' },
  { id: 'land',           label: 'Land' },
  { id: 'csa',            label: 'CSA' },
  { id: 'guide',          label: 'Guide' },
  { id: 'settings',       label: 'Settings' },
];

export default function OfficeScreen() {
  const [tab, setTab] = useState<OfficeTab>('dashboard');
  const [reportSubTab, setReportSubTab] = useState<'financial' | 'crops' | 'animals' | 'annual'>('financial');

  const REPORT_TABS = [
    { id: 'financial', label: '💰 Finance' },
    { id: 'crops',     label: '🌾 Crops' },
    { id: 'animals',   label: '🐾 Animals' },
    { id: 'annual',    label: '📋 Annual' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Office</Text>
      </View>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as OfficeTab)} />
      {tab === 'dashboard'      && <DashboardSection />}
      {tab === 'planner'        && <AnnualPlanningSection />}
      {tab === 'reports'        && (
        <View style={{ flex: 1 }}>
          <SubTabBar tabs={REPORT_TABS} active={reportSubTab} onSelect={id => setReportSubTab(id as typeof reportSubTab)} />
          {reportSubTab === 'financial' && <FinancialReportSection />}
          {reportSubTab === 'crops'     && <CropReportSection />}
          {reportSubTab === 'animals'   && <AnimalReportSection />}
          {reportSubTab === 'annual'    && <AnnualReportSection />}
        </View>
      )}
      {tab === 'banking'        && <BankingSection />}
      {tab === 'insurance'      && <InsuranceSection />}
      {tab === 'coop'           && <CoopSection />}
      {tab === 'rivals'         && <CompetitorsSection />}
      {tab === 'neighbors'      && <NeighborFarmsSection />}
      {tab === 'reputation'     && <ReputationSection />}
      {tab === 'achievements'   && <AchievementsSection />}
      {tab === 'subsidies'      && <SubsidiesSection />}
      {tab === 'certifications' && <CertificationsSection />}
      {tab === 'land'           && <LandManagementSection />}
      {tab === 'csa'            && <CSASection />}
      {tab === 'guide'          && <Encyclopedia />}
      {tab === 'settings'       && <SettingsSection />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  title: { color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy },
});
