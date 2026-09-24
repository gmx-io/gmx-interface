import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { t, Trans } from '@lingui/macro';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useSWRConfig } from 'swr';
import { FloatingPortal } from '@floating-ui/react';
import { useGtGlobalDetails, useGtUserDetails } from '@/hooks/fetchHooks';
import { STORE_KEY } from '@/hooks/fetchHooks/useStoreAccount';
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { useAppStore } from '@/zustand/useAppStore';
import IconHelp from '@/img/referrals/help.svg';
import MyTab from './My';
import GlobalTab from './Global';
import EarnGtPanel from './My/EarnGtPanel';
import BuybackSeason2 from './Buyback/BuybackSeason2';
import './index.scss';
import {
  getGmw406Enabled,
  getGmw410Enabled,
  getGmw411Enabled,
  getGmw426Enabled,
  getGmw431Enabled,
  getGmw446Enabled,
} from '@/config/featureFlagEnable';

type TabType = 'my' | 'global' | 'buyback';

type GtTabListProps = {
  tabs: Array<{ id: TabType; label: ReactNode }>;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

function isTabType(value: string | undefined): value is TabType {
  return value === 'my' || value === 'global' || value === 'buyback';
}

function useFetchGtUserDetails() {
  const { setUserDetails, setIsLoading } = useAppStore(
    useShallow((state) => ({
      setUserDetails: state.gtState.setUserDetails,
      setIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { gtDetails, isLoading } = useGtUserDetails();
  useEffect(() => {
    setIsLoading(isLoading);
    setUserDetails(gtDetails ?? null);
  }, [isLoading, gtDetails, setIsLoading, setUserDetails]);
}

function useFetchGtGlobalDetails() {
  const { mutate } = useSWRConfig();
  const { setGlobalDetails, setIsLoading } = useAppStore(
    useShallow((state) => ({
      setGlobalDetails: state.gtState.setGlobalDetails,
      setIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { gtGlobalDetails, isLoading } = useGtGlobalDetails();
  useEffect(() => {
    setIsLoading(isLoading);
    setGlobalDetails(gtGlobalDetails ?? null);
  }, [isLoading, setIsLoading, gtGlobalDetails, setGlobalDetails]);

  useEffect(() => {
    const interval = setInterval(() => {
      void mutate(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (key: any) => key?.key === STORE_KEY
      );
    }, DEFAULT_SWR_REFRESH_INTERVAL_15S);
    return () => clearInterval(interval);
  }, [mutate]);
}

function NewGtBootstrap() {
  useFetchGtUserDetails();
  useFetchGtGlobalDetails();
  return null;
}

const TAB_STORAGE_KEY = 'newgt_active_tab';

function getInitialTab(
  tabs: [{ id: TabType }, ...Array<{ id: TabType }>]
): TabType {
  const saved = localStorage.getItem(TAB_STORAGE_KEY);
  if (isTabType(saved ?? undefined) && tabs.some((tab) => tab.id === saved)) {
    return saved;
  }
  return tabs[0].id;
}

function useAvailableTabs() {
  return useMemo(() => {
    const availableTabs: Array<{ id: TabType; label: ReactNode }> = [];
    if (getGmw410Enabled()) {
      availableTabs.push({ id: 'my', label: <Trans>My</Trans> });
    }
    if (getGmw411Enabled()) {
      availableTabs.push({ id: 'global', label: <Trans>Global</Trans> });
    }
    if (getGmw406Enabled()) {
      availableTabs.push({ id: 'buyback', label: <Trans>Buyback</Trans> });
    }

    return availableTabs as [
      { id: TabType; label: ReactNode },
      ...Array<{ id: TabType; label: ReactNode }>,
    ];
  }, []);
}

function getNewGtPageClassName() {
  return `newgt-page${getGmw426Enabled() ? ' gmw-426-enabled' : ''}${
    getGmw446Enabled() ? ' gmw-446-enabled' : ''
  }`;
}

function renderGtTabContent(
  activeTab: TabType | null,
  onNavigateToBuyback: () => void,
  fallbackToBuyback: boolean
) {
  if (!activeTab) {
    return null;
  }
  if (getGmw446Enabled()) {
    switch (activeTab) {
      case 'my':
        return <MyTab />;
      case 'global':
        return <GlobalTab />;
      case 'buyback':
        return <BuybackSeason2 />;
      default:
        return null;
    }
  }
  switch (activeTab) {
    case 'my':
      return <MyTab onNavigateToBuyback={onNavigateToBuyback} />;
    case 'global':
      return <GlobalTab />;
    case 'buyback':
      return <BuybackSeason2 />;
    default:
      return fallbackToBuyback ? <BuybackSeason2 /> : null;
  }
}

function OldGtTabList({ tabs, activeTab, onTabChange }: GtTabListProps) {
  return (
    <div className="newgt-tabs" role="tablist">
      {tabs.map((tabItem, index) => (
        <Fragment key={tabItem.id}>
          {index > 0 && (
            <span className="newgt-tab-divider" aria-hidden="true" />
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tabItem.id}
            className={`newgt-tab${activeTab === tabItem.id ? ' active' : ''}`}
            onClick={() => onTabChange(tabItem.id)}
          >
            {tabItem.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

function NewGtTabList({ tabs, activeTab, onTabChange }: GtTabListProps) {
  const [earnOpen, setEarnOpen] = useState(false);

  return (
    <>
      <div className="newgt-tabs" role="tablist">
        {tabs.map((tabItem, index) => (
          <Fragment key={tabItem.id}>
            {index > 0 && (
              <span className="newgt-tab-divider" aria-hidden="true" />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tabItem.id}
              className={`newgt-tab${activeTab === tabItem.id ? ' active' : ''}`}
              onClick={() => onTabChange(tabItem.id)}
            >
              {tabItem.label}
            </button>
          </Fragment>
        ))}
        <button
          type="button"
          className="newgt-title-help"
          onClick={() => setEarnOpen(true)}
          aria-label={t`How To Earn GT`}
        >
          <img src={IconHelp} alt="" aria-hidden="true" />
        </button>
      </div>
      {earnOpen && (
        <FloatingPortal>
          <EarnGtPanel onClose={() => setEarnOpen(false)} />
        </FloatingPortal>
      )}
    </>
  );
}

function GtTabList(props: GtTabListProps) {
  return getGmw446Enabled() ? (
    <NewGtTabList {...props} />
  ) : (
    <OldGtTabList {...props} />
  );
}

function NewGTPageWithRouteTabs() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const tabs = useAvailableTabs();

  const fallbackTab = tabs[0]?.id ?? 'my';
  const activeTab =
    isTabType(tab) && tabs.some((t) => t.id === tab) ? tab : null;

  const handleTabChange = useCallback(
    (nextTab: TabType) => {
      navigate(`/gt/${nextTab}`);
    },
    [navigate]
  );

  const content = useMemo(
    () =>
      renderGtTabContent(
        activeTab,
        () => handleTabChange('buyback'),
        false
      ),
    [activeTab, handleTabChange]
  );

  if (!activeTab) {
    return <Navigate to={`/gt/${fallbackTab}`} replace />;
  }

  return (
    <div className={getNewGtPageClassName()}>
      <NewGtBootstrap />
      <div className="newgt-container">
        <div className="newgt-main">
          <GtTabList
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <div className="newgt-content">{content}</div>
        </div>
      </div>
    </div>
  );
}

function NewGTPageWithLocalTabs() {
  const tabs = useAvailableTabs();
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    getInitialTab(tabs)
  );

  const handleTabChange = useCallback((nextTab: TabType) => {
    setActiveTab(nextTab);
    localStorage.setItem(TAB_STORAGE_KEY, nextTab);
  }, []);

  const content = useMemo(
    () =>
      renderGtTabContent(
        activeTab,
        () => handleTabChange('buyback'),
        true
      ),
    [activeTab, handleTabChange]
  );

  return (
    <div className={getNewGtPageClassName()}>
      <NewGtBootstrap />
      <div className="newgt-container">
        <div className="newgt-main">
          <GtTabList
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <div className="newgt-content">{content}</div>
        </div>
      </div>
    </div>
  );
}

export default getGmw431Enabled()
  ? NewGTPageWithRouteTabs
  : NewGTPageWithLocalTabs;
