import { useEffect, useState } from 'react';
import { usePrefs } from './prefs';
import { t } from './i18n';
import { events } from './game/events';
import { ShortcutsHelp, useShortcuts } from './ui/Shortcuts';
import type { GameState } from './game/types';
import { useGame } from './game/store';
import { startGameLoop } from './game/loop';
import { UPGRADES } from './game/data/upgrades';
import { canAfford } from './game/engine/costs';
import { isUpgradeVisible } from './game/engine/modifiers';
import { ascensionUnlocked, endingReached } from './game/engine/progression';
import { startAudio } from './audio';
import { TopBar } from './ui/TopBar';
import { SceneView } from './ui/SceneView';
import { Advisor } from './ui/Advisor';
import { ActionBar } from './ui/ActionBar';
import { BuildingsPanel } from './ui/panels/BuildingsPanel';
import { UpgradesPanel } from './ui/panels/UpgradesPanel';
import { MarketPanel } from './ui/panels/MarketPanel';
import { OptionsPanel } from './ui/panels/OptionsPanel';
import { CivilizationPanel } from './ui/panels/CivilizationPanel';
import { ExpansionPanel } from './ui/panels/ExpansionPanel';
import { MegaprojectsPanel } from './ui/panels/MegaprojectsPanel';
import { AscensionPanel } from './ui/panels/AscensionPanel';
import { RecordsPanel } from './ui/panels/RecordsPanel';
import { MapPanel } from './ui/panels/MapPanel';
import { DiplomacyPanel } from './ui/panels/DiplomacyPanel';
import { FinancePanel } from './ui/panels/FinancePanel';
import { TranscendencePanel } from './ui/panels/TranscendencePanel';
import { DronesSection } from './ui/panels/DronesSection';
import { DepositSection } from './ui/panels/DepositSection';
import { DirectivesSection } from './ui/panels/DirectivesSection';
import { PlannerSection } from './ui/panels/PlannerSection';
import { doctrinePending } from './game/engine/doctrines';
import { MapView } from './ui/MapView';
import { EndingModal } from './ui/EndingModal';
import { OfflineModal, StoryModal, Toasts } from './ui/Overlays';
import { Buffs, EventCard } from './ui/EventCard';
import { Icon } from './ui/Icon';
import { Splash } from './ui/Splash';
import { Tips } from './ui/Tips';
import { FocusBoard } from './ui/FocusBoard';
import { useFoldText } from './ui/useFoldText';
import { Compass } from './ui/Compass';
import { EventResult } from './ui/EventResult';
import { Tutorial, tutorialEarly } from './ui/Tutorial';
import { SceneSwitch } from './ui/SceneSwitch';

type Tab = 'mining' | 'industry' | 'energy' | 'logistics' | 'research' | 'civilization' | 'commerce' | 'finance'
  | 'expansion' | 'map' | 'diplomacy' | 'megaprojects' | 'ascension' | 'transcendence' | 'records' | 'options';

interface TabDef { id: Tab; label: string; icon: string; visible?: (s: GameState) => boolean }

