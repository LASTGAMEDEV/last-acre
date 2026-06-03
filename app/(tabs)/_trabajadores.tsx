import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import type { Worker, WorkerRole, ContractType } from '../../data/workerTypes';
import { WORKER_ROLE_CONFIG } from '../../data/workerTypes';
import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import { WINDOW_LABELS, TimeWindow } from '../../engine/nightOps';

type Tab = 'staff' | 'requests' | 'hire';

function satColor(sat: number) {
  if (sat >= 70) return '#66bb6a';
  if (sat >= 40) return '#ffa726';
  return '#ef5350';
}

function fatigueColor(val: number): string {
  if (val <= 30) return '#4caf50';
  if (val <= 60) return '#ffa726';
  if (val <= 80) return '#ef5350';
  return '#b71c1c';
}

function tierLabel(tier: number) {
  return ['', 'Junior', 'Mid', 'Senior', 'Expert'][tier] ?? '';
}

function SatBar({ value }: { value: number }) {
  return (
    <View style={sb.track}>
      <View style={[sb.fill, { width: `${Math.round(value)}%` as any, backgroundColor: satColor(value) }]} />
      <Text style={sb.label}>{Math.round(value)}%</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  track: { height: 8, backgroundColor: C.bgDeep, borderRadius: 4, overflow: 'hidden', flex: 1, marginRight: 6 },
  fill: { height: '100%', borderRadius: 4 },
  label: { color: C.textMuted, fontSize: 10, minWidth: 28, textAlign: 'right' },
});

// ── Worker detail modal ───────────────────────────────────────────────────────

