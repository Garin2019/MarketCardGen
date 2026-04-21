import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useTemplatesStore } from './store/templatesStore';
import { initializeCustomFonts } from './utils/customFonts';
import { initializeLocalFonts } from './utils/localFonts';
import { TemplateNewPage } from './pages/TemplateNewPage';
import { TemplateEditPage } from './pages/TemplateEditPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CardNewPage } from './pages/CardNewPage';
import { CardEditPage } from './pages/CardEditPage';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-dark">Редактор карточек товара</Link>
        <nav className="flex space-x-2">
          <Link to="/" className="px-4 py-2 rounded-md text-gray-700 hover:bg-neutral">Главная</Link>
          <Link to="/templates" className="px-4 py-2 rounded-md text-gray-700 hover:bg-neutral">Шаблоны</Link>
          <Link to="/card/new" className="px-4 py-2 rounded-md bg-secondary text-white hover:bg-secondary/90">Создать карточку</Link>
          <Link to="/templates/new" className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90">Новый шаблон</Link>
        </nav>
      </div>
    </header>
    <main className="pt-16">{children}</main>
  </div>
);

const StartPage = () => {
  const templates = useTemplatesStore(state => state.templates);
  const hasTemplates = templates.length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-secondary/10">
      <div className="text-center px-4">
        <h1 className="text-5xl font-bold text-dark mb-4">Создавайте карточки товаров легко</h1>
        <p className="text-xl text-gray-600 mb-8">Создавайте шаблоны, загружайте фото, получайте готовые карточки</p>
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Link 
            to="/card/new" 
            className={`inline-block px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transition-all ${
              hasTemplates 
                ? 'bg-secondary text-white hover:bg-secondary/90' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={(e) => !hasTemplates && e.preventDefault()}
          >
            📸 Создать карточку
          </Link>
          {!hasTemplates && (
            <p className="text-sm text-red-600">Сначала создайте хотя бы один шаблон</p>
          )}
          <Link 
            to="/templates" 
            className="inline-block px-8 py-4 bg-primary text-white rounded-lg text-lg font-semibold hover:bg-primary/90 shadow-lg">
            🎨 Мои шаблоны {hasTemplates && `(${templates.length})`}
          </Link>
          <Link 
            to="/templates/new" 
            className="inline-block px-8 py-4 bg-blue-200 text-blue-900 rounded-lg text-lg font-semibold hover:bg-blue-300 shadow-lg">
            ✨ Создать новый шаблон
          </Link>
        </div>
      </div>
    </div>
  );
};

function App() {
  useEffect(() => {
    // Initialize custom fonts on app startup
    initializeCustomFonts();
    // Initialize local fonts from public/fonts/ folder
    initializeLocalFonts();
  }, []);

  return (
    <BrowserRouter
      basename="/editor"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Layout>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplateNewPage />} />
          <Route path="/templates/:id/edit" element={<TemplateEditPage />} />
          <Route path="/card/new" element={<CardNewPage />} />
          <Route path="/card/edit" element={<CardEditPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
