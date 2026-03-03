import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import AttendanceTracker from './components/AttendanceTracker';
import AttendanceAdmin from './components/AttendanceAdmin';
import AttendanceList from './components/AttendanceList';
import AdminGate from './components/AdminGate';

export default function AttendanceApp() {
  return (
    <HashRouter>
      <Switch>
        <Route path="/list">
          <AttendanceList />
        </Route>
        <Route path="/admin">
          <AdminGate>
            <AttendanceAdmin />
          </AdminGate>
        </Route>
        <Route path="/">
          <AttendanceTracker />
        </Route>
      </Switch>
    </HashRouter>
  );
}