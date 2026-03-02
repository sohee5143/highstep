import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import AttendanceTracker from './components/AttendanceTracker';
import AttendanceAdmin from './components/AttendanceAdmin';
import AttendanceList from './components/AttendanceList';

export default function AttendanceApp() {
  return (
    <HashRouter>
      <Switch>
        <Route path="/list">
          <AttendanceList />
        </Route>
        <Route path="/admin">
          <AttendanceAdmin />
        </Route>
        <Route path="/">
          <AttendanceTracker />
        </Route>
      </Switch>
    </HashRouter>
  );
}