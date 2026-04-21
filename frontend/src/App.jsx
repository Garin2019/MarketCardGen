import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ProductPage from "./pages/ProductPage";
import TextGenerationPage from "./pages/TextGenerationPage";
import ImageGenerationPage from "./pages/ImageGenerationPage";
import SocialPage from "./pages/SocialPage";
import ResultPage from "./pages/ResultPage";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import "./index.css";

const rawEditorUrl = process.env.REACT_APP_EDITOR_URL;
const editorUrl =
  rawEditorUrl && !rawEditorUrl.includes("your-editor-app-url.com")
    ? rawEditorUrl
    : "/editor/";

function Layout({ children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg
            className="sidebar-logo__icon"
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <rect x="14" y="10" width="36" height="44" rx="9" fill="#EEF2FF" />
            <rect x="18" y="14" width="28" height="36" rx="7" fill="#312E81" />
            <rect x="23" y="20" width="18" height="12" rx="3.5" fill="#C7D2FE" />
            <rect x="23" y="37" width="18" height="3.5" rx="1.75" fill="#E0E7FF" />
            <rect x="23" y="43" width="13" height="3.5" rx="1.75" fill="#A5B4FC" />
          </svg>
          <span>MarketCardGen</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>📦 Товар</NavLink>
          <NavLink to="/templates">📝 Шаблоны</NavLink>
          <a href={editorUrl} target="_blank" rel="noopener noreferrer">🎨 Редактор</a>
          <NavLink to="/settings">⚙️ Настройки</NavLink>
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ProductPage />} />
            <Route path="/product/:id/text" element={<TextGenerationPage />} />
            <Route path="/product/:id/images" element={<ImageGenerationPage />} />
            <Route path="/product/:id/social" element={<SocialPage />} />
            <Route path="/product/:id/result" element={<ResultPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
