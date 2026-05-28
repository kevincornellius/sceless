import { render } from "preact";
import "./style.css";
import { initializeTheme } from "@/src/stores/theme";
import WrappedPage from "@/src/pages/WrappedPage";

async function main() {
    await initializeTheme();
    render(<WrappedPage />, document.getElementById("app")!);
}

main();
