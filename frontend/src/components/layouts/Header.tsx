/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { TopNavigation } from '@cloudscape-design/components';
import { UserContext } from 'context/UserContext';
import { useLocalStorage } from 'pages/common/use-local-storage';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  ANALYTICS_INFO_KEY,
  IUserRole,
  PROJECT_CONFIG_JSON,
  ZH_LANGUAGE_LIST,
} from 'ts/const';
import HeaderSwitchSpaceModal from './SwitchSpaceModal';

interface IHeaderProps {
  user: any;
  signOut: any;
}

const ZH_TEXT = '简体中文';
const EN_TEXT = 'English(US)';
const LANGUAGE_ITEMS = [
  { id: 'en', text: EN_TEXT },
  { id: 'zh', text: ZH_TEXT },
];

const Header: React.FC<IHeaderProps> = (props: IHeaderProps) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, signOut } = props;
  const [displayName, setDisplayName] = useState('');
  const [fullLogoutUrl, setFullLogoutUrl] = useState('');
  const [switchProjectVisible, setSwitchProjectVisible] = useState(false);
  const [analyticsInfo, setAnalyticsInfo] = useLocalStorage(
    ANALYTICS_INFO_KEY,
    {
      projectId: '',
      projectName: '',
      appId: '',
      appName: '',
    }
  );
  const currentUser = useContext(UserContext);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  useEffect(() => {
    setDisplayName(
      user?.profile?.email ||
        user?.profile?.name ||
        user?.profile?.preferred_username ||
        user?.profile?.nickname ||
        user?.profile?.sub ||
        ''
    );
  }, [user]);

  useEffect(() => {
    if (ZH_LANGUAGE_LIST.includes(i18n.language)) {
      changeLanguage('zh');
    }
    const configJSONObj: ConfigType = localStorage.getItem(PROJECT_CONFIG_JSON)
      ? JSON.parse(localStorage.getItem(PROJECT_CONFIG_JSON) || '')
      : {};
    if (configJSONObj.oidc_logout_url) {
      const redirectUrl = configJSONObj.oidc_redirect_url.replace(
        '/signin',
        ''
      );
      const queryParams = new URLSearchParams({
        client_id: configJSONObj.oidc_client_id,
        id_token_hint: user.id_token,
        logout_uri: redirectUrl,
        redirect_uri: redirectUrl,
        post_logout_redirect_uri: redirectUrl,
      });
      const logoutUrl = new URL(configJSONObj.oidc_logout_url);
      logoutUrl.search = queryParams.toString();
      setFullLogoutUrl(decodeURIComponent(logoutUrl.toString()));
    }
  }, []);

  return (
    <header id="h">
      <TopNavigation
        identity={{
          href: currentUser?.role === IUserRole.ANALYST ? '/analytics' : '/',
          title: t('header.solution') ?? '',
        }}
        utilities={
          location.pathname.startsWith('/analytics')
            ? [
                {
                  type: 'button',
                  variant: 'link',
                  text: `${analyticsInfo?.projectName} / ${analyticsInfo.appName}`,
                },
                {
                  type: 'button',
                  variant: 'primary-button',
                  text: t('header.switchSpace') ?? '',
                  onClick: () => {
                    setSwitchProjectVisible(true);
                  },
                },
                {
                  type: 'menu-dropdown',
                  text: ZH_LANGUAGE_LIST.includes(i18n.language)
                    ? ZH_TEXT
                    : EN_TEXT,
                  title: 'Language',
                  ariaLabel: 'settings',
                  onItemClick: (item) => {
                    changeLanguage(item.detail.id);
                  },
                  items:
                    i18n.language === 'zh'
                      ? LANGUAGE_ITEMS.reverse()
                      : LANGUAGE_ITEMS,
                },
                {
                  type: 'menu-dropdown',
                  text: displayName,
                  description: displayName,
                  iconName: 'user-profile',
                  onItemClick: (item) => {
                    if (item.detail.id === 'signout') {
                      if (fullLogoutUrl) {
                        signOut?.();
                        window.location.href = fullLogoutUrl;
                      }
                      signOut?.();
                    }
                  },
                  items: [{ id: 'signout', text: t('header.signOut') || '' }],
                },
              ]
            : [
                {
                  type: 'button',
                  text: t('header.solutionLibrary') || '',
                  href: 'https://aws.amazon.com/solutions/',
                  external: true,
                },
                {
                  type: 'menu-dropdown',
                  text: ZH_LANGUAGE_LIST.includes(i18n.language)
                    ? ZH_TEXT
                    : EN_TEXT,
                  title: 'Language',
                  ariaLabel: 'settings',
                  onItemClick: (item) => {
                    changeLanguage(item.detail.id);
                  },
                  items:
                    i18n.language === 'zh'
                      ? LANGUAGE_ITEMS.reverse()
                      : LANGUAGE_ITEMS,
                },
                {
                  type: 'menu-dropdown',
                  text: displayName,
                  description: displayName,
                  iconName: 'user-profile',
                  onItemClick: (item) => {
                    if (item.detail.id === 'signout') {
                      if (fullLogoutUrl) {
                        signOut?.();
                        window.location.href = fullLogoutUrl;
                      }
                      signOut?.();
                    }
                  },
                  items: [{ id: 'signout', text: t('header.signOut') || '' }],
                },
              ]
        }
        i18nStrings={{
          searchIconAriaLabel: t('header.search') || '',
          searchDismissIconAriaLabel: t('header.closeSearch') || '',
          overflowMenuTriggerText: t('header.more') || '',
          overflowMenuTitleText: t('header.all') || '',
          overflowMenuBackIconAriaLabel: t('header.back') || '',
          overflowMenuDismissIconAriaLabel: t('header.closeMenu') || '',
        }}
      />
      <HeaderSwitchSpaceModal
        visible={switchProjectVisible}
        disableClose={false}
        setSwitchProjectVisible={setSwitchProjectVisible}
        setAnalyticsInfo={setAnalyticsInfo}
      />
    </header>
  );
};

export default Header;
