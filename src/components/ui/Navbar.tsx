
import { loadSiteInfo, forceRefreshSiteInfo } from "@/src/stores/indexeddb/siteinfo";
import { useEffect, useState } from "preact/hooks";
import { Profile } from "@/src/types/profile";
import { RefreshCw, LogOut, Clock, Bell, Search } from "lucide-preact";
import { logout } from "@/src/stores/auth";

const Navbar = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [notificationCount, setNotificationCount] = useState(0);

	const [currentTime, setCurrentTime] = useState(new Date())
	
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])
	
	const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second:'2-digit' })
	const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

	
    useEffect(() => {
        loadSiteInfo().then(({ info }) => {
            if (info) setProfile(info);
        });
    }, []);


    const handleLogout = async () => {
        await logout();
    };

    const initials = profile?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ?? "?";

    return (
        <header class="h-14 flex items-center justify-between  w-full pr-8">

			<div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input 
            type="text" 
            placeholder="Search courses, tasks..." 
            className="w-64 lg:w-72 pl-9 pr-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none bg-page text-content border-edge focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
			<div class="flex items-center gap-2">
				 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-page border-edge border-2">
					<Clock className="w-4 h-4 text-primary"/>
					<span className="text-sm font-semibold text-content">{timeStr}</span>
					<span className="text-xs font-medium text-content-muted">{dateStr}</span>
				</div>

				  <button className="relative p-2 rounded-lg bg-page text-content-muted border-2 border-edge hover:bg-page-hover hover:text-content transition-all">
					<Bell className="w-4 h-4" />
					{notificationCount > 0 && (
						<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center text-white bg-danger">
						{notificationCount}
						</span>
					)}
					</button>

                <div class="flex items-center gap-2 pl-2 border-l border-edge">
                    {profile?.pictureurl ? (
						<img
						src={profile.pictureurl}
						alt={profile.name}
						class="w-8 h-8 rounded-lg object-cover"
                        />
                    ) : (
						<div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">
                            {initials}
                        </div>
                    )}
                    <span class="text-sm font-semibold text-content hidden md:block">
                        {profile?.name.split(" ")[0] ?? "Loading..."}
                    </span>
                </div>
			</div>

               
        </header>
    );
};

export default Navbar;
