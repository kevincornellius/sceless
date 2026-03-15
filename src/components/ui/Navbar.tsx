
import { signal } from "@preact/signals";
import { loadSiteInfo } from "@/src/stores/indexeddb/siteinfo";
import { loadNotifications } from "@/src/stores/indexeddb/notification";
import { loadCourses, courses } from "@/src/stores/indexeddb/course";
import { replaceAllWith } from "@/src/stores/tabs";
import { useEffect, useState, useRef } from "preact/hooks";

// Signal to track which navbar dropdown is open (for closing others)
export const navbarDropdown = signal<"notifications" | "theme" | "profile" | null>(null);

export const closeAllDropdowns = () => {
    navbarDropdown.value = null;
};
import type { Profile as ProfileType } from "@/src/types/profile";
import type { AppNotification } from "@/src/types/scele";
import { LogOut, Clock, Bell, Search, ChevronDown, X, Palette, BookOpen, Trash2Icon } from "lucide-preact";
import { logout } from "@/src/stores/auth";
import { theme, changeTheme } from "@/src/stores/theme";
import { defaultThemes, type ThemeConfig } from "@/src/types/themes";
import { CourseDetailTab } from "@/src/pages/CourseDetailPage";
import { navigateTab } from "@/src/routing/router";
import { db } from "@/src/stores/indexeddb/db";

interface UserProfileProps {
    profile: ProfileType | null;
}

function Notifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadNotifications().then(({ notifications }) => {
            setNotifications(notifications);
        });
    }, []);

    const isOpen = navbarDropdown.value === "notifications";
    const setIsOpen = (open: boolean) => {
        navbarDropdown.value = open ? "notifications" : null;
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div 
            class="relative" 
            ref={dropdownRef}
        >
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="relative p-2 rounded-lg bg-page text-content-muted border-2 border-edge hover:bg-page-hover hover:text-content transition-all"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center text-white bg-danger">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div class="absolute right-0 top-full mt-2 w-80 max-h-96 bg-page border border-edge rounded-lg shadow-lg overflow-hidden z-50 flex flex-col">
                    <div class="p-3 border-b border-edge flex items-center justify-between">
                        <span class="font-semibold text-content">Notifications</span>
                        <span class="text-xs text-content-muted">{unreadCount} unread</span>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto scrollbar-thin">
                        {notifications.length === 0 ? (
                            <div class="p-4 text-center text-content-muted text-sm">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id}
                                    class={`p-3 border-b border-edge hover:bg-page-secondary cursor-pointer ${!notif.isRead ? 'bg-accent/5' : ''} `}
                                    onClick={() => {
                                        window.open(notif.url, "_blank");
                                    }}
                                    title={notif.title}
                                >
                                    <div class="flex items-start gap-2">
                                        {!notif.isRead && (
                                            <span class="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                                        )}
                                        <div class="flex-1 min-w-0">
                                            <div class={`text-sm truncate ${notif.isRead ? 'text-content-muted' : 'text-content font-medium'}`}>
                                                {notif.title}
                                            </div>
                                            <div class="text-xs text-content-muted mt-0.5">
                                                {notif.module}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ThemeSelector() {
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isOpen = navbarDropdown.value === "theme";
    const setIsOpen = (open: boolean) => {
        navbarDropdown.value = open ? "theme" : null;
    };

    const currentTheme = defaultThemes.find(t => t.name === theme.value.name) || defaultThemes[0];

    const handleThemeChange = async (t: ThemeConfig) => {
        await changeTheme(t);
        setIsOpen(false);
    };

    return (
        <div 
            class="relative" 
            ref={dropdownRef}
        >
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                class="p-2 rounded-lg bg-page text-content-muted border-2 border-edge hover:bg-page-hover hover:text-content transition-all"
                title="Change theme"
            >
                <Palette className="w-4 h-4" />
            </button>

            {isOpen && (
                <div class="absolute right-0 top-full mt-2 w-56 bg-page border border-edge rounded-lg shadow-lg overflow-hidden z-50">
                    <div class="p-3 border-b border-edge">
                        <span class="font-semibold text-content text-sm">Choose Theme</span>
                    </div>
                    
                    <div class="py-1">
                        {defaultThemes.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => handleThemeChange(t)}
                                class={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-page-secondary transition-colors ${
                                    t.name === currentTheme.name ? 'bg-page-secondary' : ''
                                }`}
                            >
                                <div 
                                    class="w-5 h-5 rounded-full border-2 border-edge"
                                    style={{ backgroundColor: t.primary }}
                                />
                                <span class="flex-1 text-left text-content">{t.name}</span>
                                {t.name === currentTheme.name && (
                                    <span class="text-xs text-primary font-medium">Active</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface UserProfileProps {
    profile: ProfileType | null;
}

function UserProfile({ profile }: UserProfileProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isOpen = navbarDropdown.value === "profile";
    const setIsOpen = (open: boolean) => {
        navbarDropdown.value = open ? "profile" : null;
    };

    const initials = profile?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ?? "?";

    const handleLogout = async () => {
        await logout();
    };
    const handleClearData = async () => {
        
        await db.clearFullDatabase();
        await browser.storage.local.clear();
        window.location.reload();
    }

    return (
        <div 
            class="relative" 
            ref={dropdownRef}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                class="flex items-center gap-2 pl-2 border-l-2 border-edge  hover:bg-black/5 transition-colors py-1"
            >
                {profile?.pictureurl ? (
                    <img
                        src={profile.pictureurl}
                        alt={profile.name}
                        class="w-8 h-8 rounded-lg object-cover"
                    />
                ) : (
                    <div class="w-8 h-8 rounded-lg bg-page flex items-center justify-center text-white text-sm font-bold">
                        {initials}
                    </div>
                )}
                <span class="text-sm font-semibold text-content hidden md:block">
                    {profile?.name.split(" ")[0] ?? "Loading..."}
                </span>
                <ChevronDown
                    width={14}
                    class={`text-content-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div class="absolute right-0 mt-2 top-full w-56 bg-page border border-edge rounded-lg shadow-lg overflow-hidden z-50">
                    {/* User Info */}
                    <div class="p-3 border-b border-edge">
                        <div class="font-semibold text-content text-sm truncate">
                            {profile?.name}
                        </div>
                        <div class="text-xs text-content-muted truncate">
                            @{profile?.username}
                        </div>
                    </div>

                    {/* Actions */}
                    <div class="py-1">
                        <button
                            onClick={handleLogout}
                            class="w-full flex items-center cursor-pointer gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                        >
                            <LogOut width={16} />
                            Logout
                        </button>
                        <button
                            onClick={handleClearData}
                            class="w-full flex items-center cursor-pointer gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                        >
                            <Trash2Icon width={16} />
                            Clear Data
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const Navbar = () => {
    const [profile, setProfile] = useState<ProfileType | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

	const [currentTime, setCurrentTime] = useState(new Date())
	
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])
	
	const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second:'2-digit' })
	const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    // Filter courses based on search
    const filteredCourses = searchQuery.trim()
        ? courses.value.filter(c => 
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 5)
        : [];

    const handleCourseClick = async (courseId: number, courseTitle: string) => {
        const tab = CourseDetailTab(courseId.toString(), courseTitle);
        navigateTab(tab);
        setSearchQuery("");
        setIsSearchOpen(false);
        closeAllDropdowns();
    };
    
    const handleSearchFocus = () => {
        setIsSearchOpen(true);
    };

    const handleSearchInput = (e: Event) => {
        setSearchQuery((e.target as HTMLInputElement).value);
        setIsSearchOpen(true);
    };
	
    useEffect(() => {
        loadSiteInfo().then(({ info }) => {
            if (info) setProfile(info);
        });
        loadCourses(); // Load courses globally for course title lookup
    }, []);

    return (
        <header class="h-14 shrink-0 flex items-center justify-between w-full pr-8">

			<div className="relative hidden sm:block" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                <input 
                    type="text" 
                    placeholder="Search courses..." 
                    value={searchQuery}
                    onInput={(e) => {
                        setSearchQuery((e.target as HTMLInputElement).value);
                        setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-64 lg:w-72 pl-9 pr-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none bg-page text-content border-edge focus:border-primary focus:ring-1 focus:ring-primary"
                />
                
                {/* Search Results Dropdown */}
                {isSearchOpen && filteredCourses.length > 0 && (
                    <div class="absolute top-full mt-2 w-full bg-page border border-edge rounded-lg shadow-lg overflow-hidden z-50">
                        {filteredCourses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => handleCourseClick(course.id, course.title)}
                                class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-primary/10 transition-colors"
                            >
                                <BookOpen class="w-4 h-4 text-content-muted" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-medium text-content truncate">{course.title}</div>
                                    <div class="text-xs text-content-muted">{course.code}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
        	</div>
			<div class="flex items-center gap-2">
				 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-page border-edge border-2">
					<Clock className="w-4 h-4 text-primary"/>
					<span className="text-sm font-semibold text-content">{timeStr}</span>
					<span className="text-xs font-medium text-content-muted max-lg:hidden">{dateStr}</span>
				</div>

				  <Notifications />

                  <ThemeSelector />

                <UserProfile profile={profile} />
			</div>

               
        </header>
    );
};

export default Navbar;