// Abas agrupadas por tema. Cada categoria de estrutura aparece numa única aba, e cada aba aparece só quando
// a fase dela chega (GDD: a complexidade é gradual).
const GROUPS: { label: string; tabs: TabDef[] }[] = [
  { label: 'Produção', tabs: [
    { id: 'mining', label: 'Mineração', icon: 'nav-mining' },
    { id: 'industry', label: 'Indústria', icon: 'nav-industry', visible: s => s.stats.totalMined >= 40 || s.buildings.refinery > 0 },
    { id: 'energy', label: 'Energia', icon: 'nav-energy', visible: s => s.buildings.miner > 0 || s.stats.totalMined >= 20 },
    { id: 'logistics', label: 'Logística', icon: 'icon-crate', visible: s => s.stats.totalMined >= 80 || s.buildings.storage > 0 },
  ] },
  { label: 'Sociedade', tabs: [
    { id: 'research', label: 'Pesquisa', icon: 'nav-research' },
    { id: 'civilization', label: 'Civilização', icon: 'nav-civilization', visible: s => !!s.upgrades.habitats },
    { id: 'commerce', label: 'Comércio', icon: 'nav-market' },
    { id: 'finance', label: 'Finanças', icon: 'nav-overview', visible: s => s.stats.earned >= 300 },
  ] },
  { label: 'Galáxia', tabs: [
    { id: 'expansion', label: 'Expansão', icon: 'nav-expansion', visible: s => !!s.upgrades.shipbuilding },
    { id: 'map', label: 'Mapa', icon: 'nav-map', visible: s => s.locations.length > 0 || s.expeditions.length > 0 },
    { id: 'diplomacy', label: 'Diplomacia', icon: 'region-system', visible: s => !!s.upgrades.diplomacy },
    { id: 'megaprojects', label: 'Megaprojetos', icon: 'mega-dyson-4', visible: s => !!s.upgrades.fusion },
  ] },
  { label: 'Legado', tabs: [
    { id: 'ascension', label: 'Ascensão', icon: 'icon-star', visible: s => ascensionUnlocked(s) || !!s.upgrades.megaEngineering },
    { id: 'transcendence', label: 'Transcendência', icon: 'star-white-dwarf', visible: s => endingReached(s) || (s.megaprojects.core ?? 0) >= 5 },
    { id: 'records', label: 'Registro', icon: 'icon-trophy' },
    { id: 'options', label: 'Opções', icon: 'nav-options' },
  ] },
];

function Panel({ tab, onHelp }: { tab: Tab; onHelp: () => void }) {
  switch (tab) {
    case 'mining': return <div className="panel-body"><DepositSection /><BuildingsPanel category="mining" intro={t('Extração de matéria-prima: minério e água.')} /></div>;
    case 'industry': return <><BuildingsPanel category="industry" intro={t('Transforma matéria-prima em produtos de maior valor.')} /><div className="panel-body planner-wrap"><PlannerSection /></div></>;
    case 'energy': return <BuildingsPanel category="energy" intro={t('Geração de energia para todas as máquinas.')} />;
    case 'logistics': return <><BuildingsPanel category="logistics" intro={t('Armazenamento e produção de drones.')} /><div className="panel-body drones"><DronesSection /><DirectivesSection /></div></>;
    case 'research': return <UpgradesPanel />;
    case 'civilization': return <CivilizationPanel />;
    case 'commerce': return <MarketPanel />;
    case 'finance': return <FinancePanel />;
    case 'expansion': return <ExpansionPanel />;
    case 'map': return <MapPanel />;
    case 'diplomacy': return <DiplomacyPanel />;
    case 'transcendence': return <TranscendencePanel />;
    case 'megaprojects': return <MegaprojectsPanel />;
    case 'ascension': return <AscensionPanel />;
    case 'records': return <RecordsPanel />;
    case 'options': return <OptionsPanel onShowShortcuts={onHelp} />;
  }
}

