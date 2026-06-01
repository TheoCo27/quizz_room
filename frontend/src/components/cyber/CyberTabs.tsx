type CyberTabItem<T extends string> = {
    id: T;
    label: string;
    badge?: string | number;
};

type CyberTabsProps<T extends string> = {
    tabs: CyberTabItem<T>[];
    activeTab: T;
    onChange: (id: T) => void;
    className?: string;
};

export default function CyberTabs<T extends string>({
    tabs,
    activeTab,
    onChange,
    className = "",
}: CyberTabsProps<T>) {
    return (
        <div
            className={`cyber-tabs ${className}`.trim()}
            role="tablist"
            aria-label="Sections du profil"
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`tab-panel-${tab.id}`}
                        id={`tab-${tab.id}`}
                        className={`cyber-tab ${isActive ? "is-active" : ""}`.trim()}
                        onClick={() => onChange(tab.id)}
                    >
                        <span>{tab.label}</span>
                        {tab.badge != null ? (
                            <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.55rem]">
                                {tab.badge}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
