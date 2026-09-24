import './LanguageNav.scss';

import checkedIcon from '@/img/ic_checked.svg';
import { dynamicActivate } from '@/utils/lib/i18n';

import { t } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import cx from 'classnames';
import { useAppStore } from '@/zustand/useAppStore';
// import { useMedia } from 'react-use';
import Modal from '@/components/Common/Modal/Modal';

import IconLanguageEn from '@/img/language-en.svg?react';
import IconLanguageEs from '@/img/language-es.svg?react';
import IconLanguageZh from '@/img/language-zh.svg?react';
import IconLanguageZhTw from '@/img/language-zh_TW.svg?react';
import IconLanguageKo from '@/img/language-ko.svg?react';
import IconLanguageRu from '@/img/language-ru.svg?react';
import IconLanguageJa from '@/img/language-ja.svg?react';
import IconLanguageFr from '@/img/language-fr.svg?react';
import IconLanguageDe from '@/img/language-de.svg?react';
import IconLanguagePt from '@/img/language-pt.svg?react';

interface LanguageSelectorProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  onClose?: () => void;
}

const languageLabels = {
  en: 'English',
  es: 'Español',
  zh: '简体中文',
  zh_TW: '繁體中文',
  ko: '한국어',
  ru: 'Русский',
  ja: '日本語',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
};

const languageLabelsIcon = {
  en: <IconLanguageEn />,
  es: <IconLanguageEs />,
  zh: <IconLanguageZh />,
  zh_TW: <IconLanguageZhTw />,
  ko: <IconLanguageKo />,
  ru: <IconLanguageRu />,
  ja: <IconLanguageJa />,
  fr: <IconLanguageFr />,
  de: <IconLanguageDe />,
  pt: <IconLanguagePt />
};

const LanguageSelector = ({
  isVisible,
  setIsVisible,
  onClose
}: LanguageSelectorProps) => {

  const { i18n } = useLingui();
  const currentLanguage = i18n.locale;

  const settings = useAppStore((state) => state.settings);
  const { isCollapsed } = settings;

  // const isMobile = useMedia('(max-width: 768px)');
  // const isScreen1024 = useMedia('(max-width: 1024px)');

  const handleLanguageSelect = (locale: string) => {
    void dynamicActivate(locale);
  };

  const handleCloseModal = () => {
    setIsVisible(false);
    onClose();
  }

  return (
    <div
      className="language-body"
      style={{ width: isCollapsed ? '' : '100vw' }}
      onClick={handleCloseModal}
    >
      <Modal
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={t`Select Language`}
        className="w-screen"
        closeOnClickModal={false}
      >
        <div className="content-view">
          {Object.keys(languageLabels).map((locale) => (
            <div
              key={locale}
              className={cx(
                "language-item",
                {
                  'bg-dark-blue-200 !text-white': currentLanguage === locale,
                }
              )}
              onClick={() => { handleLanguageSelect(locale); handleCloseModal(); }}
            >
              <div className="language-icon">
                {
                  languageLabelsIcon[locale as keyof typeof languageLabels]
                }
              </div>
              <p className="language-text">
                {languageLabels[locale as keyof typeof languageLabels]}
              </p>
              {currentLanguage === locale && (
                <img
                  className="ml-auto"
                  src={checkedIcon}
                  alt={t`Selected language`}
                />
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export default LanguageSelector;
