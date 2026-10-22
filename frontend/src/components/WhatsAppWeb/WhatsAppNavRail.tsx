  import React, { useState, useEffect } from 'react';
  import {
    LayoutDashboard, FolderTree, SlidersHorizontal, Database, Shield,
    Users, Settings, ChevronDown, ChevronRight, Crown, ArrowRight,
    ShieldCheck, BarChart2, Bot, Send, FileText, Cloud, Plus,
    Smartphone, MessageSquare
  } from 'lucide-react';

  interface WhatsAppNavRailProps {
    activeTab: string;
    onSelectTab: (tab: any) => void;
    unreadCount?: number;
    userName?: string;
    userRole?: 'SUPER_ADMIN' | 'ADMIN';
    onOpenUpgrade?: () => void;
    onOpenSuperAdmin?: () => void;
    onOpenSettings?: () => void;
    onLogout?: () => void;
  }

  export default function WhatsAppNavRail({
    activeTab,
    onSelectTab,
    unreadCount = 0,
    userName = 'Super Admin',
    userRole = 'SUPER_ADMIN',
    onOpenUpgrade,
    onOpenSuperAdmin,
    onOpenSettings,
    onLogout,
  }: WhatsAppNavRailProps) {
    // Accordion open state for submenus
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(
      activeTab === 'whatsapp' ? 'whatsapp' :
      activeTab === 'chatbot' ? 'chatbot' :
      (activeTab === 'optout' || activeTab === 'compliance') ? 'compliance' :
      (activeTab === 'migration' || activeTab === 'accounts') ? 'migration' :
      activeTab === 'verification' ? 'verification' :
      activeTab === 'templates' ? 'templates' :
      (activeTab === 'contacts' || activeTab === 'contacts-import' || activeTab === 'contacts-export') ? 'contacts' : null
    );

    useEffect(() => {
      if (activeTab === 'whatsapp') {
        setOpenSubmenu('whatsapp');
      } else if (activeTab === 'chatbot') {
        setOpenSubmenu('chatbot');
      } else if (activeTab === 'optout' || activeTab === 'compliance') {
        setOpenSubmenu('compliance');
      } else if (activeTab === 'migration') {
        setOpenSubmenu('migration');
      } else if (activeTab === 'verification') {
        setOpenSubmenu('verification');
      } else if (activeTab === 'templates') {
        setOpenSubmenu('templates');
      } else if (activeTab === 'contacts' || activeTab === 'contacts-import' || activeTab === 'contacts-export') {
        setOpenSubmenu('contacts');
      }
    }, [activeTab]);

    const toggleSubmenu = (id: string, defaultActionTab?: string) => {
      if (openSubmenu === id) {
        setOpenSubmenu(null);
      } else {
        setOpenSubmenu(id);
        if (defaultActionTab) {
          onSelectTab(defaultActionTab);
        }
      }
    };

    // Primary Navigation Items Matching Reference Designs with Zero Extraneous Buttons
    interface NavItem {
      id: string;
      label: string;
      icon: React.ReactNode;
      hasChevron: boolean;
      chevronType?: 'down' | 'right';
      onClick: () => void;
      active: boolean;
      subitems?: { id: string; label: string; tab: string }[];
    }

    const baseNavItems: NavItem[] = [
      {
        id: 'chats',
        label: 'Chats',
        icon: <MessageSquare size={17} />,
        hasChevron: false,
        onClick: () => {
          setOpenSubmenu(null);
          onSelectTab('chats');
        },
        active: activeTab === 'chats',
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={17} />,
        hasChevron: false,
        onClick: () => {
          setOpenSubmenu(null);
          onSelectTab('campaigns');
        },
        active: activeTab === 'dashboard' || activeTab === 'campaigns',
      },
      {
        id: 'organization',
        label: 'Organization',
        icon: <FolderTree size={17} />,
        hasChevron: true,
        chevronType: 'down',
        onClick: () => toggleSubmenu('organization', 'organization'),
        active: activeTab === 'organization',
        subitems: [
          { id: 'super-admin-ctrl', label: 'Control Center', tab: 'organization' },
        ],
      },
      {
      id: 'accounts',
      label: 'Accounts',
      icon: <SlidersHorizontal size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('accounts', 'accounts'),
      active: activeTab === 'accounts' || activeTab === 'instances',
      subitems: [
        { id: 'acc-chats', label: 'Chats', tab: 'chats' },
        { id: 'acc-mgr', label: 'Manage Accounts', tab: 'accounts' },
        { id: 'inst-mgr', label: 'Instance Manager', tab: 'instances' },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('users', 'users'),
      active: activeTab === 'users',
      subitems: [
        { id: 'usr-dir', label: 'User Directory', tab: 'users' },
      ],
    },
    {
      id: 'database-backup',
      label: 'Database & Backup',
      icon: <Database size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('database-backup', 'database-backup'),
      active: activeTab === 'database-backup',
      subitems: [
        { id: 'db-backup', label: 'Backup & Export', tab: 'database-backup' },
        { id: 'db-migration', label: 'Migration Wizard', tab: 'migration' },
      ],
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: <Shield size={17} />,
      hasChevron: true,
      chevronType: (openSubmenu === 'compliance' || activeTab === 'compliance' || activeTab === 'optout') ? 'down' : 'right',
      onClick: () => toggleSubmenu('compliance', 'optout'),
      active: activeTab === 'compliance' || activeTab === 'optout' || activeTab === 'verification',
      subitems: [
        { id: 'comp-overview', label: 'Compliance Overview', tab: 'compliance' },
        { id: 'comp-optout', label: 'Opt-Out', tab: 'optout' },
        { id: 'comp-blocked', label: 'Blocked Numbers', tab: 'optout' },
        { id: 'comp-policy', label: 'Policy Settings', tab: 'optout' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: onOpenSettings || (() => onSelectTab('settings')),
      active: activeTab === 'settings',
    },
  ];

  // Contextual Module Item matching exact active view mockup (Zero Extra Buttons)
  const contextualNavItems: NavItem[] = [];
  if (activeTab === 'migration' || activeTab === 'accounts' || activeTab === 'database-backup') {
    contextualNavItems.push({
      id: 'migration',
      label: 'Migration',
      icon: <Send size={16} style={{ transform: 'rotate(-45deg)' }} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('migration', 'migration'),
      active: activeTab === 'migration' || (activeTab === 'accounts' && openSubmenu === 'migration'),
      subitems: [
        { id: 'mig-assist', label: 'Migration Assistant', tab: 'migration' },
        { id: 'mig-history', label: 'Migration History', tab: 'migration' },
        { id: 'mig-export', label: 'Export Data', tab: 'migration' },
      ],
    });
  } else if (activeTab === 'templates') {
    contextualNavItems.push({
      id: 'templates',
      label: 'Templates',
      icon: <FileText size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('templates', 'templates'),
      active: true,
      subitems: [
        { id: 'tpl-msg', label: 'Message Templates', tab: 'templates' },
        { id: 'tpl-quick', label: 'Quick Replies', tab: 'templates' },
        { id: 'tpl-cats', label: 'Template Categories', tab: 'templates' },
      ],
    });
  } else if (activeTab === 'contacts' || activeTab === 'contacts-import' || activeTab === 'contacts-export') {
    contextualNavItems.push({
      id: 'contacts',
      label: 'Contacts',
      icon: <Users size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('contacts', 'contacts'),
      active: true,
      subitems: [
        { id: 'cnt-groups', label: 'Contact Groups', tab: 'contacts' },
        { id: 'cnt-segments', label: 'Segments', tab: 'contacts' },
        { id: 'cnt-import', label: 'Import Contacts', tab: 'contacts-import' },
        { id: 'cnt-export', label: 'Export Contacts', tab: 'contacts-export' },
      ],
    });
  } else if (activeTab === 'chatbot' || activeTab === 'auto-reply') {
    contextualNavItems.push({
      id: 'chatbot',
      label: 'Chatbot',
      icon: <Bot size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('chatbot', 'chatbot'),
      active: true,
      subitems: [
        { id: 'bot-flow-builder', label: 'Flow Builder', tab: 'chatbot' },
        { id: 'bot-ai-responses', label: 'AI Responses', tab: 'chatbot' },
        { id: 'bot-keywords', label: 'Keywords', tab: 'auto-reply' },
        { id: 'bot-webhooks', label: 'Webhooks', tab: 'chatbot' },
      ],
    });
  } else if (activeTab === 'analytics') {
    contextualNavItems.push({
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart2 size={17} />,
      hasChevron: false,
      onClick: () => {
        setOpenSubmenu(null);
        onSelectTab('analytics');
      },
      active: true,
    });
  } else if (activeTab === 'verification') {
    contextualNavItems.push({
      id: 'verification',
      label: 'Verification',
      icon: <Shield size={17} />,
      hasChevron: true,
      chevronType: 'down',
      onClick: () => toggleSubmenu('verification', 'verification'),
      active: true,
      subitems: [
        { id: 'ver-biz', label: 'Business Verification', tab: 'verification' },
        { id: 'ver-green', label: 'Green Tick Status', tab: 'verification' },
        { id: 'ver-requests', label: 'Verification Requests', tab: 'verification' },
        { id: 'ver-audit', label: 'Audit Logs', tab: 'verification' },
      ],
    });
  }

  const primaryNavItems = [...baseNavItems, ...contextualNavItems];

  const showSystemHealthy = activeTab === 'analytics' || activeTab === 'system-overview';

  return (
    <nav style={styles.sidebar}>
      {/* ── Scrollable Menu List Matching Reference Designs ──── */}
      <div style={styles.menuScroll}>
        <div style={styles.menuList}>
          {primaryNavItems.map(item => {
            const isItemActive = item.active;
            const isSubOpen = openSubmenu === item.id;

            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <button
                  onClick={item.onClick}
                  style={{
                    ...styles.navBtn,
                    background: isItemActive
                      ? 'linear-gradient(90deg, rgba(0, 168, 132, 0.28) 0%, rgba(14, 45, 48, 0.6) 100%)'
                      : 'transparent',
                    border: isItemActive ? '1px solid #00a884' : '1px solid transparent',
                    color: isItemActive ? '#ffffff' : '#94a3b8',
                    fontWeight: isItemActive ? 600 : 500,
                    boxShadow: isItemActive ? '0 0 16px rgba(0, 168, 132, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none',
                  }}
                >
                  <div style={styles.navBtnLeft}>
                    <span style={{ color: isItemActive ? '#2dd4bf' : '#8696a0', display: 'flex' }}>
                      {item.icon}
                    </span>
                    <span style={{ ...styles.navBtnLabel, color: isItemActive ? '#ffffff' : '#94a3b8' }}>
                      {item.label}
                    </span>
                  </div>

                  {item.hasChevron && (
                    item.chevronType === 'right' && !isSubOpen ? (
                      <ChevronRight
                        size={14}
                        color={isItemActive ? '#ffffff' : '#64748b'}
                        style={{ opacity: 0.75 }}
                      />
                    ) : (
                      <ChevronDown
                        size={14}
                        color={isItemActive ? '#ffffff' : '#64748b'}
                        style={{
                          transform: isSubOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          opacity: 0.75,
                        }}
                      />
                    )
                  )}
                </button>

                {/* Submenu accordion items if expanded */}
                {item.hasChevron && isSubOpen && item.subitems && (
                  <div style={styles.submenuBox}>
                    {item.subitems.map((sub, sIdx) => {
                      const isSubActive = isItemActive && (sIdx === 0 || activeTab === sub.tab);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => onSelectTab(sub.tab)}
                          style={{
                            ...styles.submenuBtn,
                            color: isSubActive ? '#2dd4bf' : '#94a3b8',
                            background: isSubActive ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                            fontWeight: isSubActive ? 600 : 500,
                          }}
                        >
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isSubActive ? '#2dd4bf' : 'transparent',
                            border: isSubActive ? 'none' : '1.5px solid #64748b',
                            display: 'inline-block',
                            marginRight: 8,
                            flexShrink: 0,
                            boxShadow: isSubActive ? '0 0 6px rgba(45, 212, 191, 0.6)' : 'none',
                          }} />
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Section: Design 17 (Trust Builds Brands) vs Design 16 (Stay Compliant) vs Design 15/14/13/12/11/10 ── */}
      <div style={styles.bottomSection}>
        {activeTab === 'verification' ? (
          /* Design 17: Trust Builds Brands Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Shield size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Trust Builds Brands</div>
                <div style={styles.upgradeSub}>Get your business verified and grow with confidence.</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('verification')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : (activeTab === 'optout' || activeTab === 'compliance') ? (
          /* Design 16: Stay Compliant Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Shield size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Stay Compliant</div>
                <div style={styles.upgradeSub}>Build trust with your customers with industry best practices.</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('optout')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : activeTab === 'whatsapp' ? (
          /* Design 20: Secure Your Business Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Shield size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Secure Your Business</div>
                <div style={styles.upgradeSub}>Enable 2FA and keep your account safe and trusted.</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('verification')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : (activeTab === 'migration' || activeTab === 'database-backup' || activeTab === 'accounts') ? (
          /* Design 19: Secure Your Data Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Cloud size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Secure Your Data</div>
                <div style={styles.upgradeSub}>Backup and migrate with confidence, anytime.</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab(activeTab === 'database-backup' ? 'database-backup' : 'migration')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : (activeTab === 'contacts' || activeTab === 'contacts-import' || activeTab === 'contacts-export') ? (
          /* Design 14: Manage Your Contacts Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Users size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Manage Your Contacts</div>
                <div style={styles.upgradeSub}>Create groups, segment audience and send targeted messages easily.</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('contacts')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : activeTab === 'templates' ? (
          /* Design 13: Boost Engagement Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Send size={15} color="#2dd4bf" style={{ transform: 'rotate(-45deg)', margin: '2px 0 0 2px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Boost Engagement</div>
                <div style={styles.upgradeSub}>Use templates to reply faster and improve customer satisfaction.</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('templates')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : (activeTab === 'chatbot' || activeTab === 'auto-reply') ? (
          /* Design 12: Build Smarter Bots Card matching Mockup */
          <div style={styles.buildBotsCard}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path d="M-20 70 Q 40 20, 110 65 T 220 30" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="2" fill="none" />
                <path d="M-10 85 Q 60 40, 130 80 T 230 55" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.botIconWrap}>
                <Bot size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Build Smarter Bots</div>
                <div style={styles.upgradeSub}>Automate conversations and grow your business</div>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('chatbot')}
              style={styles.viewPlansBtn}
            >
              <span>Learn More</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : showSystemHealthy ? (
          /* Design 11: System Healthy Card + Version Footer */
          <div style={styles.systemHealthyWrapper}>
            <div style={styles.silkWaveBottom}>
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                <path
                  d="M-20 70 Q 40 20, 110 65 T 220 30"
                  stroke="rgba(45, 212, 191, 0.22)"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M-10 85 Q 60 40, 130 80 T 230 55"
                  stroke="rgba(16, 185, 129, 0.16)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>

            <div style={styles.systemHealthyCard}>
              <div style={styles.shieldIconWrap}>
                <ShieldCheck size={18} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.systemHealthyTitleRow}>
                  <span style={styles.systemHealthyTitle}>System Healthy</span>
                  <span style={styles.greenOnlineDot} />
                </div>
                <div style={styles.systemHealthySub}>All services are running</div>
              </div>
            </div>

            <div style={styles.footerVersionBox}>
              <div style={styles.versionTitle}>Chat Pro v2.0</div>
              <div style={styles.versionSub}>Enterprise • Secure • Scalable</div>
            </div>
          </div>
        ) : (
          /* Design 10: "Upgrade Your Plan" Card with glowing silk waves */
          <div style={styles.upgradePlanCard}>
            <div style={styles.waveSilkBackground}>
              <svg width="100%" height="100%" viewBox="0 0 200 110" fill="none" preserveAspectRatio="none">
                <path
                  d="M-20 85 Q 40 30, 110 75 T 220 40"
                  stroke="rgba(45, 212, 191, 0.28)"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M-10 100 Q 60 50, 130 90 T 230 65"
                  stroke="rgba(16, 185, 129, 0.2)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M10 115 Q 80 70, 150 105 T 240 85"
                  stroke="rgba(45, 212, 191, 0.12)"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={styles.crownIconWrap}>
                <Crown size={17} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.upgradeTitle}>Upgrade Your Plan</div>
                <div style={styles.upgradeSub}>Unlock more features &amp; boost your productivity</div>
              </div>
            </div>

            <button
              onClick={onOpenUpgrade}
              style={styles.viewPlansBtn}
            >
              <span>View Plans</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    background: '#0F172A',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '14px 10px',
    flexShrink: 0,
    height: '100%',
    boxSizing: 'border-box',
    userSelect: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  menuScroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: 2,
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  navBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    border: 'none',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    outline: 'none',
  },
  navBtnLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  navBtnLabel: {
    letterSpacing: '-0.1px',
    fontSize: 13,
  },
  submenuBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingLeft: 28,
    paddingTop: 4,
    paddingBottom: 4,
  },
  submenuBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  bottomSection: {
    paddingTop: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  buildBotsCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(8, 36, 40, 0.85) 0%, rgba(6, 22, 26, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 14,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  botIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 12px rgba(45, 212, 191, 0.25)',
  },
  systemHealthyWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  silkWaveBottom: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    pointerEvents: 'none',
    opacity: 0.8,
  },
  systemHealthyCard: {
    background: 'rgba(8, 28, 32, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 12,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
    position: 'relative',
    zIndex: 1,
  },
  shieldIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  systemHealthyTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  systemHealthyTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  greenOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  systemHealthySub: {
    fontSize: 10,
    color: '#8696a0',
    marginTop: 1,
  },
  footerVersionBox: {
    paddingLeft: 4,
    position: 'relative',
    zIndex: 1,
  },
  versionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2dd4bf',
    letterSpacing: '0.2px',
  },
  versionSub: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 1,
  },
  upgradePlanCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(8, 32, 36, 0.85) 0%, rgba(6, 20, 24, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 14,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  waveSilkBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    opacity: 0.8,
  },
  crownIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 12px rgba(45, 212, 191, 0.25)',
  },
  upgradeTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#ffffff',
  },
  upgradeSub: {
    fontSize: 10,
    color: '#8696a0',
    marginTop: 2,
    lineHeight: 1.35,
  },
  viewPlansBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    width: 'fit-content',
    boxShadow: '0 3px 12px rgba(0, 168, 132, 0.4)',
    position: 'relative',
    zIndex: 1,
    transition: 'all 0.15s ease',
  },
};
