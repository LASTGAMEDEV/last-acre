import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DashboardSection from '../../components/office/DashboardSection';
import BankingSection from '../../components/office/BankingSection';
import InsuranceSection from '../../components/office/InsuranceSection';
import CoopSection from '../../components/office/CoopSection';
import CompetitorsSection from '../../components/office/CompetitorsSection';
import ReputationSection from '../../components/office/ReputationSection';
import AchievementsSection from '../../components/office/AchievementsSection';
import SubsidiesSection from '../../components/office/SubsidiesSection';
import CertificationsSection from '../../components/office/CertificationsSection';
import LandManagementSection from '../../components/office/LandManagementSection';
import CSASection from '../../components/office/CSASection';
import Encyclopedia from '../../components/Encyclopedia';
import SettingsSection from '../../components/office/SettingsSection';
import SubTabBar from '../../components/SubTabBar';
import { C, F, S } from '../../constants/theme';

type OfficeTab = 'dashboard' | 'banking' | 'insurance' | 'coop' | 'rivals' | 'reputation' | 'achievements' | 'subsidies' | 'certifications' | 'land' | 'csa' | 'guide' | 'settings';

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'dashboard',    label: '🏠 Dashboard' },
  { id: 'banking',      label: '🏦 Banking' },
  { id: 'insurance',    label: '🛡️ Insurance' },
  { id: 'coop',         label: '🤝 Co-op' },
  { id: 'rivals',       label: '🏭 Rivals' },
  { id: 'reputation',   label: '⭐ Reputation' },
  { id: 'achievements', label: '🏆 Achievements' },
  { id: 'subsidies',    label: '💶 Subsidies' },
  { id: 'certifications', label: '🌿 Organic' },
  { id: 'land',         label: '🗺️ Land' },
  { id: 'csa',          label: '🥬 CSA' },
  { id: 'guide',        label: '📖 Guide' },
  { id: 'settings',     label: '⚙️ Settings' },
];

export default function OfficeScreen() {
  const [tab, setTab] = useState<OfficeTab>('dashboard');

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Office</Text>
      </View>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as OfficeTab)} />
      {tab === 'dashboard'       && <DashboardSection />}
      {tab === 'banking'         && <BankingSection />}
      {tab === 'insurance'       && <InsuranceSection />}
      {tab === 'coop'            && <CoopSection />}
      {tab === 'rivals'          && <CompetitorsSection />}
      {tab === 'reputation'      && <ReputationSection />}
      {tab === 'achievements'    && <AchievementsSection />}
      {tab === 'subsidies'       && <SubsidiesSection />}
      {tab === 'certifications'  && <CertificationsSection />}
      {tab === 'land'            && <LandManagementSection />}
      {tab === 'csa'             && <CSASection />}
      {tab === 'guide'           && <Encyclopedia />}
      {tab === 'settings'        && <SettingsSection />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