export function App() {
  const [tab, setTab] = useState<Tab>('mining');
  const [sceneReady, setSceneReady] = useState(false);
  const [help, setHelp] = useState(false);
  const lang = usePrefs(p => p.language);       // trocar de idioma redesenha a interface inteira
  const game = useGame(s => s.game);
  const behind = useGame(s => (s.report?.upkeep.ratio ?? 1) < 0.999);
  const reduce = game.settings.reduceMotion;

  useEffect(() => startGameLoop(), []);
  useEffect(() => startAudio(), []);
  // A aba Civilização mostra o planeta dos colonos; a Mineração volta para o asteroide.
  const setSceneView = useGame(s => s.setSceneView);
  useEffect(() => { if (tab === 'civilization') setSceneView('civ'); else if (tab === 'mining') setSceneView('base'); }, [tab, setSceneView]);
  useFoldText('painel');
  useFoldText('compass');
  // Cada aba abre no topo; o holofote (botão Ir) rola até o card depois disso.
  useEffect(() => { document.querySelectorAll<HTMLElement>('#painel, #painel .panel-body').forEach(e => { e.scrollTop = 0; }); }, [tab]);
  const focus = game.settings.focus;
  useEffect(() => { document.body.classList.toggle('reduce-motion', reduce); }, [reduce]);
  useEffect(() => { document.body.classList.toggle('focus-mode', focus); }, [focus]);

  const groups = GROUPS.map(g => ({ ...g, tabs: g.tabs.filter(t => !t.visible || t.visible(game)) })).filter(g => g.tabs.length);
  const tabs = groups.flatMap(g => g.tabs);
  const current = tabs.find(t => t.id === tab) ?? tabs[0];
  const researchReady = UPGRADES.some(u => isUpgradeVisible(u, game) && canAfford(game, u.cost)) || doctrinePending(game);
  const contractReady = game.contracts.some(c => game.resources[c.res] >= c.amount);
  const questReady = game.quests.some(q => game.resources[q.res] >= q.amount);
  // Título da aba mostra quantos alertas pedem atenção (útil com o jogo em segundo plano).
  const alerts = game.crises.length + (game.event ? 1 : 0) + game.contracts.filter(c => game.resources[c.res] >= c.amount).length + (researchReady ? 1 : 0) + (behind ? 1 : 0) + game.quests.filter(q => game.resources[q.res] >= q.amount).length;
  useEffect(() => { document.title = alerts > 0 ? `(${alerts}) ${t('Núcleo Estelar')}` : t('Núcleo Estelar'); }, [alerts, lang]);
  useShortcuts(i => { if (tabs[i]) setTab(tabs[i].id); }, () => setHelp(h => !h));

  return (
    <div className={`app ${focus ? 'focus' : ''} ${tutorialEarly(game) ? 'tutorial-early' : ''}`}>
      <a className="skip-link" href="#painel" onClick={e => { e.preventDefault(); document.getElementById('painel')?.focus(); }}>{t('Pular para o conteúdo')}</a>
      <TopBar />
      <nav className="sidenav" aria-label={t('Seções')}>
        {groups.map(g => (
          <div key={g.label} className="nav-group">
            <span className="nav-group-label">{t(g.label)}</span>
            {g.tabs.map(tb => (
              <button key={tb.id} className={`nav-item ${current.id === tb.id ? 'active' : ''}`} onClick={() => { if (tb.id !== current.id) events.emit({ type: 'nav' }); setTab(tb.id); }} aria-current={current.id === tb.id ? 'page' : undefined}>
                <Icon name={tb.icon} size={28} /> <span>{t(tb.label)}</span>
                {tb.id === 'research' && researchReady && <i className="dot" role="img" aria-label={t('pesquisa disponível')} />}
                {tb.id === 'diplomacy' && questReady && <i className="dot" role="img" aria-label={t('pedido de facção pronto para entregar')} />}
                {tb.id === 'commerce' && contractReady && <i className="dot" role="img" aria-label={t('contrato pronto para entregar')} />}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <main className="stage">
        <Compass goTo={setTab} available={tabs.map(x => x.id)} />
        {focus && <Tips />}
        <div className="scene-wrap">
          {/* Modo foco: sem a cena Pixi (libera a GPU); o painel de alertas ocupa o lugar dela. */}
          {!focus && <SceneView onReady={() => setSceneReady(true)} />}
          {current.id === 'map' && <MapView />}
          {focus && current.id !== 'map' && <FocusBoard goTo={setTab} />}
          {!focus && current.id !== 'map' && <SceneSwitch />}
          {!focus && <Buffs />}
          {!focus && <EventCard />}
          {!focus && <Tips />}
          <EventResult />
        </div>
        <ActionBar />
        <Advisor goTo={setTab} />
      </main>
      <section className="panel" id="painel" tabIndex={-1} aria-label={t(current.label)}>
        <h2 className="panel-title"><Icon name={current.icon} size={28} />{t(current.label)}</h2>
        <Panel tab={current.id} onHelp={() => setHelp(true)} />
      </section>
      <Tutorial goTo={setTab} tab={current.id} />
      <Toasts />
      <Splash ready={sceneReady || focus} />
      <OfflineModal />
      <StoryModal />
      {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
      <EndingModal onTranscend={() => setTab('transcendence')} />
    </div>
  );
}
