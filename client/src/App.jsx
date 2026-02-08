import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import PublicLayout from './components/layout/PublicLayout.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';

import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InstructionsPage from './pages/InstructionsPage.jsx';
import SecurityGatePage from './pages/SecurityGatePage.jsx';
import ExamPage from './pages/ExamPage.jsx';
import SubmitPage from './pages/SubmitPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import AnalysisPage from './pages/AnalysisPage.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(6px)' },
};

function Page({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-[calc(100vh-80px)]"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={
              <Page>
                <LandingPage />
              </Page>
            }
          />
          <Route
            path="/auth"
            element={
              <Page>
                <AuthPage />
              </Page>
            }
          />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/app"
            element={
              <Page>
                <DashboardPage />
              </Page>
            }
          />
          <Route
            path="/app/tests/:testId/instructions"
            element={
              <Page>
                <InstructionsPage />
              </Page>
            }
          />
          <Route
            path="/app/tests/:testId/security"
            element={
              <Page>
                <SecurityGatePage />
              </Page>
            }
          />
          <Route
            path="/app/tests/:testId/exam"
            element={
              <Page>
                <ExamPage />
              </Page>
            }
          />
          <Route
            path="/app/tests/:testId/submitted"
            element={
              <Page>
                <SubmitPage />
              </Page>
            }
          />
          <Route
            path="/app/tests/:testId/review"
            element={
              <Page>
                <ReviewPage />
              </Page>
            }
          />
          <Route
            path="/app/analysis"
            element={
              <Page>
                <AnalysisPage />
              </Page>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
