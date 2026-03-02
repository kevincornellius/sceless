import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/Layout";
import type { initialData } from "./types/scele";

const App = ({ data }: { data: initialData }) => {
	if (!data.isLoggedIn) {
		return <LoginPage />;
	}

	return (
		<Layout data={data}>
			<h1 class="text-2xl font-semibold">
				Welcome back, {data.username?.split(" ")[0]}!
			</h1>
		</Layout>
	);
};

export default App;
