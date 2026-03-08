import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import AttendanceTracker from './components/AttendanceTracker';
import AdminGate from './components/AdminGate';

const AttendanceAdmin = React.lazy(() => import('./components/AttendanceAdmin'));
const AttendanceList = React.lazy(() => import('./components/AttendanceList'));
const AttendanceRank = React.lazy(() => import('./components/AttendanceRank'));

export default function AttendanceApp() {
  return (
    <HashRouter>
      <Switch>
        <Route path="/rank">
          <React.Suspense fallback={null}>
            <AttendanceRank />
          </React.Suspense>
        </Route>
        <Route path="/list">
          <React.Suspense fallback={null}>
            <AttendanceList />
          </React.Suspense>
        </Route>
        <Route path="/admin">
          <AdminGate>
            <React.Suspense fallback={null}>
              <AttendanceAdmin />
            </React.Suspense>
          </AdminGate>
        </Route>
        <Route path="/">
          <AttendanceTracker />
        </Route>
      </Switch>
    </HashRouter>
  );
}