function WorkerDetail({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const { fireWorker, chooseBranch, startCertStudy, setWorkerShiftPreference } = useGameStore();
  const cfg = WORKER_ROLE_CONFIG[worker.role];
  const passedCertIds = worker.certifications.filter(c => c.passed).map(c => c.id);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={wd.container}>
        <View style={wd.header}>
          <Text style={wd.title}>{cfg?.icon} {worker.name}</Text>
          <TouchableOpacity onPress={onClose}><Text style={wd.close}>✕</Text></TouchableOpacity>
        </View>

        <Text style={st.sectionLabel}>Profile</Text>
        <Text style={wd.row}>{cfg?.name} · {tierLabel(worker.tier)} · {worker.experienceYears.toFixed(1)} yrs exp</Text>
        <Text style={wd.row}>{worker.nationality} · Age {worker.age} · {worker.contractType} · €{worker.wagePerDay}/day</Text>
        {worker.personalityRevealed && (
          <Text style={wd.row}>Ethics {worker.workEthic}% · Team {worker.teamPlayer}% · Stress thr. {worker.stressThreshold}%</Text>
        )}
        {worker.isInjured && <Text style={wd.warn}>🤕 Injured — recovering until day {worker.injuryRecoveryDay}</Text>}
        {worker.isOnLeave && <Text style={wd.warn}>🏖️ On leave until day {worker.leaveReturnDay}</Text>}

        {/* Shift preference */}
        <Text style={st.sectionLabel}>Shift Preference</Text>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: S.md, marginBottom: 4 }}>
          {(['day', 'twilight', 'night', 'any'] as const).map(pref => (
            <TouchableOpacity
              key={pref}
              style={[wd.shiftChip, worker.shiftPreference === pref && wd.shiftChipActive]}
              onPress={() => setWorkerShiftPreference(worker.id, pref)}
            >
              <Text style={[wd.shiftChipText, worker.shiftPreference === pref && { color: C.white }]}>
                {pref === 'day' ? '☀️' : pref === 'night' ? '🌙' : pref === 'twilight' ? '🌅' : '⚡'} {pref}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fatigue */}
        <Text style={st.sectionLabel}>Fatigue</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.md, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 8, backgroundColor: C.bgDeep, borderRadius: 4, overflow: 'hidden', marginRight: 6 }}>
            <View style={{ width: `${Math.min(100, (worker.fatigueLevel ?? 0))}%`, height: '100%', borderRadius: 4, backgroundColor: fatigueColor(worker.fatigueLevel ?? 0) }} />
          </View>
          <Text style={{ color: C.textMuted, fontSize: 10, minWidth: 28, textAlign: 'right' }}>{Math.round(worker.fatigueLevel ?? 0)}%</Text>
        </View>
        {(worker.consecutiveNightShifts ?? 0) > 0 && (
          <Text style={wd.warn}>🌙 {worker.consecutiveNightShifts} consecutive night shifts</Text>
        )}

        <Text style={st.sectionLabel}>Satisfaction</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.md, marginBottom: 4 }}>
          <SatBar value={worker.satisfaction} />
        </View>
        {worker.satisfaction < 30 && <Text style={wd.warn}>⚠️ Low satisfaction — quit risk</Text>}

        <Text style={st.sectionLabel}>Skill Tree</Text>
        {cfg?.skillTree.map(node => {
          const unlocked = worker.unlockedNodeIds.includes(node.id);
          const hasCert = node.certId ? passedCertIds.includes(node.certId) : false;
          const studying = worker.studyingCertId === node.certId;
          const canChooseBranch = node.tier === 3 && node.branchId && !worker.selectedBranch && worker.tier >= 3;
          const canStudy = node.isCert && unlocked && !hasCert && !studying && node.certId;
          return (
            <View key={node.id} style={[wd.node, !unlocked && wd.nodeLocked]}>
              <Text style={wd.nodeText}>T{node.tier} · {node.name}{hasCert ? ' ✅' : studying ? ' 📖' : ''}</Text>
              {canStudy && (
                <TouchableOpacity style={wd.smallBtn} onPress={() => startCertStudy(worker.id, node.certId!)}>
                  <Text style={wd.smallBtnText}>Start studying</Text>
                </TouchableOpacity>
              )}
              {canChooseBranch && (
                <TouchableOpacity style={wd.smallBtn} onPress={() => chooseBranch(worker.id, node.branchId!)}>
                  <Text style={wd.smallBtnText}>Choose branch</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={wd.fireBtn} onPress={() => { fireWorker(worker.id); onClose(); }}>
          <Text style={wd.fireBtnText}>🔴 Fire {worker.name}</Text>
        </TouchableOpacity>
        <View style={{ height: 48 }} />
      </ScrollView>
    </Modal>
  );
}
const wd = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.md, paddingTop: 48 },
  title: { color: C.text, fontWeight: 'bold', fontSize: F.size.xl },
  close: { color: C.textMuted, fontSize: 18 },
  row: { color: C.text, fontSize: F.size.sm, paddingHorizontal: S.md, paddingBottom: 3 },
  warn: { color: C.red, fontSize: 12, paddingHorizontal: S.md, marginTop: 2 },
  node: { backgroundColor: C.bgElevated, borderRadius: 8, padding: 8, marginHorizontal: S.md, marginBottom: 4 },
  nodeLocked: { opacity: 0.35 },
  nodeText: { color: C.text, fontSize: 13 },
  smallBtn: { marginTop: 4, backgroundColor: C.blue, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  smallBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },
  shiftChip: { backgroundColor: C.bgElevated, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6, flex: 1, alignItems: 'center' },
  shiftChipActive: { backgroundColor: C.blue },
  shiftChipText: { color: C.text, fontSize: 11 },
  fireBtn: { backgroundColor: C.redDark, borderRadius: R.lg, padding: S.md, margin: S.md, alignItems: 'center' },
  fireBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
});

// ── Staff tab ─────────────────────────────────────────────────────────────────

function StaffTab() {
  const { workers, consultant, employerReputation } = useGameStore();
  const [detail, setDetail] = useState<Worker | null>(null);
  const list = workers ?? [];
  const totalDaily = list.reduce((s, w) => s + w.wagePerDay, 0) + (consultant?.isHired ? (consultant.hireCostPerDay ?? 0) : 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={st.section}>
        <Text style={st.stat}>👥 {list.length} staff · €{totalDaily}/day total</Text>
        <Text style={st.stat}>⭐ Employer reputation: {employerReputation ?? 50}/100</Text>
      </View>

      {consultant?.isHired && (
        <View style={st.section}>
          <Text style={st.sectionLabel}>🎩 Consultant</Text>
          <View style={st.card}>
            <Text style={st.cardName}>🤵 {consultant.name}</Text>
            <Text style={st.cardSub}>Farm Consultant · €{consultant.hireCostPerDay}/day</Text>
            <Text style={st.cardSub}>Relationship {consultant.relationshipScore}/100 · Autonomy {consultant.autonomyLevel}/100</Text>
          </View>
        </View>
      )}

      <Text style={st.sectionLabel}>Active Staff ({list.length})</Text>
      {list.length === 0
        ? <Text style={st.empty}>No staff hired. Use the Hire tab to post vacancies.</Text>
        : list.map(w => {
            const cfg = WORKER_ROLE_CONFIG[w.role];
            return (
              <TouchableOpacity key={w.id} style={st.card} onPress={() => setDetail(w)}>
                <View style={st.cardRow}>
                  <Text style={st.cardIcon}>{cfg?.icon ?? '👷'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.cardName}>
                      {w.name}{w.isInjured ? ' 🤕' : ''}{w.isOnLeave ? ' 🏖️' : ''}{w.isStudying ? ' 📖' : ''}
                    </Text>
                    <Text style={st.cardSub}>{cfg?.name} · {tierLabel(w.tier)} · €{w.wagePerDay}/day · {w.contractType}</Text>
                  </View>
                </View>
                <View style={[st.cardRow, { marginTop: 6 }]}>
                  <SatBar value={w.satisfaction} />
                </View>
                <View style={[st.cardRow, { marginTop: 4, gap: 6 }]}>
                  <Text style={{ color: C.textMuted, fontSize: 10 }}>
                    {w.shiftPreference === 'night' ? '🌙 Night' : w.shiftPreference === 'twilight' ? '🌅 Twilight' : w.shiftPreference === 'any' ? '⚡ Any' : '☀️ Day'}
                  </Text>
                  <Text style={{ color: fatigueColor(w.fatigueLevel ?? 0), fontSize: 10 }}>
                    😴 {Math.round(w.fatigueLevel ?? 0)}% fatigue
                  </Text>
                  {(w.consecutiveNightShifts ?? 0) >= 3 && (
                    <Text style={{ color: C.red, fontSize: 10 }}>
                      ⚠️ {w.consecutiveNightShifts} nights
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
      }
      {detail && <WorkerDetail worker={detail} onClose={() => setDetail(null)} />}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Requests tab ──────────────────────────────────────────────────────────────

function RequestsTab() {
  const { pendingRequests, requestLog, approveRequest, denyRequest } = useGameStore();
  const pending = pendingRequests ?? [];
  const log = requestLog ?? [];
  const [showLog, setShowLog] = useState(false);

  if (pending.length === 0 && log.length === 0) {
    return <View style={st.section}><Text style={st.empty}>No pending requests. Charlie is handling things.</Text></View>;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={st.sectionLabel}>Needs Your Decision ({pending.length})</Text>
      {pending.map(req => (
        <View key={req.id} style={rq.card}>
          <View style={rq.row}>
            <Text style={rq.icon}>{req.workerIcon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={rq.name}>{req.workerName}</Text>
              {req.urgency === 'urgent' && <Text style={rq.urgent}>⚡ URGENT</Text>}
            </View>
          </View>
          <Text style={rq.msg}>{req.message}</Text>
          {req.cost != null && <Text style={rq.cost}>Cost: ${req.cost}</Text>}
          {req.consequence && <Text style={rq.consequence}>If denied: {req.consequence}</Text>}
          <View style={rq.btns}>
            <TouchableOpacity style={rq.approve} onPress={() => approveRequest(req.id)}>
              <Text style={rq.btnText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rq.deny} onPress={() => denyRequest(req.id)}>
              <Text style={rq.btnText}>✕ Deny</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={st.section} onPress={() => setShowLog(!showLog)}>
        <Text style={st.sectionLabel}>Charlie Handled ({log.length}) {showLog ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showLog && log.map(req => (
        <View key={req.id} style={[rq.card, { opacity: 0.55 }]}>
          <Text style={rq.msg}>{req.workerName}: {req.message}</Text>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>→ {req.resolution}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const rq = StyleSheet.create({
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm, marginHorizontal: S.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xs },
  icon: { fontSize: 22, marginRight: S.sm },
  name: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  urgent: { color: C.red, fontWeight: 'bold', fontSize: 11 },
  msg: { color: C.text, fontSize: F.size.sm, marginBottom: S.xs },
  cost: { color: C.red, fontSize: 12 },
  consequence: { color: C.amber, fontSize: 11, fontStyle: 'italic' },
  btns: { flexDirection: 'row', gap: 8, marginTop: S.sm },
  approve: { flex: 1, backgroundColor: C.greenDark, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  deny: { flex: 1, backgroundColor: C.redDark, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  btnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
});

// ── Hire tab ──────────────────────────────────────────────────────────────────

function HireTab() {
  const { jobPostings, postVacancy, closePosting, hireApplicant, day } = useGameStore();
  const [selectedRole, setSelectedRole] = useState<WorkerRole | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractType>('permanent');
  const [offeredWage, setOfferedWage] = useState(100);
  const openPostings = (jobPostings ?? []).filter(p => !p.closed);
  const allRoles = Object.keys(WORKER_ROLE_CONFIG) as WorkerRole[];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={st.sectionLabel}>Post a Vacancy</Text>
      <View style={st.section}>
        <Text style={st.label}>Role</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: S.sm }}>
          {allRoles.map(role => {
            const cfg = WORKER_ROLE_CONFIG[role];
            return (
              <TouchableOpacity
                key={role}
                style={[hr.chip, selectedRole === role && hr.chipSelected]}
                onPress={() => {
                  setSelectedRole(role);
                  const [wMin, wMax] = cfg.wageRangeJunior;
                  setOfferedWage(Math.round((wMin + wMax) / 2));
                }}
              >
                <Text style={hr.chipText}>{cfg.icon} {cfg.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={st.label}>Contract type</Text>
        <View style={hr.contractRow}>
          {(['permanent', 'seasonal', 'casual'] as ContractType[]).map(ct => (
            <TouchableOpacity
              key={ct}
              style={[hr.contractChip, selectedContract === ct && hr.chipSelected]}
              onPress={() => setSelectedContract(ct)}
            >
              <Text style={hr.chipText}>{ct}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={st.label}>Offered wage: ${offeredWage}/day</Text>
        <View style={hr.wageRow}>
          <TouchableOpacity style={hr.wageBtn} onPress={() => setOfferedWage(w => Math.max(20, w - 10))}>
            <Text style={hr.wageBtnText}>−10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={hr.wageBtn} onPress={() => setOfferedWage(w => w + 10)}>
            <Text style={hr.wageBtnText}>+10</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[hr.postBtn, !selectedRole && hr.postBtnDisabled]}
          disabled={!selectedRole}
          onPress={() => { if (selectedRole) { postVacancy(selectedRole, selectedContract, offeredWage); setSelectedRole(null); } }}
        >
          <Text style={hr.postBtnText}>Post Vacancy</Text>
        </TouchableOpacity>
      </View>

      {openPostings.length > 0 && (
        <>
          <Text style={st.sectionLabel}>Open Postings</Text>
          {openPostings.map(posting => {
            const cfg = WORKER_ROLE_CONFIG[posting.role];
            const ready = posting.applicants.length > 0 &&
              (posting.applicantsGeneratedDay == null || day >= posting.applicantsGeneratedDay);
            return (
              <View key={posting.id} style={st.card}>
                <Text style={st.cardName}>{cfg?.icon} {cfg?.name} — €{posting.offeredWagePerDay}/day · {posting.contractType}</Text>
                <Text style={st.cardSub}>Posted day {posting.postedDay}</Text>
                {!ready
                  ? <Text style={st.cardSub}>⏳ Waiting for applicants…</Text>
                  : posting.applicants.length === 0
                  ? <Text style={st.cardSub}>No applicants this round.</Text>
                  : posting.applicants.map(applicant => (
                      <View key={applicant.id} style={hr.applicantRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.cardName}>{applicant.name}</Text>
                          <Text style={st.cardSub}>{applicant.nationality} · {applicant.age}yr · {applicant.experienceYears}yr exp · €{applicant.askingWagePerDay}/day</Text>
                          {applicant.certificationIds.length > 0 && <Text style={st.cardSub}>Certs: {applicant.certificationIds.join(', ')}</Text>}
                          {applicant.personalityHints.map((h, i) => <Text key={i} style={st.cardSub}>💬 {h}</Text>)}
                        </View>
                        <TouchableOpacity style={hr.hireBtn} onPress={() => hireApplicant(posting.id, applicant.id)}>
                          <Text style={hr.hireBtnText}>Hire</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                }
                <TouchableOpacity onPress={() => closePosting(posting.id)}>
                  <Text style={[st.cardSub, { color: C.red, marginTop: S.xs }]}>Cancel posting</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
const hr = StyleSheet.create({
  chip: { backgroundColor: C.bgElevated, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  chipSelected: { backgroundColor: C.blue },
  chipText: { color: C.text, fontSize: 12 },
  contractRow: { flexDirection: 'row', gap: 8, marginBottom: S.sm },
  contractChip: { flex: 1, backgroundColor: C.bgElevated, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  wageRow: { flexDirection: 'row', gap: 8, marginBottom: S.sm },
  wageBtn: { backgroundColor: C.bgElevated, borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 8 },
  wageBtnText: { color: C.text, fontWeight: 'bold' },
  postBtn: { backgroundColor: C.blue, borderRadius: R.md, padding: S.sm, alignItems: 'center', marginTop: S.sm },
  postBtnDisabled: { backgroundColor: C.bgElevated },
  postBtnText: { color: C.white, fontWeight: 'bold' },
  applicantRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.bgDeep, borderRadius: 8, padding: S.sm, marginBottom: 4, marginTop: 4 },
  hireBtn: { backgroundColor: C.blue, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8, marginLeft: S.sm, alignSelf: 'flex-start' },
  hireBtnText: { color: C.white, fontWeight: 'bold', fontSize: 12 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TrabajadoresScreen() {
  const [tab, setTab] = useState<Tab>('staff');
  const { pendingRequests } = useGameStore();
  const reqCount = (pendingRequests ?? []).length;

  const tabs = [
    { id: 'staff', label: 'Staff' },
    { id: 'requests', label: reqCount > 0 ? `Requests (${reqCount})` : 'Requests' },
    { id: 'hire', label: 'Hire' },
  ];

  return (
    <View style={st.container}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Workers</Text>
      </View>
      <SubTabBar tabs={tabs} active={tab} onSelect={(t: string) => setTab(t as Tab)} />
      <View style={{ flex: 1 }}>
        {tab === 'staff' && <StaffTab />}
        {tab === 'requests' && <RequestsTab />}
        {tab === 'hire' && <HireTab />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  section: { paddingHorizontal: S.md, paddingTop: S.sm },
  sectionLabel: { color: C.textMuted, fontSize: F.size.md, fontWeight: 'bold', paddingHorizontal: S.md, paddingTop: S.lg, paddingBottom: 6 },
  stat: { color: C.text, fontSize: F.size.sm, paddingBottom: 4 },
  empty: { color: C.textFaint, padding: S.lg },
  label: { color: C.textMuted, fontSize: 12, marginBottom: 4 },
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm, marginHorizontal: S.md },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { fontSize: 26, marginRight: S.md },
  cardName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  cardSub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
});
