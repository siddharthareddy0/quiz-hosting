import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import AdminProtectedRoute from './components/routing/AdminProtectedRoute.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';

import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminExamsPage from './pages/AdminExamsPage.jsx';
import AdminExamWizardPage from './pages/AdminExamWizardPage.jsx';
import AdminQuestionsPage from './pages/AdminQuestionsPage.jsx';
import AdminPlaceholderPage from './pages/AdminPlaceholderPage.jsx';
import AdminUsersAssignmentsPage from './pages/AdminUsersAssignmentsPage.jsx';
import AdminLiveMonitoringPage from './pages/AdminLiveMonitoringPage.jsx';
import AdminMalpracticePage from './pages/AdminMalpracticePage.jsx';
import AdminAttendancePage from './pages/AdminAttendancePage.jsx';
import AdminResultsPage from './pages/AdminResultsPage.jsx';
import AdminReportsPage from './pages/AdminReportsPage.jsx';

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
      className="min-h-screen"
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
        <Route
          path="/admin/login"
          element={
            <Page>
              <AdminLoginPage />
            </Page>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Page>
                <AdminDashboardPage />
              </Page>
            }
          />

          <Route
            path="exams"
            element={
              <Page>
                <AdminExamsPage />
              </Page>
            }
          />

          <Route
            path="exams/new"
            element={
              <Page>
                <AdminExamWizardPage />
              </Page>
            }
          />

          <Route
            path="exams/:examId/edit"
            element={
              <Page>
                <AdminExamWizardPage />
              </Page>
            }
          />

          <Route
            path="questions"
            element={
              <Page>
                <AdminQuestionsPage />
              </Page>
            }
          />

          <Route
            path="users"
            element={
              <Page>
                <AdminUsersAssignmentsPage />
              </Page>
            }
          />
          <Route
            path="live"
            element={
              <Page>
                <AdminLiveMonitoringPage />
              </Page>
            }
          />
          <Route
            path="malpractice"
            element={
              <Page>
                <AdminMalpracticePage />
              </Page>
            }
          />
          <Route
            path="attendance"
            element={
              <Page>
                <AdminAttendancePage />
              </Page>
            }
          />
          <Route
            path="results"
            element={
              <Page>
                <AdminResultsPage />
              </Page>
            }
          />
          <Route
            path="reports"
            element={
              <Page>
                <AdminReportsPage />
              </Page>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
